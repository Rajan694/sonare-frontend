import { api } from './api'
import { notifyPlaylistsChanged } from './hooks'
import { showToast } from '../store/toastStore'
import { takePendingPlays, restorePendingPlays } from './plays'

let inFlight: Promise<void> | null = null

/**
 * Manual "Sync now" (topbar + Home). Plays are already pushed as they happen (plays.ts),
 * so this pushes any plays held while offline, confirms the server is reachable and
 * refreshes lists.
 */
export function syncNow(): Promise<void> {
  if (inFlight) return inFlight
  // Plays heard while offline go up with the manual sync.
  const plays = takePendingPlays()
  inFlight = api
    .sync({ since: 0, plays, favourites: [], playlists: [] })
    .then(() => {
      notifyPlaylistsChanged()
      showToast({ title: 'Library synced', icon: 'sync', variant: 'acc' })
    })
    .catch(() => {
      restorePendingPlays(plays)
      showToast({ title: 'Sync failed', description: 'Could not reach the Sonare server', icon: 'wifi-off' })
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}
