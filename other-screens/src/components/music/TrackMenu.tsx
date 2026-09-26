import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, MenuItem } from '../ui/Menu'
import { usePlayerStore } from '../../store/playerStore'
import { showToast } from '../../store/toastStore'
import { useMyPlaylists, notifyPlaylistsChanged } from '../../data/hooks'
import { api } from '../../data/api'
import { requireAccount } from '../../data/accountGate'
import { isAuthenticated } from '../../data/auth'
import type { Track } from '../../data/types'
import { CAPS } from '../../lib/caps'
import { localLibrary, useLocalLibrary } from '../../data/local'
import { useModeStore } from '../../store/modeStore'

/**
 * One context menu for every track list (FLOWS §3 D05): right-click a row, or press its
 * "more" button. A module-level store keeps rows free of menu state. The same menu serves
 * the user's own playlists, adding "Delete playlist".
 */

interface MenuTarget {
  tracks: Track[]
  /** One of the user's playlists: the menu ends with "Delete playlist". */
  playlist?: { id: string; name: string }
  x: number
  y: number
}

let target: MenuTarget | null = null
const listeners = new Set<() => void>()

function set(next: MenuTarget | null) {
  target = next
  for (const l of listeners) l()
}

/** Open at the pointer (right-click) or under the clicked button. */
export function openTrackMenu(tracks: Track | Track[], e: React.MouseEvent, playlist?: MenuTarget['playlist']): void {
  e.preventDefault()
  e.stopPropagation()
  const list = Array.isArray(tracks) ? tracks : [tracks]
  if (list.length === 0 && !playlist) return
  if (e.type === 'contextmenu') {
    set({ tracks: list, playlist, x: e.clientX, y: e.clientY })
  } else {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    set({ tracks: list, playlist, x: r.right, y: r.bottom + 4 })
  }
}

/** A playlist whose tracks aren't loaded (sidebar, playlist cards): only playlist actions. */
export function openPlaylistMenu(playlist: { id: string; name: string }, e: React.MouseEvent): void {
  openTrackMenu([], e, playlist)
}

export function closeTrackMenu(): void {
  set(null)
}

export default function TrackMenu() {
  const current = useSyncExternalStore(
    fn => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => target
  )
  const location = useLocation()

  useEffect(() => {
    closeTrackMenu()
  }, [location.pathname])

  if (!current) return null
  return <OpenMenu key={`${current.x},${current.y}`} target={current} />
}

