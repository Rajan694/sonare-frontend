import { api } from './api'

/**
 * Split a namespaced id (contract 8.1) into the TrackRef shape from 8.3. The backend
 * stores the bare id without its `yt:` / `local:` prefix, so strip it here.
 */
function trackRef(trackId: string): { kind: 'server'; id: string } | { kind: 'local'; fingerprint: string } {
  if (trackId.startsWith('local:')) return { kind: 'local', fingerprint: trackId.slice('local:'.length) }
  if (trackId.startsWith('yt:')) return { kind: 'server', id: trackId.slice('yt:'.length) }
  return { kind: 'server', id: trackId }
}

/**
 * Play counting.
 *
 * A play is recorded once the listener has actually heard the track — 30 seconds, or
 * half of it for anything shorter. The backend's POST /me/sync comments note that it
 * trusts the client to apply this threshold, so requesting a stream url deliberately
 * does not count: skipping through a queue would otherwise inflate every count.
 */

const PLAY_THRESHOLD_MS = 30_000

/** Tracks already counted for the current playback session, keyed by track id + start time. */
const counted = new Set<string>()

function key(trackId: string, startedAt: number): string {
  return `${trackId}@${startedAt}`
}

export function resetPlay(trackId: string, startedAt: number): void {
  counted.delete(key(trackId, startedAt))
}

/**
 * Call on each position update. Records the play the first time the threshold is met
 * for this listen; repeated calls afterwards are no-ops.
 */
export function maybeRecordPlay(
  trackId: string,
  startedAt: number,
  positionMs: number,
  durationMs: number
): void {
  if (!trackId || positionMs <= 0) return

  const threshold = durationMs > 0 ? Math.min(PLAY_THRESHOLD_MS, durationMs / 2) : PLAY_THRESHOLD_MS
  if (positionMs < threshold) return

  const k = key(trackId, startedAt)
  if (counted.has(k)) return
  counted.add(k)

  const ref = trackRef(trackId)
  void api
    .sync({
      since: 0,
      plays: [{ trackRef: ref, at: startedAt, ms: Math.round(positionMs) }],
      favourites: [],
      playlists: [],
    })
    .catch(() => {
      // A dropped play should never interrupt playback; allow a retry on the next listen.
      counted.delete(k)
    })
}
