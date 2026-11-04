/** How long a queue runs, for the queue screens' "12 songs · 1 h 5 min". */

type Timed = { durationMs?: number | null };

/** How long the entries after `index` run; songs of unknown length count as nothing. */
export const upcomingMs = (queue: readonly Timed[], index: number): number =>
  queue.slice(index + 1).reduce((sum, t) => sum + (t.durationMs && t.durationMs > 0 ? t.durationMs : 0), 0);

/** "12 min", "1 h 5 min", "2 h": a length to take in at a glance. */
export const roughDuration = (ms: number): string => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};
