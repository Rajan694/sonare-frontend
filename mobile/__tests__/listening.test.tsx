import React from 'react';
import { AppState, NativeModules } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AudioEngine } from '../src/components/music/AudioEngine';
import { SnackbarHost } from '../src/components/ui/SnackbarHost';
import { QueueScreen } from '../src/screens/Queue';
import { api } from '../src/data/api';
import { useSettingsStore } from '../src/data/settings';
import { useAudioStore } from '../src/store/audio';
import { usePlayerStore } from '../src/store/player';
import { showSnackbar, useSnackbarStore } from '../src/store/snackbar';
import { noteResume, resetResumePoints, resumeAt } from '../src/store/resumePoints';
import { playShuffled } from '../src/lib/playShuffled';
import {
  LONG_TRACK_MS,
  MAX_RESUME_POINTS,
  noteResumePoint,
  readResumePoints,
  resumePointFor,
} from '../../shared/player/resumePoints';
import { dropsQueue } from '../../shared/player/queue';
import { roughDuration, upcomingMs } from '../../shared/player/queueTime';
import { makeTrack } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const native = NativeModules.SonarePlayer as Record<string, jest.Mock>;
const { mockEventEmitter } = require('../jest.setup');

const HOUR = 60 * 60_000;
const katha = makeTrack({ title: 'Katha', durationMs: HOUR });
const song = makeTrack({ title: 'Song', durationMs: 200_000 });
const albumA = [makeTrack({ title: 'A1' }), makeTrack({ title: 'A2' }), makeTrack({ title: 'A3' })];
const albumB = [makeTrack({ title: 'B1' }), makeTrack({ title: 'B2' })];

/** The engine wires itself up once per JS runtime, so every test shares one. */
beforeAll(() => {
  jest.spyOn(api, 'stream').mockImplementation(async (id: string) => ({ url: `/api/v1/stream/${id}` }) as never);
  render(<AudioEngine />);
});

beforeEach(() => {
  AppState.currentState = 'active';
  resetResumePoints();
  act(() => {
    usePlayerStore.setState({
      currentTrack: null,
      queue: [],
      index: 0,
      isPlaying: false,
      repeat: 'off',
      shuffle: false,
      positionMs: 0,
      playingFrom: null,
    });
    useSnackbarStore.setState({ current: null, visible: false });
  });
  useSettingsStore.setState({ gapless: true });
  useAudioStore.setState({ crossfade: false });
  native.load.mockClear();
  native.seekTo.mockClear();
  native.setNext.mockClear();
  native.mediaVolume.mockReset().mockResolvedValue(8);
  native.raiseVolume.mockClear();
});

const progress = (positionMs: number, durationMs: number) =>
  act(() => mockEventEmitter.emit('SonarePlayer.progress', { positionMs, durationMs, bufferedMs: 0 }));

const loaded = (id: string) =>
  waitFor(() => expect(native.load).toHaveBeenLastCalledWith(expect.objectContaining({ id })));

