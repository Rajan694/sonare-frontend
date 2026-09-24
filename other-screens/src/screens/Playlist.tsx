import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { usePlaylist, usePlaylistTracks, useMyPlaylists, notifyPlaylistsChanged } from '../data/hooks'
import { api } from '../data/api'
import { showToast } from '../store/toastStore'
import { openPlaylistMenu, openTrackMenu } from '../components/music/TrackMenu'
import Icon from '../components/ui/Icon'
import { cn } from '../lib/utils'
import DownloadButton from '../components/music/DownloadButton'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { staggerContainer } from '../lib/motion'
import type { Track } from '../data/types'
import { Card } from '../components/ui/Card'

/** /playlist lists your playlists; /playlist/:id shows one (FLOWS nav "Playlists" → M08). */
export default function PlaylistRoute() {
  const { id } = useParams()
  // Keyed so switching playlists starts from fresh state rather than the previous one's edits.
  return id ? <Playlist key={id} id={id} /> : <PlaylistsIndex />
}

function PlaylistsIndex() {
  const navigate = useNavigate()
  const { data, loading, error } = useMyPlaylists()
  const playlists = data?.items ?? []

  async function create() {
    const name = window.prompt('New playlist name')?.trim()
    if (!name) return
    try {
      const created = await api.createPlaylist({ name, kind: 'synced' })
      notifyPlaylistsChanged()
      navigate(`/playlist/${created.id}`)
    } catch {
      showToast({ title: 'Could not create playlist', icon: 'info' })
    }
  }

  return (
    <div className="flex flex-col p-8 gap-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-h1 text-t1">Playlists</span>
          <span className="text-body-m text-t2">{playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}</span>
        </div>
        <Button variant="acc" icon="plus" onClick={create}>New playlist</Button>
      </div>
      {loading && playlists.length === 0 ? (
        <div className="flex gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-[160px] h-[210px] bg-s2/40 rounded-md" />)}
        </div>
      ) : error ? (
        <EmptyState icon="playlist" title="Could not load playlists" description={error.message} />
      ) : playlists.length === 0 ? (
        <EmptyState
          icon="playlist"
          title="No playlists yet"
          description="Create one here, or save your queue as a playlist"
          action={<Button variant="acc" icon="plus" onClick={create}>New playlist</Button>}
        />
      ) : (
        <div className="flex gap-4 flex-wrap">
          {playlists.map((p, i) => (
            <Card
              key={p.id}
              title={p.name}
              subtitle={`${p.trackCount ?? 0} songs`}
              artVariant={`a${(i % 12) + 1}` as any}
              thumbnail={p.thumbnail || `/api/v1/playlists/${p.id}/artwork?size=140`}
              to={`/playlist/${p.id}`}
              onMore={e => openPlaylistMenu(p, e)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Playlist({ id }: { id: string }) {
  const navigate = useNavigate()
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const isOffline = mode === 'offline'

  const { data: myPlaylistsData } = useMyPlaylists()
  const defaultId = id

  const { data: playlist, loading: playlistLoading, error: playlistError } = usePlaylist(defaultId)
  const { data: tracksData, loading: tracksLoading } = usePlaylistTracks(defaultId)
  const fetched = tracksData?.items ?? []

  // Edits apply locally first so drag-reorder and remove feel immediate.
  const [edited, setEdited] = useState<Track[] | null>(null)
  useEffect(() => setEdited(null), [tracksData])
  const tracks = edited ?? fetched

  const isOwn = !!defaultId && !!myPlaylistsData?.items.some(p => p.id === defaultId)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)

  async function reorder(from: number, to: number) {
    if (!defaultId || from === to) return
    const next = [...tracks]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setEdited(next)
    try {
      await api.reorderPlaylistTracks(defaultId, { from, to })
    } catch {
      setEdited(null)
      showToast({ title: 'Could not reorder playlist', icon: 'info' })
    }
  }

  async function removeAt(index: number) {
    if (!defaultId) return
    const previous = tracks
    setEdited(tracks.filter((_, i) => i !== index))
    try {
      await api.removeTracksFromPlaylist(defaultId, { index })
      notifyPlaylistsChanged()
    } catch {
      setEdited(previous)
      showToast({ title: 'Could not remove track', icon: 'info' })
    }
  }

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks)
    }
  }

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5)
      playTrack(shuffled[0], shuffled)
    }
  }

  if (playlistLoading && !playlist) {
    return (
      <div className="flex flex-col p-8 gap-6 animate-pulse">
        <div className="flex items-end gap-6 pb-6">
          <div className="w-[160px] h-[160px] bg-s2/40 rounded-lg" />
          <div className="flex flex-col gap-4 grow">
            <div className="h-4 bg-s2/40 rounded w-24" />
            <div className="h-10 bg-s2/40 rounded w-1/2" />
            <div className="h-4 bg-s2/40 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (playlistError || !playlist) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="playlist"
          title="Playlist not found"
          description={
            playlistError && !/not found/i.test(playlistError.message)
              ? playlistError.message
              : 'It may have been deleted or made private'
          }
          action={<Link to="/playlist" className="btn btn-acc">All playlists</Link>}
        />
      </div>
    )
  }

  const displayName = playlist.name
  const displayKind = playlist?.kind || 'online'
  const count = playlist?.trackCount ?? tracks.length

  return (
    <div className="flex flex-col overflow-auto h-full">
      <div className="flex items-end gap-6 p-8 pb-6">
        <Artwork
          src={playlist?.thumbnail || (defaultId ? `/api/v1/playlists/${defaultId}/artwork?size=300` : undefined)}
          alt={displayName}
          variant="a1"
          size={160}
          radius="lg"
          rings
        />
        <div className="flex flex-col gap-4 grow min-w-0">
          <div className="flex flex-col gap-1.5">
            <span className="text-overline text-t3">Playlist · {displayKind}</span>
            <span className="text-display text-t1">{displayName}</span>
            <span className="text-title-l text-t2">
              {count} songs
              {CAPS.downloads && playlist?.downloadedCount && playlist.downloadedCount > 0 ? ` · ${playlist.downloadedCount} downloaded` : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={isOffline ? 'gold' : 'acc'}
              icon="play"
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
            >
              Play
            </Button>
            <Button
              variant="out"
              icon="shuffle"
              onClick={handleShuffle}
              disabled={tracks.length === 0}
            >
              Shuffle
            </Button>
            <DownloadButton tracks={tracks} offline={isOffline} />
            {isOwn && (
              <Button variant="out" icon="plus" onClick={() => navigate(`/search?addTo=${encodeURIComponent(id)}`)}>Add songs</Button>
            )}
            {/* Queue actions for every track, and on your own playlists "Delete playlist" (D08). */}
            <IconButton
              icon="more"
              label="More options"
              size={40}
              bordered
              disabled={tracks.length === 0 && !isOwn}
              onClick={e => openTrackMenu(tracks, e, isOwn ? { id, name: displayName } : undefined)}
            />
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        {tracksLoading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="srow h-14 bg-s2/30 rounded" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <EmptyState
            icon="music"
            title="Empty playlist"
            description="Add tracks to this playlist to get started"
          />
        ) : (
          <motion.div
            className="flex flex-col gap-0.5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {tracks.map((track, i) => {
              const row = (
                <SongRow
                  key={track.id}
                  track={track}
                  index={i + 1}
                  isActive={currentTrack?.id === track.id}
                  onClick={() => playTrack(track, tracks)}
                  onRemove={isOwn ? () => void removeAt(i) : undefined}
                />
              )
              if (!isOwn) return row
              // Own playlists reorder by drag (FLOWS M08 / D08).
              return (
                <div
                  key={track.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move'
                    setDragFrom(i)
                  }}
                  onDragOver={e => {
                    if (dragFrom === null) return
                    e.preventDefault()
                    setDropAt(i)
                  }}
                  onDrop={e => {
                    e.preventDefault()
                    if (dragFrom !== null) void reorder(dragFrom, i)
                    setDragFrom(null)
                    setDropAt(null)
                  }}
                  onDragEnd={() => {
                    setDragFrom(null)
                    setDropAt(null)
                  }}
                  className={cn(
                    'flex items-center gap-1 rounded border-t-2 border-transparent',
                    dragFrom === i && 'opacity-40',
                    dropAt === i && dragFrom !== i && 'border-acc'
                  )}
                >
                  <span className="flex-none text-t4 cursor-grab px-1" aria-hidden><Icon name="menu" size={14} /></span>
                  <div className="grow min-w-0">{row}</div>
                </div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
