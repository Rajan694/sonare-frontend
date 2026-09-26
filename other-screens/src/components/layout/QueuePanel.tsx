import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModeStore } from '../../store/modeStore'
import { usePlayerStore } from '../../store/playerStore'
import { showToast } from '../../store/toastStore'
import { api } from '../../data/api'
import { requireAccount } from '../../data/accountGate'
import { notifyPlaylistsChanged } from '../../data/hooks'
import { localLibrary, useLocalLibrary } from '../../data/local'
import { IconButton } from '../ui/Button'
import Icon from '../ui/Icon'
import { SourceGlyph } from '../ui/SourceGlyph'
import Artwork, { trackArtwork } from '../music/Artwork'
import { formatDuration, cn } from '../../lib/utils'

interface QueuePanelProps {
  onClose: () => void
  isMobileSheet?: boolean
}

export default function QueuePanel({ onClose, isMobileSheet = false }: QueuePanelProps) {
  const navigate = useNavigate()
  const { mode } = useModeStore()
  const {
    state,
    setState,
    currentTrack,
    durationMs,
    isPlaying,
    isLoading,
    togglePlay,
    toggleShuffle,
    cycleRepeat,
    removeFromQueue,
    moveInQueue,
    clearUpcoming,
  } = usePlayerStore()
  const isOffline = mode === 'offline'
  useLocalLibrary()

  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const rows = state.queue
    .map((track, index) => ({ track, index }))
    .filter(r => !isOffline || !!localLibrary.localIdFor(r.track.id))
  const upcoming = rows.filter(r => r.index > state.index)
  const serverCount = rows.filter(r => r.track.source === 'server').length

  const effectiveDurationMs = durationMs || currentTrack?.durationMs || 1
  const remainingMs = Math.max(0, effectiveDurationMs - state.positionMs)
  const positionRatio = state.positionMs / effectiveDurationMs
  const progressPercent = Math.min(100, Math.max(0, positionRatio * 100))

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
      onClose()
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

  return (
    <div className={cn(
      isMobileSheet
        ? 'flex flex-col h-full w-full bg-bg text-t1 overflow-hidden'
        : 'qpanel w-[340px] h-full bg-s0 border-l border-ln flex flex-col z-30'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between flex-none h-[60px] px-4 sm:px-5 border-b border-ln">
        <span className="text-title-l text-t1">Queue</span>
        <div className="flex items-center gap-1">
          <IconButton
            icon="shuffle"
            label={state.shuffle ? 'Shuffle on' : 'Shuffle queue'}
            size={32}
            active={state.shuffle}
            onClick={toggleShuffle}
          />
          <IconButton
            icon={state.repeat === 'one' ? 'repeat-one' : 'repeat'}
            label={state.repeat === 'one' ? 'Repeat one' : state.repeat === 'all' ? 'Repeat all' : 'Repeat off'}
            size={32}
            active={state.repeat !== 'off'}
            onClick={cycleRepeat}
          />
          <IconButton icon="close" label="Close queue" size={32} onClick={onClose} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col grow p-4 gap-3.5 overflow-y-auto">
        {/* Badge & count summary */}
        <div className="flex items-center gap-2 flex-none">
          <span className={cn(
            'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-label-s font-semibold flex-none',
            isOffline ? 'bg-goldbg text-gold' : 'bg-accbg text-acc'
          )}>
            <Icon name={isOffline ? 'smartphone' : 'cloud'} size={12} />
            {isOffline ? 'OFFLINE QUEUE' : 'ONLINE QUEUE'}
          </span>
          <span className="text-body-s text-t3 truncate">
            {rows.length} {rows.length === 1 ? 'song' : 'songs'}{!isOffline ? ` · ${serverCount} from server` : ''}
          </span>
        </div>

        {/* Now Playing Card */}
        {currentTrack && (
          <div className="flex flex-col gap-2 flex-none">
            <span className="text-overline text-t3">Now playing</span>
            <div className="srow srow-on p-2 gap-3 rounded-lg">
              <Artwork
                src={trackArtwork(currentTrack, 64)}
                alt={currentTrack.title}
                variant="a1"
                size={44}
                radius="sm"
                rings
              />
              <div className="flex flex-col grow gap-1 min-w-0">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className={cn('text-label-l truncate', isOffline ? 'text-gold' : 'text-acc')}>
                    {currentTrack.title}
                  </span>
                  <SourceGlyph source={currentTrack.source} />
                </span>
                <div className="flex items-center gap-2">
                  <div className="track grow h-1">
                    <i
                      className={isOffline ? 'bg-gold' : 'bg-acc'}
                      style={{ width: `${progressPercent}%` }}
                    />
                    <b style={{ left: `${progressPercent}%` }} />
                  </div>
                  <span className="text-mono-s text-t3 flex-none">
                    -{formatDuration(remainingMs)}
                  </span>
                </div>
              </div>
              {isMobileSheet && (
                <IconButton
                  icon={isPlaying ? 'pause' : 'play'}
                  label={isPlaying ? 'Pause' : 'Play'}
                  size={32}
                  disabled={isLoading}
                  onClick={togglePlay}
                />
              )}
            </div>
          </div>
        )}

        {/* Next in Queue Header */}
        <div className="flex items-center justify-between pt-2 flex-none">
          <span className="text-overline text-t3">Next in queue</span>
          {upcoming.length > 0 && (
            <button
              onClick={clearUpcoming}
              className={cn(
                'text-label-l font-medium bg-transparent border-0 cursor-pointer p-0',
                isOffline ? 'text-gold hover:underline' : 'text-acc hover:underline'
              )}
            >
              Clear
            </button>
          )}
        </div>

        {/* Upcoming track list */}
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-body-s text-t4">
            No upcoming songs in queue
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {upcoming.map(({ track, index }) => (
              <div
                key={`${track.id}-${index}`}
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
                  'srow p-1.5 sm:px-2 gap-2 rounded-md hover:bg-s2 transition-colors cursor-pointer group',
                  dragFrom === index && 'opacity-40',
                  dropAt === index && dragFrom !== index && 'border-t-2 border-acc'
                )}
                onClick={() => setState({ index, positionMs: 0 })}
              >
                <span className="flex-none text-t4 cursor-grab hover:text-t2 p-1" aria-hidden>
                  <Icon name="menu" size={14} />
                </span>
                <Artwork
                  src={trackArtwork(track, 64)}
                  alt={track.title}
                  variant="a2"
                  size={36}
                  radius="sm"
                />
                <div className="flex flex-col grow gap-0.5 min-w-0">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-label-l text-t1 truncate">{track.title}</span>
                    <SourceGlyph source={track.source} />
                  </span>
                  <span className="text-label-s text-t3 truncate">{track.artist}</span>
                </div>
                <span className="text-mono-s text-t3 flex-none">
                  {formatDuration(track.durationMs)}
                </span>
                <IconButton
                  icon="close"
                  label="Remove from queue"
                  size={28}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromQueue(index)
                  }}
                  className="opacity-70 group-hover:opacity-100 flex-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="flex items-center gap-2 p-3 sm:p-4 border-t border-ln bg-s0/90 flex-none mt-auto">
        <button
          onClick={saveAsPlaylist}
          disabled={saving || rows.length === 0}
          className="btn btn-sm btn-out grow w-full"
        >
          <Icon name="playlist" size={14} />
          Save as playlist
        </button>
      </div>
    </div>
  )
}
