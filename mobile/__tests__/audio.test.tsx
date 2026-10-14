import React from 'react';
import { NativeModules } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { AudioEngine } from '../src/components/music/AudioEngine';
import { api } from '../src/data/api';
import { EQ_PRESET_GAINS, useSettingsStore } from '../src/data/settings';
import { useAudioStore } from '../src/store/audio';
import { usePlayerStore } from '../src/store/player';
import { useSleepTimerStore } from '../src/store/sleepTimer';
import { makeTrack } from '../test-utils';

const native = NativeModules.SonarePlayer as Record<string, jest.Mock>;
const { mockEventEmitter } = require('../jest.setup');

const a = makeTrack({ title: 'A', album: 'One' });
const b = makeTrack({ title: 'B', album: 'One' });
const c = makeTrack({ title: 'C', album: 'Two' });

/** The engine wires itself up once per JS runtime, so every test shares one. */
beforeAll(() => {
  jest.spyOn(api, 'stream').mockImplementation(async (id: string) => ({ url: `/api/v1/stream/${id}` }) as never);
  render(<AudioEngine />);
});

beforeEach(() => {
  // Nothing playing, so each test's first track is a fresh load.
  act(() => usePlayerStore.setState({ currentTrack: null, queue: [], repeat: 'off', shuffle: false }));
  useSettingsStore.setState({ eqPreset: 'Sonare', gapless: true, normalization: false });
  useAudioStore.setState({ enabled: true, bassBoost: 0, virtualizer: 0, speed: 1, crossfade: false });
  native.load.mockClear();
  native.setNext.mockClear();
  native.setAudioEffects.mockClear();
  native.setSpeed.mockClear();
  native.setTransitions.mockClear();
});

const playFrom = async (track: typeof a, queue: (typeof a)[]) => {
  act(() => usePlayerStore.getState().playTrack(track, queue));
  await waitFor(() => expect(native.load).toHaveBeenLastCalledWith(expect.objectContaining({ id: track.id })));
};

