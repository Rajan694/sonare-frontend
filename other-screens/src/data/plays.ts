import { getCurrentUser, isAuthenticated } from './auth'
import { requestSync } from './sync'

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
 * Every counted play lands in this on-device queue first, online or not; data/sync.ts
 * uploads it in the background and removes exactly what the server confirmed. Each play
 * carries the account it was heard on, so one made before a sign-out never lands on the
 * next account.
 */
export type PendingPlay = { trackRef: ReturnType<typeof trackRef>; at: number; ms: number; userId?: string }
const PENDING_KEY = 'sonare_pending_plays'

function readPending(): PendingPlay[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as PendingPlay[]
  } catch {
    return []
  }
}

function writePending(plays: PendingPlay[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(plays))
  } catch {
    // Storage unavailable: offline plays are lost rather than blocking playback.
  }
}

function playKey(p: PendingPlay): string {
  const ref = p.trackRef.kind === 'local' ? p.trackRef.fingerprint : p.trackRef.id
  return `${p.userId ?? ''}|${p.trackRef.kind}|${ref}|${p.at}`
}

/** Plays waiting to upload for this account (queues from before the userId tag count too). */
export function pendingPlaysFor(userId: string): PendingPlay[] {
  return readPending().filter(p => !p.userId || p.userId === userId)
}

/** Drop plays the server has stored. Anything queued while the upload ran stays. */
export function removePendingPlays(done: PendingPlay[]): void {
  if (!done.length) return
  const gone = new Set(done.map(playKey))
  writePending(readPending().filter(p => !gone.has(playKey(p))))
}

/**
 * Call on each position update. Records the play the first time the threshold is met
 * for this listen; repeated calls afterwards are no-ops.
 */
export function maybeRecordPlay(trackId: string, startedAt: number, positionMs: number, durationMs: number): void {
  if (!trackId || positionMs <= 0) return
  // History belongs to an account; guests just listen.
  if (!isAuthenticated()) return

  const threshold = durationMs > 0 ? Math.min(PLAY_THRESHOLD_MS, durationMs / 2) : PLAY_THRESHOLD_MS
  if (positionMs < threshold) return

  const k = key(trackId, startedAt)
  if (counted.has(k)) return
  counted.add(k)

  const play: PendingPlay = { trackRef: trackRef(trackId), at: startedAt, ms: Math.round(positionMs), userId: getCurrentUser()?.id }
  writePending([...readPending(), play])
  // Uploads straight away when online; in Offline Mode it waits for the switch back.
  requestSync()
}
