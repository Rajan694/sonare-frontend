import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { getAccessToken } from '../api/auth';
import { useAsync } from '../api/hooks';
import type { Track } from '../types';
import * as player from './player';
import { levelMeter } from './dsp';
import {
  CANONICAL_BARS,
  emptyHeardPeaks,
  finishedPeaks,
  heardCount,
  mergeHeardPeaks,
  recordPeak,
  type HeardPeaks,
} from '../../../shared/catalog/peaks';

// Waveforms of YouTube songs. The backend has a real one once any listener uploaded it;
// until then it sends a placeholder, and this app replaces its bars with the real level as
// the song plays here (read from the Web Audio graph, so no extra download). Seeks leave
// gaps that later plays fill; the partial waveform is kept on this device. Once every bar is
// heard it is uploaded, for everyone.

const STORAGE_KEY = 'sonare_heard_peaks';
/** Songs whose partial waveform is kept (about 1 KB each). */
const MAX_KEPT = 200;
const SAMPLE_MS = 100;
/** After a failed upload, wait this long before trying again. */
const RETRY_UPLOAD_MS = 5 * 60_000;

interface Heard {
  durationMs: number;
  heard: HeardPeaks;
  /** Last change; the oldest are dropped first. */
  at: number;
}

let heardById: Record<string, Heard> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** Songs whose backend waveform is a placeholder: only these are sampled and uploaded. */
const placeholderIds = new Set<string>();
const uploadState = new Map<string, 'uploading' | 'done' | number>();
const listeners = new Set<() => void>();

const all = (): Record<string, Heard> => {
  if (heardById) return heardById;
  try {
    heardById = (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Heard>) ?? {};
  } catch {
    heardById = {};
  }
  return heardById;
};

const save = () => {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const entries = Object.entries(all())
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, MAX_KEPT);
    heardById = Object.fromEntries(entries);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(heardById));
    } catch {
      // Storage full or unavailable: the waveform is still filled in for this session.
    }
  }, 3000);
};

const emit = () => {
  for (const l of listeners) l();
};

/** Only YouTube songs: device files have their own waveform, and the backend can't take theirs. */
const isYouTube = (id: string | null | undefined): id is string =>
  !!id && !id.startsWith('local:') && !id.startsWith('sonare:');

/** The song's partial waveform; a new one when the length it was heard at no longer matches. */
const heardFor = (id: string, durationMs: number): Heard => {
  const map = all();
  const known = map[id];
  if (known && Math.abs(known.durationMs - durationMs) < 2000) return known;
  return (map[id] = { durationMs, heard: emptyHeardPeaks(), at: Date.now() });
};

/** Upload a complete waveform once (signed in only: PUT needs an account). */
const maybeUpload = (id: string) => {
  const entry = all()[id];
  const peaks = entry ? finishedPeaks(entry.heard) : null;
  const state = uploadState.get(id);
  if (!peaks || !placeholderIds.has(id) || !getAccessToken()) return;
  if (state === 'uploading' || state === 'done' || (typeof state === 'number' && Date.now() < state)) return;
  uploadState.set(id, 'uploading');
  api
    .putTrackPeaks(id, peaks)
    .then(() => uploadState.set(id, 'done'))
    .catch(() => uploadState.set(id, Date.now() + RETRY_UPLOAD_MS));
};

let samples: Float32Array | null = null;
let lastEmit = 0;

const sample = () => {
  const s = player.getStatus();
  const meter = levelMeter();
  if (!s.playing || !meter || !isYouTube(s.trackId) || !placeholderIds.has(s.trackId) || s.durationMs <= 0) return;
  if (!samples || samples.length !== meter.fftSize) samples = new Float32Array(meter.fftSize);
  meter.getFloatTimeDomainData(samples);
  let level = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > level) level = v;
  }
  // The meter holds the last fftSize samples: that stretch of the song just played.
  const windowMs = (meter.fftSize / meter.context.sampleRate) * 1000;
  const entry = heardFor(s.trackId, s.durationMs);
  const before = heardCount(entry.heard);
  if (!recordPeak(entry.heard, entry.durationMs, s.positionMs - windowMs, s.positionMs, level)) return;
  entry.at = Date.now();
  save();
  // A newly heard bar shows at once; louder samples raising a bar redraw at most twice a second.
  if (heardCount(entry.heard) > before || entry.at - lastEmit >= 500) {
    lastEmit = entry.at;
    emit();
  }
  maybeUpload(s.trackId);
};

let started = false;

/** Sample the playing song's level while something plays. Call once at startup. */
export const startWaveformTap = (): void => {
  if (started) return;
  started = true;
  let timer: ReturnType<typeof setInterval> | null = null;
  player.onPlaybackChange((s) => {
    if (s.playing && !timer) timer = setInterval(sample, SAMPLE_MS);
    else if (!s.playing && timer) {
      clearInterval(timer);
      timer = null;
    }
  });
};

/**
 * The waveform to draw for `track`: a device file's own, the backend's real one, or the
 * backend's placeholder with the bars heard here filled in. `real` marks heard bars (the
 * rest are drawn dimmed); it is absent when every bar is real.
 */
export const useWaveform = (track: Track | null | undefined): { peaks?: number[]; real?: boolean[] } => {
  const id = isYouTube(track?.id) ? track.id : undefined;
  const server = useAsync(() => api.getTrackPeaks(id!, CANONICAL_BARS), [id], { enabled: !!id });
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const placeholder = !!server.data?.placeholder;
  useEffect(() => {
    if (!id || !placeholder) return;
    placeholderIds.add(id);
    // Heard in full on an earlier play (maybe signed out then): upload it now.
    maybeUpload(id);
  }, [id, placeholder]);

  if (track?.peaks) return { peaks: track.peaks };
  if (!id || !server.data) return {};
  if (!placeholder) return { peaks: server.data.peaks };
  const entry = all()[id];
  if (!entry) return { peaks: server.data.peaks, real: server.data.peaks.map(() => false) };
  const merged = mergeHeardPeaks(entry.heard, server.data.peaks);
  return merged.real.every(Boolean) ? { peaks: merged.peaks } : merged;
};

/** Testing: take one level sample now. */
export const _sampleWaveform = (): void => sample();

/** Testing: forget everything. */
export const _resetWaveforms = (): void => {
  heardById = null;
  placeholderIds.clear();
  uploadState.clear();
  lastEmit = 0;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
};
