import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../src/data/api';
import { useAuthStore } from '../src/data/auth';
import {
  noteLevel,
  resetWaveformsForTesting,
  saveWaveforms,
  useWaveform,
  useWaveformStore,
  watchWaveform,
} from '../src/store/waveforms';
import { CANONICAL_BARS, placeholderPeaks } from '../../shared/catalog/peaks';
import { makeTrack } from '../test-utils';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const song = makeTrack({ id: 'yt:wave1', durationMs: 150_000 });

/** The backend's answer: a placeholder (nobody uploaded one yet) or a real waveform. */
const backendPeaks = (placeholder: boolean) =>
  jest.spyOn(api, 'peaks').mockResolvedValue({
    peaks: placeholder ? placeholderPeaks(song.id, CANONICAL_BARS) : new Array(CANONICAL_BARS).fill(0.5),
    placeholder,
  });

/** Play every second of the 150 s song (one bar each). */
const hearWholeSong = (level = 0.4) => {
  for (let s = 0; s < 150; s++) noteLevel(song.id, 150_000, s * 1000, s * 1000 + 500, s === 75 ? 0.8 : level);
};

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  resetWaveformsForTesting();
  useAuthStore.setState({ status: 'guest' } as never);
});

afterEach(() => jest.restoreAllMocks());

describe('waveforms heard on the phone', () => {
  it('MOB-WAVE-001 only songs whose backend waveform is a placeholder are filled in', async () => {
    backendPeaks(false);
    watchWaveform(song);
    await flush();
    noteLevel(song.id, 150_000, 0, 500, 0.5);
    expect(useWaveformStore.getState().heard[song.id]).toBeUndefined();

    resetWaveformsForTesting();
    backendPeaks(true);
    watchWaveform(song);
    await flush();
    noteLevel(song.id, 150_000, 10_000, 10_500, 0.5);
    expect(useWaveformStore.getState().heard[song.id].heard[10]).toBe(0.5);
    // Device files never ask.
    const peaks = jest.spyOn(api, 'peaks');
    peaks.mockClear();
    watchWaveform(makeTrack({ id: 'local:abc', source: 'local' }));
    expect(peaks).not.toHaveBeenCalled();
  });

  it('MOB-WAVE-002 the screen shows the placeholder dimmed, with heard bars real, at its own bar count', async () => {
    backendPeaks(true);
    const { result } = renderHook(() => useWaveform(song, 76));
    await waitFor(() => expect(result.current?.peaks).toHaveLength(76));
    expect(result.current?.real?.every((r) => !r)).toBe(true);

    act(() => noteLevel(song.id, 150_000, 0, 900, 0.6));
    await waitFor(() => expect(result.current?.real?.[0]).toBe(true));
    expect(result.current?.real?.filter(Boolean)).toHaveLength(1);
  });

  it('MOB-WAVE-003 a whole song heard is uploaded once, signed in, and drawn without dimming', async () => {
    useAuthStore.setState({ status: 'signedIn' } as never);
    backendPeaks(true);
    const put = jest.spyOn(api, 'putPeaks').mockResolvedValue({ stored: true });
    const { result } = renderHook(() => useWaveform(song, 76));
    await waitFor(() => expect(result.current?.real).toBeDefined());

    act(() => hearWholeSong());
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const [id, peaks] = put.mock.calls[0];
    expect(id).toBe(song.id);
    expect(peaks).toHaveLength(CANONICAL_BARS);
    expect(peaks[75]).toBe(1);
    expect(peaks[0]).toBe(0.5);
    await waitFor(() => expect(result.current?.real).toBeUndefined());

    act(() => noteLevel(song.id, 150_000, 80_000, 80_500, 0.9));
    expect(put).toHaveBeenCalledTimes(1);
    // Completing it wrote it to the phone straight away.
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('sonare.heardPeaks', expect.stringContaining(song.id));
  });

  it('MOB-WAVE-004 a guest keeps the waveform on the phone; it is uploaded on a later play, signed in', async () => {
    backendPeaks(true);
    const put = jest.spyOn(api, 'putPeaks').mockResolvedValue({ stored: true });
    watchWaveform(song);
    await flush();
    hearWholeSong();
    saveWaveforms();
    expect(put).not.toHaveBeenCalled();
    const saved = (AsyncStorage.setItem as jest.Mock).mock.calls.filter((c) => c[0] === 'sonare.heardPeaks').pop()![1];

    // Next start: the saved waveform is loaded, and with an account it goes up.
    resetWaveformsForTesting();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(saved);
    useAuthStore.setState({ status: 'signedIn' } as never);
    watchWaveform(song);
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  });
});
