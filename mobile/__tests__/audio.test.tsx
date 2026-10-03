import React from 'react';
import { NativeModules } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { AudioEngine } from '../src/components/music/AudioEngine';
import { api } from '../src/data/api';
import { EQ_PRESET_GAINS, useSettingsStore } from '../src/data/settings';
import { useAudioStore } from '../src/store/audio';
import { usePlayerStore } from '../src/store/player';
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

async function playFrom(track: typeof a, queue: (typeof a)[]) {
  act(() => usePlayerStore.getState().playTrack(track, queue));
  await waitFor(() => expect(native.load).toHaveBeenLastCalledWith(expect.objectContaining({ id: track.id })));
}

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
});