function OpenMenu({ target }: { target: MenuTarget }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { playNext, enqueue } = usePlayerStore()
  const { data: playlists } = useMyPlaylists()
  const { downloads } = useLocalLibrary()
  const { mode } = useModeStore()
  const [picking, setPicking] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: target.x, top: target.y })

  const { tracks, playlist } = target
  const single = tracks.length === 1 ? tracks[0] : null

  // Keep the menu on screen; anchor it to the left of the pointer near the right edge.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      left: Math.max(8, Math.min(target.x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(target.y, window.innerHeight - height - 8)),
    })
  }, [target.x, target.y, picking])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) closeTrackMenu()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeTrackMenu()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', closeTrackMenu)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', closeTrackMenu)
    }
  }, [])

  function run(fn: () => void) {
    return () => {
      fn()
      closeTrackMenu()
    }
  }

  async function addToPlaylist(id: string, name: string) {
    closeTrackMenu()
    try {
      await api.addTracksToPlaylist(id, tracks.map(t => t.id))
      notifyPlaylistsChanged()
      showToast({ title: `Added to ${name}`, description: single?.title ?? `${tracks.length} songs`, icon: 'playlist', variant: 'acc' })
    } catch {
      showToast({ title: 'Could not add to playlist', icon: 'info' })
    }
  }

  async function addToNewPlaylist() {
    const name = window.prompt('New playlist name', single ? single.title : 'New playlist')?.trim()
    if (!name) return
    closeTrackMenu()
    try {
      const created = await api.createPlaylist({ name, kind: 'synced' })
      await addToPlaylist(created.id, created.name)
    } catch {
      showToast({ title: 'Could not create playlist', icon: 'info' })
    }
  }

  async function deletePlaylist(p: { id: string; name: string }) {
    closeTrackMenu()
    if (!window.confirm(`Delete the playlist "${p.name}"? This can't be undone.`)) return
    try {
      await api.deleteMyPlaylist(p.id)
      notifyPlaylistsChanged()
      showToast({ title: 'Playlist deleted', description: p.name, icon: 'trash' })
      // Deleted from its own page: that page is gone now.
      if (decodeURIComponent(location.pathname) === `/playlist/${p.id}`) navigate('/playlist', { replace: true })
    } catch {
      showToast({ title: 'Could not delete playlist', description: p.name, icon: 'info' })
    }
  }

  async function download(track: Track) {
    try {
      await localLibrary.download(track)
      showToast({ title: 'Downloaded for offline', description: track.title, icon: 'download', variant: 'gold' })
    } catch (e) {
      showToast({ title: 'Download failed', description: e instanceof Error ? e.message : track.title, icon: 'info' })
    }
  }

  const ownPlaylists = playlists?.items ?? []

  return (
    <div ref={ref} className="fixed z-50" style={pos} role="menu">
      <Menu className="min-w-[220px] max-h-[360px] overflow-auto">
        {picking ? (
          <>
            <MenuItem icon="chevron-left" onClick={() => setPicking(false)}>Back</MenuItem>
            <MenuItem icon="plus" onClick={addToNewPlaylist}>New playlist…</MenuItem>
            {ownPlaylists.map(p => (
              <MenuItem key={p.id} icon="playlist" onClick={() => void addToPlaylist(p.id, p.name)}>
                {p.name}
              </MenuItem>
            ))}
          </>
        ) : (
          <>
            {tracks.length > 0 && (
              <>
                {single && <MenuItem icon="play" onClick={run(() => playNext(single))}>Play next</MenuItem>}
                <MenuItem icon="list" onClick={run(() => enqueue(tracks))}>Add to queue</MenuItem>
                <MenuItem
                  icon="playlist"
                  onClick={() => {
                    // Playlists live in the account: a guest is sent to sign in, then comes back here.
                    if (isAuthenticated()) return setPicking(true)
                    closeTrackMenu()
                    requireAccount('Create a free account to make playlists.', () => {})
                  }}
                >
                  Add to playlist…
                </MenuItem>
                {CAPS.downloads && single && single.source !== 'local' && (
                  downloads.has(single.id) ? (
                    <MenuItem icon="trash" onClick={run(() => void localLibrary.removeDownload(single.id).then(() => showToast({ title: 'Download removed', description: single.title, icon: 'trash' })))}>
                      Remove download
                    </MenuItem>
                  ) : mode === 'online' && (
                    <MenuItem icon="download" onClick={run(() => void download(single))}>Download</MenuItem>
                  )
                )}
                {CAPS.localLibrary && single && localLibrary.localIdFor(single.id) && (
                  <MenuItem icon="folder" onClick={run(() => void localLibrary.showInFolder(single.id))}>Show in folder</MenuItem>
                )}
                {single?.albumId && (
                  <MenuItem icon="disc" onClick={run(() => navigate(`/album/${single.albumId}`))}>Go to album</MenuItem>
                )}
                {single?.artistId && (
                  <MenuItem icon="mic" onClick={run(() => navigate(`/artist/${single.artistId}`))}>Go to artist</MenuItem>
                )}
              </>
            )}
            {playlist && (
              <>
                {tracks.length > 0 && <hr className="hr mx-2 my-[5px]" />}
                <MenuItem icon="trash" danger onClick={() => void deletePlaylist(playlist)}>Delete playlist</MenuItem>
              </>
            )}
          </>
        )}
      </Menu>
    </div>
  )
}
