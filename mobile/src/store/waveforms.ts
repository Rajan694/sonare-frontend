import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from '../data/api';
import { useAuthStore } from '../data/auth';
import { useAsync } from '../data/hooks';
import type { Track } from '../data/types';
import {
  CANONICAL_BARS,
  emptyHeardPeaks,
  finishedPeaks,
  heardCount,
  mergeHeardPeaks,
  recordPeak,
  resamplePeaks,
  type HeardPeaks,
} from '../../../shared/catalog/peaks';

/**
 * Waveforms of YouTube songs. The backend has a real one once any listener uploaded it;
 * until then it sends a placeholder, and the phone replaces its bars with the real level as
 * the song plays (the native player measures the loudness of the audio it decodes and sends
 * it with every progress event, so there is no extra download). Seeks leave gaps that later plays
 * fill; the partial waveform is kept on the phone. Once every bar is heard it is uploaded,
 * for everyone.
 *
 * Progress events keep coming with the app in the background, where JS timers are paused,
 * so nothing here waits on a timer.
 */

// Levels are loudness (RMS) since 2026-10-14; partial waveforms saved before held sample peaks.
const STORAGE_KEY = 'sonare.heardLevels';
const OLD_STORAGE_KEY = 'sonare.heardPeaks';
/** Songs whose partial waveform is kept (about 1.5 KB each). */
const MAX_KEPT = 100;
const SAVE_EVERY_MS = 5_000;
const RETRY_UPLOAD_MS = 5 * 60_000;

interface Heard {
  durationMs: number;
  heard: HeardPeaks;
  at: number;
}

interface WaveformStore {
  heard: Record<string, Heard>;
  /** Songs whose backend waveform is a placeholder: only these are filled in and uploaded. */
  placeholder: Record<string, true>;
}

export const useWaveformStore = create<WaveformStore>(() => ({ heard: {}, placeholder: {} }));

let loaded: Promise<void> | null = null;
let lastSave = 0;
const uploads = new Map<string, 'uploading' | 'done' | number>();

const load = () => {
  if (!loaded) AsyncStorage.removeItem(OLD_STORAGE_KEY).catch(() => {});
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const saved = raw ? (JSON.parse(raw) as Record<string, Heard>) : {};
      // Anything heard before loading finished wins over the saved copy.
      useWaveformStore.setState((s) => ({ heard: { ...saved, ...s.heard } }));
    })
    .catch(() => {});
  return loaded;
};

const save = (force = false) => {
  const now = Date.now();
  if (!force && now - lastSave < SAVE_EVERY_MS) return;
  lastSave = now;
  const kept = Object.entries(useWaveformStore.getState().heard)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX_KEPT);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(kept))).catch(() => {});
};

const isYouTube = (id: string | undefined): id is string =>
  !!id && !id.startsWith('local:') && !id.startsWith('sonare:');

/** Upload a complete waveform once (PUT needs an account). */
const maybeUpload = (id: string) => {
  const { heard, placeholder } = useWaveformStore.getState();
  const peaks = heard[id] ? finishedPeaks(heard[id].heard) : null;
  const state = uploads.get(id);
  if (!peaks || !placeholder[id] || useAuthStore.getState().status !== 'signedIn') return;
  if (state === 'uploading' || state === 'done' || (typeof state === 'number' && Date.now() < state)) return;
  uploads.set(id, 'uploading');
  api
    .putPeaks(id, peaks)
    .then(() => uploads.set(id, 'done'))
    .catch(() => uploads.set(id, Date.now() + RETRY_UPLOAD_MS));
};

/** The backend's waveform for a song, asked once per song (by the player and the screens). */
const serverPeaks = new Map<string, Promise<{ peaks: number[]; placeholder?: boolean }>>();

const fetchServerPeaks = (id: string) => {
  let pending = serverPeaks.get(id);
  if (!pending) {
    pending = api.peaks(id, CANONICAL_BARS).then((res) => {
      if (res.placeholder) {
        useWaveformStore.setState((s) => (s.placeholder[id] ? s : { placeholder: { ...s.placeholder, [id]: true } }));
        // Heard in full on an earlier play (maybe signed out then): upload it now.
        load().then(() => maybeUpload(id));
      }
      return res;
    });
    // A failed request may be retried by the next play.
    pending.catch(() => serverPeaks.delete(id));
    serverPeaks.set(id, pending);
  }
  return pending;
};

/** A song starts playing: find out whether its waveform still needs filling in. */
export const watchWaveform = (track: Track): void => {
  if (track.source === 'server' && isYouTube(track.id)) fetchServerPeaks(track.id).catch(() => {});
};

/**
 * The player heard `level` (0..1) between `fromMs` and `toMs` of `trackId`, a song `durationMs`
 * long. Called from the progress events (components/music/AudioEngine.tsx).
 */
export const noteLevel = (trackId: string, durationMs: number, fromMs: number, toMs: number, level: number): void => {
  const state = useWaveformStore.getState();
  if (!state.placeholder[trackId] || !(durationMs > 0)) return;
  load();
  const known = state.heard[trackId];
  // A new waveform when the song turns out to be a different length than it was heard at.
  const entry =
    known && Math.abs(known.durationMs - durationMs) < 2000
      ? { ...known, heard: [...known.heard] }
      : { durationMs, heard: emptyHeardPeaks(), at: 0 };
  const before = heardCount(entry.heard);
  if (!recordPeak(entry.heard, entry.durationMs, fromMs, toMs, level)) return;
  entry.at = Date.now();
  useWaveformStore.setState({ heard: { ...state.heard, [trackId]: entry } });
  save(heardCount(entry.heard) === CANONICAL_BARS && before < CANONICAL_BARS);
  maybeUpload(trackId);
};

/** Write what was heard now (the app is going to the background). */
export const saveWaveforms = (): void => save(true);

/**
 * The waveform to draw for `track` at `bars` bars: the backend's real one, or its placeholder
 * with the bars heard on this phone filled in. `real` marks heard bars (the rest are drawn
 * dimmed); it is absent when every bar is real. Null while loading and for device files.
 */
export const useWaveform = (
  track: Track | null | undefined,
  bars: number,
): { peaks: number[]; real?: boolean[] } | null => {
  const id = track?.source === 'server' && isYouTube(track.id) ? track.id : undefined;
  const server = useAsync(() => fetchServerPeaks(id!), [id], { enabled: !!id });
  const heard = useWaveformStore((s) => (id ? s.heard[id] : undefined));
  const placeholder = !!server.data?.placeholder;

  if (!id || !server.data) return null;
  if (!placeholder) return { peaks: resamplePeaks(server.data.peaks, bars) };
  const merged = heard ? mergeHeardPeaks(heard.heard, server.data.peaks) : null;
  const peaks = resamplePeaks(merged?.peaks ?? server.data.peaks, bars);
  if (merged?.real.every(Boolean)) return { peaks };
  const real = merged?.real ?? server.data.peaks.map(() => false);
  return { peaks, real: Array.from({ length: bars }, (_, i) => real[Math.floor((i / bars) * real.length)]) };
};

export const resetWaveformsForTesting = (): void => {
  useWaveformStore.setState({ heard: {}, placeholder: {} });
  loaded = null;
  lastSave = 0;
  uploads.clear();
  serverPeaks.clear();
};
