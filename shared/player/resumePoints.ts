/**
 * Where long tracks were left off (an hour-long katha, a live qawwali), so playing one again
 * carries on from there instead of starting over. Both apps keep these on the device
 * (mobile store/resumePoints.ts, desktop storage/resumePoints.ts).
 */

/** Only tracks at least this long are resumed; an ordinary song simply starts again. */
export const LONG_TRACK_MS = 20 * 60_000;
/** Closer than this to the start or the end counts as not started / finished: nothing to resume. */
export const RESUME_EDGE_MS = 60_000;
/** The most tracks remembered; the ones left longest ago go first. */
export const MAX_RESUME_POINTS = 100;

export interface ResumePoint {
  positionMs: number;
  durationMs: number;
  /** When it was noted (epoch ms). */
  savedAt: number;
}

export type ResumePoints = Record<string, ResumePoint>;

export const isLongTrack = (durationMs: number | null | undefined): boolean => (durationMs ?? 0) >= LONG_TRACK_MS;

/**
 * The points after `trackId` was heard up to `positionMs`: kept while it is part-way through,
 * dropped once it is near either end (finished, or started over). Short tracks are left alone.
 */
export const noteResumePoint = (
  points: ResumePoints,
  trackId: string,
  positionMs: number,
  durationMs: number,
  now = Date.now(),
): ResumePoints => {
  if (!isLongTrack(durationMs)) return points;
  const partWay = positionMs >= RESUME_EDGE_MS && durationMs - positionMs >= RESUME_EDGE_MS;
  if (!partWay) {
    if (!points[trackId]) return points;
    const { [trackId]: _gone, ...rest } = points;
    return rest;
  }
  const next: ResumePoints = { ...points, [trackId]: { positionMs: Math.round(positionMs), durationMs, savedAt: now } };
  const ids = Object.keys(next);
  if (ids.length <= MAX_RESUME_POINTS) return next;
  ids.sort((a, b) => next[a].savedAt - next[b].savedAt);
  for (const id of ids.slice(0, ids.length - MAX_RESUME_POINTS)) delete next[id];
  return next;
};

/** Where `trackId` was left off, or 0 to start from the beginning. */
export const resumePointFor = (points: ResumePoints, trackId: string): number => {
  const point = points[trackId];
  return point && isLongTrack(point.durationMs) ? point.positionMs : 0;
};

/** Saved points read back from storage; anything damaged is dropped. */
export const readResumePoints = (raw: unknown): ResumePoints => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: ResumePoints = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const p = value as Partial<ResumePoint> | null;
    if (
      p &&
      typeof p.positionMs === 'number' &&
      typeof p.durationMs === 'number' &&
      typeof p.savedAt === 'number' &&
      p.positionMs > 0 &&
      p.positionMs < p.durationMs
    ) {
      out[id] = { positionMs: p.positionMs, durationMs: p.durationMs, savedAt: p.savedAt };
    }
  }
  return out;
};
