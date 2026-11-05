/**
 * The rewind and fast-forward buttons beside Play: how far they jump is set per device in
 * Settings (0 hides them), and a jump stays inside the song.
 */

export const SEEK_STEPS = [0, 5, 10, 15, 30] as const;
export type SeekStep = (typeof SEEK_STEPS)[number];
export const DEFAULT_SEEK_STEP: SeekStep = 10;

/** A saved value, or the default when it isn't one of the steps. */
export const sanitizeSeekStep = (value: unknown): SeekStep =>
  SEEK_STEPS.includes(value as SeekStep) ? (value as SeekStep) : DEFAULT_SEEK_STEP;

/** "Off", or the jump in seconds ("10 s"). */
export const seekStepLabel = (step: SeekStep): string => (step === 0 ? 'Off' : `${step} s`);

/**
 * Where a jump of `deltaMs` from `positionMs` lands: not before the start, and a second short of
 * the end when the length is known, so fast-forward never skips the song by itself.
 */
export const seekTarget = (positionMs: number, deltaMs: number, durationMs: number): number => {
  const to = Math.max(0, positionMs + deltaMs);
  return durationMs > 0 ? Math.min(to, Math.max(0, durationMs - 1000)) : to;
};
