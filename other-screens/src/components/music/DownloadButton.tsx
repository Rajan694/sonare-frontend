import React, { useState } from 'react'
import Button from '../ui/Button'
import { CAPS } from '../../lib/caps'
import { useLocalLibrary, localLibrary } from '../../data/local'
import { showToast } from '../../store/toastStore'
import type { Track } from '../../data/types'

/**
 * Download-for-offline for a set of tracks (FLOWS M06 / D06): album, playlist.
 * Desktop only; renders nothing on web or while offline (nothing to download from).
 */
export default function DownloadButton({ tracks, offline }: { tracks: Track[]; offline: boolean }) {
  const { downloads, downloading } = useLocalLibrary()
  const [running, setRunning] = useState(false)

  if (!CAPS.downloads) return null
  const server = tracks.filter(t => t.source !== 'local')
  if (server.length === 0) return null

  const done = server.filter(t => downloads.has(t.id)).length
  const all = done === server.length
  const inFlight = server.filter(t => t.id in downloading).length

  async function downloadAll() {
    setRunning(true)
    let failed = 0
    // One at a time: the backend proxies each stream, and order matches the list.
    for (const t of server) {
      try {
        await localLibrary.download(t)
      } catch {
        failed++
      }
    }
    setRunning(false)
    showToast(
      failed
        ? { title: 'Some downloads failed', description: `${failed} of ${server.length} could not be saved`, icon: 'info' }
        : { title: 'Downloaded for offline', description: `${server.length} songs saved to this device`, icon: 'download', variant: 'gold' }
    )
  }

  async function removeAll() {
    if (!window.confirm(`Remove ${server.length} downloaded songs from this device?`)) return
    for (const t of server) await localLibrary.removeDownload(t.id)
    showToast({ title: 'Downloads removed', icon: 'trash' })
  }

  if (running || inFlight > 0) {
    return <Button variant="out" icon="loader" disabled className="[&_svg]:animate-spin">Downloading {done}/{server.length}</Button>
  }
  if (all) {
    return <Button variant="gold" icon="check" onClick={removeAll} data-tip="Remove downloads">Downloaded</Button>
  }
  if (offline) return null
  return (
    <Button variant="out" icon="download" onClick={downloadAll}>
      {done > 0 ? `Download ${server.length - done} more` : 'Download'}
    </Button>
  )
}