describe('AudioEngine and the native player', () => {
  it('MOB-AUD-001 sends the Audio screen settings to the native player whenever they change', () => {
    act(() => useSettingsStore.setState({ eqPreset: 'Bass' }));
    expect(native.setAudioEffects).toHaveBeenLastCalledWith({
      enabled: true,
      gains: EQ_PRESET_GAINS.Bass,
      bassBoost: 0,
      virtualizer: 0,
      normalization: false,
    });
    act(() => useAudioStore.getState().update({ bassBoost: 40, virtualizer: 20, speed: 1.25, crossfade: true }));
    expect(native.setAudioEffects).toHaveBeenLastCalledWith(
      expect.objectContaining({ bassBoost: 40, virtualizer: 20 }),
    );
    expect(native.setSpeed).toHaveBeenLastCalledWith(1.25);
    expect(native.setTransitions).toHaveBeenLastCalledWith({ crossfadeMs: 6000, gapless: true });
    act(() => useAudioStore.getState().setBand(0, 9));
    expect(native.setAudioEffects).toHaveBeenLastCalledWith(
      expect.objectContaining({ gains: [9, ...EQ_PRESET_GAINS.Bass.slice(1)] }),
    );
    act(() => useAudioStore.getState().update({ enabled: false }));
    expect(native.setAudioEffects).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('MOB-AUD-002 with gapless on, the next track is handed to the player once the current one loads', async () => {
    await playFrom(a, [a, b, c]);
    await waitFor(() =>
      expect(native.setNext).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: b.id, url: expect.stringContaining(`/api/v1/stream/${b.id}`), album: 'One' }),
      ),
    );
  });

  it('MOB-AUD-003 when the player moves on by itself, the queue follows without loading the track again', async () => {
    await playFrom(a, [a, b, c]);
    await waitFor(() => expect(native.setNext).toHaveBeenLastCalledWith(expect.objectContaining({ id: b.id })));
    native.load.mockClear();

    act(() => mockEventEmitter.emit('SonarePlayer.advance', { mediaId: b.id }));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(b.id);
    // Then the one after it is prepared.
    await waitFor(() => expect(native.setNext).toHaveBeenLastCalledWith(expect.objectContaining({ id: c.id })));
    expect(native.load).not.toHaveBeenCalled();

    // Progress now belongs to the new track.
    act(() => mockEventEmitter.emit('SonarePlayer.progress', { positionMs: 1234, durationMs: 200_000, bufferedMs: 0 }));
    expect(usePlayerStore.getState().positionMs).toBe(1234);
  });

  it('MOB-AUD-004 with gapless and crossfade off, no next track is handed over', async () => {
    act(() => useSettingsStore.setState({ gapless: false }));
    await playFrom(a, [a, b, c]);
    await new Promise((r) => setTimeout(r, 20));
    expect(native.setNext).not.toHaveBeenCalledWith(expect.objectContaining({ id: b.id }));
    expect(native.setNext).toHaveBeenLastCalledWith(null);
  });

  it('MOB-AUD-005 at the end of the queue the player is told there is nothing next', async () => {
    await playFrom(c, [a, b, c]);
    await waitFor(() => expect(native.setNext).toHaveBeenLastCalledWith(null));
  });

  it('MOB-AUD-006 a move to a track the queue no longer has reloads the current one', async () => {
    await playFrom(a, [a, b]);
    native.load.mockClear();
    act(() => mockEventEmitter.emit('SonarePlayer.advance', { mediaId: 'yt:gone' }));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(a.id);
    await waitFor(() => expect(native.load).toHaveBeenCalledWith(expect.objectContaining({ id: a.id })));
  });

  it('MOB-AUD-007 with the sleep timer on "End of track", a track that ends stops there instead of playing the next', async () => {
    await playFrom(a, [a, b, c]);
    act(() => useSleepTimerStore.getState().set('endOfTrack'));
    act(() => mockEventEmitter.emit('SonarePlayer.state', { mediaId: a.id, ended: true, playWhenReady: false }));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(a.id);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(useSleepTimerStore.getState().timer.kind).toBe('off');
    expect(native.setPauseAtEndOfTrack).toHaveBeenLastCalledWith(false);

    // With the timer off again, the next track that ends moves on as usual.
    act(() => mockEventEmitter.emit('SonarePlayer.state', { mediaId: a.id, ended: false, playWhenReady: true }));
    act(() => mockEventEmitter.emit('SonarePlayer.state', { mediaId: a.id, ended: true, playWhenReady: false }));
    expect(usePlayerStore.getState().currentTrack?.id).toBe(b.id);
  });

  it('MOB-AUD-008 a stream url the player gave up on is reloaded fresh where it stopped, twice at most', async () => {
    const inApp = require('../src/youtube/inApp');
    const refresh = jest.spyOn(inApp, 'refreshInAppSession').mockResolvedValue(undefined);
    await playFrom(a, [a, b]);
    native.load.mockClear();

    const refused = { message: 'ERROR_CODE_IO_BAD_HTTP_STATUS: 403', code: 'ERROR_CODE_IO_BAD_HTTP_STATUS' };
    for (const positionMs of [42_000, 43_000]) {
      act(() => mockEventEmitter.emit('SonarePlayer.error', { ...refused, mediaId: a.id, positionMs }));
      await waitFor(() =>
        expect(native.load).toHaveBeenCalledWith(expect.objectContaining({ id: a.id, startMs: positionMs })),
      );
      expect(usePlayerStore.getState().error).toBeFalsy();
    }
    expect(refresh).toHaveBeenCalledTimes(2);

    // Refused a third time: that is shown instead of looping.
    act(() => mockEventEmitter.emit('SonarePlayer.error', { ...refused, mediaId: a.id, positionMs: 44_000 }));
    expect(usePlayerStore.getState().error).toContain('403');
    expect(refresh).toHaveBeenCalledTimes(2);
    refresh.mockRestore();
  });

  it('MOB-AUD-009 each progress level covers the stretch since the last event; a seek is skipped', async () => {
    const waves = require('../src/store/waveforms');
    const note = jest.spyOn(waves, 'noteLevel').mockImplementation(() => {});
    await playFrom(a, [a, b]);
    const progress = (positionMs: number, level: number) =>
      act(() =>
        mockEventEmitter.emit('SonarePlayer.progress', { positionMs, durationMs: 200_000, bufferedMs: 0, level }),
      );

    progress(1000, 0.2);
    progress(1500, 0.4);
    progress(2000, 0.3);
    // A jump forward (seek): that level holds audio from before it.
    progress(60_000, 0.9);
    progress(60_500, 0.5);
    expect(note.mock.calls).toEqual([
      [a.id, 200_000, 1000, 1500, 0.4],
      [a.id, 200_000, 1500, 2000, 0.3],
      [a.id, 200_000, 60_000, 60_500, 0.5],
    ]);
    note.mockRestore();
  });

  it('MOB-AUDIO-RESUME-001 a restored queue loads paused, at the saved position; the next load starts at 0', async () => {
    act(() =>
      usePlayerStore.getState().restore({
        queue: [a, b],
        currentTrack: b,
        positionMs: 61_000,
        shuffle: false,
        repeat: 'off',
        playingFrom: null,
      }),
    );
    await waitFor(() => expect(native.load).toHaveBeenLastCalledWith(expect.objectContaining({ id: b.id })));
    expect(native.load).toHaveBeenLastCalledWith(expect.objectContaining({ startMs: 61_000, autoplay: false }));
    expect(usePlayerStore.getState().startAtMs).toBeNull();

    await playFrom(c, [c]);
    expect(native.load.mock.calls.at(-1)![0]).not.toHaveProperty('startMs');
  });
});