describe('shared listening helpers', () => {
  it('MOB-LISTEN-001 remembers where long tracks were left, forgets them near either end, keeps 100', () => {
    let points = noteResumePoint({}, 'song', 100_000, 200_000);
    expect(points).toEqual({}); // an ordinary song simply starts again
    points = noteResumePoint(points, 'katha', 30 * 60_000, HOUR, 5);
    expect(resumePointFor(points, 'katha')).toBe(30 * 60_000);
    // Only just started, or nearly finished: nothing to resume.
    expect(resumePointFor(noteResumePoint(points, 'katha', 20_000, HOUR), 'katha')).toBe(0);
    expect(resumePointFor(noteResumePoint(points, 'katha', HOUR - 30_000, HOUR), 'katha')).toBe(0);
    // The ones left longest ago make room.
    for (let i = 0; i < MAX_RESUME_POINTS; i++)
      points = noteResumePoint(points, `k${i}`, 120_000, LONG_TRACK_MS, 10 + i);
    expect(Object.keys(points)).toHaveLength(MAX_RESUME_POINTS);
    expect(points.katha).toBeUndefined();
    // Damaged saves are dropped.
    expect(
      readResumePoints({ ok: { positionMs: 5, durationMs: HOUR, savedAt: 1 }, bad: { positionMs: 'x' }, n: null }),
    ).toEqual({ ok: { positionMs: 5, durationMs: HOUR, savedAt: 1 } });
    expect(readResumePoints([1, 2])).toEqual({});
  });

  it('MOB-LISTEN-002 a new list drops the queue only when songs were lined up and it lacks the playing one', () => {
    const state = { queue: albumA, index: 0, shuffle: false, repeat: 'off' as const };
    expect(dropsQueue(state, albumB)).toBe(true);
    expect(dropsQueue(state, albumA)).toBe(false); // another song from the same list
    expect(dropsQueue({ ...state, index: 2 }, albumB)).toBe(false); // nothing left after the playing song
    expect(upcomingMs([katha, song, { durationMs: null }], 0)).toBe(200_000);
    expect(roughDuration(20_000)).toBe('under a minute');
    expect(roughDuration(12 * 60_000)).toBe('12 min');
    expect(roughDuration(65 * 60_000)).toBe('1 h 5 min');
    expect(roughDuration(2 * HOUR)).toBe('2 h');
  });
});

