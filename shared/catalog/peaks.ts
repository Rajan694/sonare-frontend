export const CANONICAL_BARS = 150;

/**
 * Deterministic, waveform-like placeholder peaks for a track.
 * Uses FNV-1a 32-bit hash over the UTF-8 bytes of `trackId`,
 * followed by a xorshift32 PRNG to generate envelope noise.
 * All values are in the range [0.3, 1].
 */
export const placeholderPeaks = (trackId: string, bars: number): number[] => {
  const bytes = new TextEncoder().encode(trackId);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }

  let state = (hash === 0 ? 0x811c9dc5 : hash) >>> 0;
  const nextRand = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state >>> 0;
    return state / 4294967296;
  };

  const result: number[] = [];
  for (let i = 0; i < bars; i++) {
    const progress = i / bars;
    const envelope = Math.sin(progress * Math.PI) * Math.sin(progress * Math.PI * 3);
    const baseShape = Math.abs(envelope) * 0.7 + 0.3;
    const noise = nextRand() * 0.5 - 0.25;

    let val = baseShape + noise;
    if (val < 0.3) val = 0.3;
    if (val > 1) val = 1;

    result.push(val);
  }
  return result;
};

/**
 * Resample a peaks array to `bars` length.
 * When shrinking (bars < peaks.length): max-pooling over the window.
 * When growing (bars > peaks.length): linear interpolation.
 */
export const resamplePeaks = (peaks: number[], bars: number): number[] => {
  if (bars <= 0 || peaks.length === 0) return [];
  if (bars === peaks.length) return peaks.slice();

  if (bars < peaks.length) {
    const result: number[] = [];
    for (let i = 0; i < bars; i++) {
      const start = Math.floor((i * peaks.length) / bars);
      const end = Math.floor(((i + 1) * peaks.length) / bars);
      let max = -Infinity;
      for (let j = start; j < end; j++) {
        if (peaks[j] > max) max = peaks[j];
      }
      result.push(max === -Infinity ? 0 : max);
    }
    return result;
  }

  if (peaks.length === 1) {
    return new Array(bars).fill(peaks[0]);
  }

  const result: number[] = [];
  for (let i = 0; i < bars; i++) {
    const pos = (i * (peaks.length - 1)) / (bars - 1);
    const low = Math.floor(pos);
    const high = Math.min(low + 1, peaks.length - 1);
    const weight = pos - low;
    result.push(peaks[low] * (1 - weight) + peaks[high] * weight);
  }
  return result;
};

// ---- Waveforms heard on the device ----
// While a song plays, the app samples the level of the audio it is already decoding and fills
// in the canonical bars the playhead passes. Seeks leave gaps that later plays fill. Once every
// bar is heard the waveform is uploaded (PUT /tracks/:id/peaks) and replaces the placeholder
// for everyone.

/** Each canonical bar's loudest level heard so far (0..1), or null until the playhead has passed it. */
export type HeardPeaks = (number | null)[];

export const emptyHeardPeaks = (): HeardPeaks => new Array<number | null>(CANONICAL_BARS).fill(null);

/**
 * Record `level` (0..1) for the stretch `[fromMs, toMs]` of a song `durationMs` long, in
 * every bar that stretch touches. Returns whether any bar changed.
 */
export const recordPeak = (heard: HeardPeaks, durationMs: number, fromMs: number, toMs: number, level: number): boolean => {
  if (!(durationMs > 0) || !(toMs >= 0) || !Number.isFinite(level)) return false;
  const bars = heard.length;
  const first = Math.max(0, Math.floor((Math.max(0, fromMs) / durationMs) * bars));
  const last = Math.min(bars - 1, Math.floor((Math.min(toMs, durationMs - 1) / durationMs) * bars));
  const value = Math.min(1, Math.max(0, level));
  let changed = false;
  for (let i = first; i <= last; i++) {
    const prev = heard[i];
    if (prev === null || value > prev) {
      heard[i] = value;
      changed = true;
    }
  }
  return changed;
};

export const heardCount = (heard: HeardPeaks): number => heard.reduce((n, v) => n + (v === null ? 0 : 1), 0);

/** The waveform to upload: every bar heard, scaled so the loudest is 1. Null until complete (or silent). */
export const finishedPeaks = (heard: HeardPeaks): number[] | null => {
  if (heard.some((v) => v === null)) return null;
  const max = Math.max(...(heard as number[]));
  if (!(max > 0)) return null;
  return (heard as number[]).map((v) => Math.round((v / max) * 1000) / 1000);
};

/**
 * What to draw: heard bars scaled to the loudest heard so far, the rest from `fallback` (the
 * placeholder). `real` says which bars were heard, so the rest can be drawn dimmed.
 */
export const mergeHeardPeaks = (heard: HeardPeaks, fallback: number[]): { peaks: number[]; real: boolean[] } => {
  const max = Math.max(0, ...heard.map((v) => v ?? 0));
  const base = fallback.length === heard.length ? fallback : resamplePeaks(fallback, heard.length);
  return {
    peaks: heard.map((v, i) => (v === null || max <= 0 ? base[i] : Math.max(0.05, v / max))),
    real: heard.map((v) => v !== null && max > 0),
  };
};