describe('streaming ahead', () => {
  const info = (id: string, extra: object = {}) => ({
    url: `/api/v1/stream/${id}`,
    expiresAt: Date.now() + 3600_000,
    itag: 251,
    contentLength: 4_000_000,
    ...extra,
  });

  it("MOB-AUD-010 the next song's stream is looked up while this one plays, so skipping starts it without asking again", async () => {
    const stream = jest.spyOn(api, 'stream').mockImplementation(async (id: string) => info(id) as never);
    await playFrom(a, [a, b, c]);
    const asked = () => stream.mock.calls.map((call) => call[0]);
    await waitFor(() => expect(asked()).toContain(b.id));
    stream.mockClear();
    act(() => usePlayerStore.getState().playNext());
    await waitFor(() => expect(native.load).toHaveBeenLastCalledWith(expect.objectContaining({ id: b.id })));
    expect(asked()).not.toContain(b.id);
    // …and the one after it is looked up in turn.
    await waitFor(() => expect(asked()).toContain(c.id));
    stream.mockRestore();
    jest.spyOn(api, 'stream').mockImplementation(async (id: string) => ({ url: `/api/v1/stream/${id}` }) as never);
  });

  it('MOB-AUD-011 a url refused mid-song is swapped for a fresh one of the same file, without reloading the song', async () => {
    const inApp = require('../src/youtube/inApp');
    const refresh = jest.spyOn(inApp, 'refreshInAppSession').mockResolvedValue(undefined);
    let n = 0;
    const stream = jest
      .spyOn(api, 'stream')
      .mockImplementation(async (id: string) => info(id, { url: `/api/v1/stream/${id}?n=${n++}` }) as never);
    await playFrom(a, [a]);
    const loadedUrl = native.load.mock.calls.at(-1)![0].url as string;
    native.load.mockClear();
    native.replaceUrl.mockClear();

    act(() => mockEventEmitter.emit('SonarePlayer.streamRefused', { mediaId: a.id, url: loadedUrl }));
    await waitFor(() => expect(native.replaceUrl).toHaveBeenCalledTimes(1));
    const [from, to] = native.replaceUrl.mock.calls[0];
    expect(from).toBe(loadedUrl);
    expect(to).not.toBe(loadedUrl);
    expect(to).toContain(`/api/v1/stream/${a.id}`);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(native.load).not.toHaveBeenCalled();

    // The retries of the same refusal are answered once.
    act(() => mockEventEmitter.emit('SonarePlayer.streamRefused', { mediaId: a.id, url: loadedUrl }));
    await new Promise((r) => setTimeout(r, 20));
    expect(native.replaceUrl).toHaveBeenCalledTimes(1);

    // A different file can't carry on from the same byte: left to the reload.
    stream.mockImplementation(async (id: string) => info(id, { url: `/x/${id}`, itag: 140 }) as never);
    act(() => mockEventEmitter.emit('SonarePlayer.streamRefused', { mediaId: a.id, url: 'http://other/url' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(native.replaceUrl).toHaveBeenCalledTimes(1);

    refresh.mockRestore();
    stream.mockRestore();
    jest.spyOn(api, 'stream').mockImplementation(async (id: string) => ({ url: `/api/v1/stream/${id}` }) as never);
  });
});