describe('snackbar actions', () => {
  it('MOB-LISTEN-003 a snackbar with a button stays 5 s and the button runs once, closing it', () => {
    jest.useFakeTimers();
    try {
      const onPress = jest.fn();
      const { getByLabelText } = render(<SnackbarHost />);
      act(() => showSnackbar({ title: 'Queue replaced', action: { label: 'Undo', onPress } }));
      act(() => jest.advanceTimersByTime(4000));
      expect(useSnackbarStore.getState().visible).toBe(true);
      fireEvent.press(getByLabelText('Undo'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(useSnackbarStore.getState().visible).toBe(false);
      // Without a button it goes after the usual 2.5 s.
      act(() => showSnackbar({ title: 'Added to queue' }));
      act(() => jest.advanceTimersByTime(2600));
      expect(useSnackbarStore.getState().visible).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('Undo after a new list replaces the queue', () => {
  it('MOB-LISTEN-004 offers Undo, which brings back the old queue at its song and position', async () => {
    act(() => usePlayerStore.getState().playTrack(albumA[0], albumA, { kind: 'Album', name: 'Album A' }));
    await loaded(albumA[0].id);
    progress(42_000, 200_000);
    expect(useSnackbarStore.getState().visible).toBe(false);

    act(() => usePlayerStore.getState().playTrack(albumB[0], albumB, { kind: 'Album', name: 'Album B' }));
    await loaded(albumB[0].id);
    const shown = useSnackbarStore.getState().current!;
    expect(shown).toMatchObject({ title: 'Playing Album B', subtitle: 'Your queue was replaced' });
    expect(shown.action?.label).toBe('Undo');

    act(() => shown.action!.onPress());
    await loaded(albumA[0].id);
    expect(native.load).toHaveBeenLastCalledWith(expect.objectContaining({ id: albumA[0].id, startMs: 42_000 }));
    const state = usePlayerStore.getState();
    expect(state.queue.map((t) => t.id)).toEqual(albumA.map((t) => t.id));
    expect(state.currentTrack?.id).toBe(albumA[0].id);
    expect(state.playingFrom).toEqual({ kind: 'Album', name: 'Album A' });
    expect(state.isPlaying).toBe(true);
  });

  it('MOB-LISTEN-005 no Undo for another song of the same list; Undo is gone once another song plays', async () => {
    act(() => usePlayerStore.getState().playTrack(albumA[0], albumA));
    act(() => usePlayerStore.getState().playTrack(albumA[1], albumA));
    expect(useSnackbarStore.getState().visible).toBe(false);

    act(() => usePlayerStore.getState().playTrack(albumB[0], albumB));
    const undo = useSnackbarStore.getState().current!.action!.onPress;
    act(() => usePlayerStore.getState().playNext());
    act(() => undo());
    expect(usePlayerStore.getState().currentTrack?.id).toBe(albumB[1].id);
  });

  it('MOB-LISTEN-006 a shuffled play leaves the old queue in its order, and Undo turns shuffle back off', () => {
    act(() => usePlayerStore.getState().playTrack(albumA[0], albumA));
    act(() => playShuffled(albumB));
    expect(usePlayerStore.getState().shuffle).toBe(true);
    act(() => useSnackbarStore.getState().current!.action!.onPress());
    const state = usePlayerStore.getState();
    expect(state.shuffle).toBe(false);
    expect(state.queue.map((t) => t.id)).toEqual(albumA.map((t) => t.id));
  });
});

describe('long tracks carry on where they were left', () => {
  it('MOB-LISTEN-007 a katha played again starts from where it was left and says so; Start over goes to 0:00', async () => {
    act(() => usePlayerStore.getState().playTrack(katha, [katha, song]));
    await loaded(katha.id);
    progress(34 * 60_000 + 12_000, HOUR);
    act(() => usePlayerStore.getState().playNext());
    await loaded(song.id);
    expect(resumeAt(katha.id)).toBe(34 * 60_000 + 12_000);

    act(() => usePlayerStore.getState().playTrack(katha, [katha, song]));
    await loaded(katha.id);
    expect(native.load).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: katha.id, startMs: 34 * 60_000 + 12_000 }),
    );
    const shown = useSnackbarStore.getState().current!;
    expect(shown).toMatchObject({ title: 'Resuming from 34:12', subtitle: 'Where you left off last time' });

    act(() => shown.action!.onPress());
    expect(native.seekTo).toHaveBeenLastCalledWith(0);
    expect(resumeAt(katha.id)).toBe(0);
  });

  it('MOB-LISTEN-008 ordinary songs start from 0, and a finished katha starts over', async () => {
    noteResume(song.id, 100_000, 200_000);
    act(() => usePlayerStore.getState().playTrack(song, [song]));
    await loaded(song.id);
    expect(native.load.mock.calls.at(-1)[0].startMs).toBeUndefined();

    act(() => usePlayerStore.getState().playTrack(katha, [katha]));
    await loaded(katha.id);
    progress(HOUR - 5_000, HOUR);
    expect(resumeAt(katha.id)).toBe(0);
  });

  it('MOB-LISTEN-009 a next track with a resume point is not handed over for gapless; it loads from its point', async () => {
    const next = makeTrack({ title: 'Live qawwali', durationMs: HOUR });
    noteResume(next.id, 10 * 60_000, HOUR);
    act(() => usePlayerStore.getState().playTrack(song, [song, next]));
    await loaded(song.id);
    progress(190_000, 200_000);
    await new Promise((r) => setTimeout(r, 0));
    expect(native.setNext).not.toHaveBeenCalledWith(expect.objectContaining({ id: next.id }));
  });
});

describe("the phone's media volume", () => {
  it('MOB-LISTEN-010 Play with the media volume at 0 says why nothing is heard; Turn up raises it; not again for 20 s', async () => {
    native.mediaVolume.mockResolvedValue(0);
    act(() => usePlayerStore.getState().playTrack(song, [song]));
    await waitFor(() => expect(useSnackbarStore.getState().current?.title).toBe('Phone volume is off'));
    act(() => useSnackbarStore.getState().current!.action!.onPress());
    expect(native.raiseVolume).toHaveBeenCalledTimes(1);

    act(() => useSnackbarStore.setState({ current: null, visible: false }));
    act(() => usePlayerStore.getState().setIsPlaying(false));
    act(() => usePlayerStore.getState().setIsPlaying(true));
    await new Promise((r) => setTimeout(r, 0));
    expect(useSnackbarStore.getState().current).toBeNull();
  });
});

describe('queue screen', () => {
  it('MOB-LISTEN-011 says how many songs come next and how long they run', () => {
    act(() =>
      usePlayerStore.setState({
        currentTrack: katha,
        queue: [katha, makeTrack({ durationMs: 30 * 60_000 }), makeTrack({ durationMs: 35 * 60_000 })],
        index: 0,
      }),
    );
    const { getByText } = render(<QueueScreen />);
    expect(getByText('2 songs · 1 h 5 min')).toBeTruthy();
  });
});
