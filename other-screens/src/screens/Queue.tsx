import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { showToast } from '../store/toastStore'
import { api } from '../data/api'
import { requireAccount } from '../data/accountGate'
import { notifyPlaylistsChanged } from '../data/hooks'
import { localLibrary, useLocalLibrary } from '../data/local'
import SongRow from '../components/music/SongRow'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../lib/utils'

export default function Queue() {
  const navigate = useNavigate()
  const { mode } = useModeStore()
  const { state, setState, toggleShuffle, removeFromQueue, moveInQueue, clearUpcoming } = usePlayerStore()
  const isOffline = mode === 'offline'
  // Re-render when downloads change what is playable offline.
  useLocalLibrary()
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Keep each row's real queue index: offline hides streaming rows, but jumping,
  // removing and reordering all address the full queue.
  const rows = state.queue
    .map((track, index) => ({ track, index }))
    .filter(r => !isOffline || !!localLibrary.localIdFor(r.track.id))
  const played = rows.filter(r => r.index <= state.index)
  const upcoming = rows.filter(r => r.index > state.index)

  function saveAsPlaylist() {
    requireAccount('Create a free account to save your queue as a playlist.', saveQueue)
  }

  async function saveQueue() {
    const name = window.prompt('Save queue as playlist', 'My queue')?.trim()
    if (!name) return
    setSaving(true)
    try {
      const playlist = await api.createPlaylist({ name, kind: 'synced' })
      await api.addTracksToPlaylist(playlist.id, rows.map(r => r.track.id))
      notifyPlaylistsChanged()
      showToast({ title: 'Playlist saved', description: name, icon: 'playlist', variant: 'acc' })
      navigate(`/playlist/${playlist.id}`)
    } catch {
      showToast({ title: 'Could not save playlist', icon: 'info' })
    } finally {
      setSaving(false)
    }
  }

  function onDrop(to: number) {
    if (dragFrom !== null && dragFrom !== to) moveInQueue(dragFrom, to)
    setDragFrom(null)
    setDropAt(null)
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="list"
          title="Queue is empty"
          description="Add songs or play an album to start queueing tracks"
          action={<Link to="/home" className="btn btn-acc">Discover Music</Link>}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col grow overflow-auto p-8 gap-6">
        <div className="flex items-center justify-between">
          <span className="text-h1 text-t1">Queue</span>
          <div className="flex items-center gap-2">
            <IconButton icon="shuffle" label="Shuffle queue" size={32} active={state.shuffle} onClick={toggleShuffle} />
            <Button variant="out" icon="playlist" onClick={saveAsPlaylist} disabled={saving}>
              Save as playlist
            </Button>
            <Button variant="ghost" onClick={clearUpcoming} disabled={upcoming.length === 0}>Clear upcoming</Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-0.5">
            {played.map(({ track, index }) => (
              <SongRow
                key={track.id}
                track={track}
                index={index + 1}
                isActive={index === state.index}
                isPlaying={index === state.index}
                onClick={() => setState({ index, positionMs: 0 })}
                onRemove={index === state.index ? undefined : () => removeFromQueue(index)}
              />
            ))}
          </div>

          {upcoming.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-3 px-3">
                <hr className="hr grow" />
                <span className="text-overline text-t3">Up next · drag to reorder</span>
                <hr className="hr grow" />
              </div>
              <div className="flex flex-col gap-0.5">
                {upcoming.map(({ track, index }) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.effectAllowed = 'move'
                      setDragFrom(index)
                    }}
                    onDragOver={e => {
                      if (dragFrom === null) return
                      e.preventDefault()
                      setDropAt(index)
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      onDrop(index)
                    }}
                    onDragEnd={() => {
                      setDragFrom(null)
                      setDropAt(null)
                    }}
                    className={cn(
                      'flex items-center gap-1 rounded border-t-2 border-transparent',
                      dragFrom === index && 'opacity-40',
                      dropAt === index && dragFrom !== index && 'border-acc'
                    )}
                  >
                    <span className="flex-none text-t4 cursor-grab px-1" aria-hidden>
                      <Icon name="menu" size={14} />
                    </span>
                    <div className="grow min-w-0">
                      <SongRow
                        track={track}
                        index={index + 1}
                        onClick={() => setState({ index, positionMs: 0 })}
                        onRemove={() => removeFromQueue(index)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
