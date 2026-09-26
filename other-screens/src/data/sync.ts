import { useSyncExternalStore } from 'react'
import { api, ApiError } from './api'
import { getCurrentUser, onAuthChange } from './auth'
import { notifyPlaylistsChanged } from './hooks'
import { pendingPlaysFor, removePendingPlays } from './plays'

/**
 * Background sync. There is no "Sync now": plays queue on the device (plays.ts) and go up
 * on their own whenever the app is in Online Mode, signed in and has a network - at launch,
 * when the browser reports the connection is back, on switching to Online and after sign-in.
 *
 * A failed upload keeps its plays and retries with backoff (the server may be down while
 * the network is fine, which fires no `online` event). Only what the server confirmed is
 * removed from the queue; the backend skips plays it already has, so a retry after a lost
 * response can't double-count.
 */

const RETRY_FIRST_MS = 5_000
const RETRY_MAX_MS = 5 * 60_000

export interface SyncStatus {
  /** Plays on this device still waiting to upload for the signed-in account. */
  pending: number
  syncing: boolean
}

/** App is in Online Mode (App.tsx). Offline Mode never touches the network. */
let onlineMode = false
let inFlight: Promise<void> | null = null
let rerun = false
/** Refresh server-backed lists once the next sync lands (after being offline). */
let refreshAfter = false
let retryTimer: number | undefined
let retryDelay = RETRY_FIRST_MS
let status: SyncStatus = { pending: 0, syncing: false }
const listeners = new Set<() => void>()

function setStatus(patch: Partial<SyncStatus>) {
  const user = getCurrentUser()
  const next = { ...status, pending: user ? pendingPlaysFor(user.id).length : 0, ...patch }
  if (next.pending === status.pending && next.syncing === status.syncing) return
  status = next
  listeners.forEach(fn => fn())
}

function networkDown(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function scheduleRetry() {
  window.clearTimeout(retryTimer)
  // No network: the `online` event wakes us instead of a timer.
  if (networkDown()) return
  retryTimer = window.setTimeout(() => requestSync(), retryDelay)
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS)
}

/** A 4xx other than auth/rate-limit means the server will never take these plays. */
function rejected(e: unknown): boolean {
  return e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status)
}

async function flush(): Promise<void> {
  const user = getCurrentUser()
  if (!onlineMode || !user || networkDown()) return setStatus({})
  const plays = pendingPlaysFor(user.id)
  if (!plays.length && !refreshAfter) return setStatus({})

  setStatus({ syncing: true })
  try {
    if (plays.length) await api.sync({ since: 0, plays, favourites: [], playlists: [] })
    removePendingPlays(plays)
    window.clearTimeout(retryTimer)
    retryDelay = RETRY_FIRST_MS
    if (refreshAfter) {
      refreshAfter = false
      notifyPlaylistsChanged()
    }
  } catch (e) {
    if (rejected(e)) removePendingPlays(plays)
    else scheduleRetry()
  } finally {
    setStatus({ syncing: false })
  }
}

/** Upload whatever is waiting, if we can. Safe to call often: runs are serialised. */
export function requestSync(): void {
  if (inFlight) {
    // Plays recorded mid-upload go in one follow-up run.
    rerun = true
    return
  }
  inFlight = flush().finally(() => {
    inFlight = null
    if (rerun) {
      rerun = false
      requestSync()
    }
  })
}

/** App.tsx reports the effective mode; switching to Online pushes what Offline held. */
export function setSyncOnline(online: boolean): void {
  if (online === onlineMode) return
  onlineMode = online
  if (!online) return window.clearTimeout(retryTimer)
  refreshAfter = true
  retryDelay = RETRY_FIRST_MS
  requestSync()
}

let started = false
/** Wire the triggers once, at launch. */
export function startBackgroundSync(): void {
  if (started) return
  started = true
  window.addEventListener('online', () => {
    refreshAfter = true
    retryDelay = RETRY_FIRST_MS
    requestSync()
  })
  window.addEventListener('offline', () => window.clearTimeout(retryTimer))
  onAuthChange(user => {
    if (user) requestSync()
    else setStatus({})
  })
  requestSync()
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => status
  )
}
