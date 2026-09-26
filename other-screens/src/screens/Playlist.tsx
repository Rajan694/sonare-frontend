import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { usePlaylist, usePlaylistTracks, useAuth, notifyPlaylistsChanged } from '../data/hooks'
import { api } from '../data/api'
import { showToast } from '../store/toastStore'
import { openTrackMenu } from '../components/music/TrackMenu'
import DownloadButton from '../components/music/DownloadButton'
import SongRow, { SongTableHeader } from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button, { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { staggerContainer } from '../lib/motion'
import { cn, formatDuration } from '../lib/utils'
import type { Track } from '../data/types'

export default function Playlist() {
  const { id: rawId } = useParams()
  const { mode } = useModeStore()
  const isOffline = mode === 'offline'
  const { currentTrack, playTrack } = usePlayerStore()
  const navigate = useNavigate()
  const { user } = useAuth()

  const id = rawId || ''
  const { data: playlist, loading: playlistLoading } = usePlaylist(id)
  const { data: tracksData, loading: tracksLoading, refetch: refetchTracks } = usePlaylistTracks(id)

  const isOwn = playlist?.kind === 'local' || (!!user && playlist?.kind === 'synced')

  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const [localTracks, setLocalTracks] = useState<Track[] | null>(null)

  const tracks = localTracks ?? tracksData?.items ?? []

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

  async function removeAt(index: number) {
    if (!id || !isOwn) return
    const removed = tracks[index]
    if (!removed) return
    const nextTracks = tracks.filter((_, i) => i !== index)
    setLocalTracks(nextTracks)
    try {
      await api.removeTracksFromPlaylist(id, { index })
      notifyPlaylistsChanged()
      showToast({
        title: 'Removed from playlist',
        description: removed.title,
        icon: 'trash',
      })
    } catch {
      setLocalTracks(null)
      refetchTracks()
      showToast({ title: 'Could not remove song', icon: 'info' })
    }
  }

  async function reorder(from: number, to: number) {
    if (!id || !isOwn || from === to) return
    const nextTracks = [...tracks]
    const [moved] = nextTracks.splice(from, 1)
    nextTracks.splice(to, 0, moved)
    setLocalTracks(nextTracks)
    try {
      await api.reorderPlaylistTracks(id, { from, to })
      notifyPlaylistsChanged()
    } catch {
      setLocalTracks(null)
      refetchTracks()
      showToast({ title: 'Could not reorder songs', icon: 'info' })
    }
  }

  if (playlistLoading && !playlist) {
    return (
      <div className="flex flex-col p-8 gap-6 animate-pulse">
        <div className="flex items-end gap-6 pb-6">
          <div className="w-[184px] h-[184px] bg-s2/40 rounded-xl" />
          <div className="flex flex-col gap-4 grow">
            <div className="h-4 bg-s2/40 rounded w-20" />
            <div className="h-10 bg-s2/40 rounded w-1/2" />
            <div className="h-4 bg-s2/40 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="playlist"
          title="Playlist not found"
          description="Could not load playlist details"
        />
      </div>
    )
  }

  const displayName = playlist.name
  const totalDurationMs = tracks.reduce((acc, t) => acc + (t.durationMs || 0), 0)
  const durationStr = totalDurationMs > 0 ? formatDuration(totalDurationMs) : null

  return (
    <div className="@container flex flex-col overflow-auto h-full relative">
      {/* Artwork-derived ambient blurred background */}
      <div className="ambient h-[340px] pointer-events-none" aria-hidden>
        <i className="bg-acc w-[460px] h-[460px] -left-[100px] -top-[200px] opacity-25" />
        <i className="bg-s3 w-[380px] h-[380px] left-[260px] -top-[160px] opacity-20" />
      </div>

      {/* Hero Header */}
      <div className="relative flex flex-col @[480px]:flex-row @[480px]:items-end gap-6 p-6 @[480px]:p-8 pb-6">
        <Artwork
          src={playlist?.thumbnail || (id ? `/api/v1/playlists/${id}/artwork?size=300` : undefined)}
          alt={displayName}
          variant="a1"
          size={184}
          radius="lg"
          rings
          className="shadow-2xl flex-none mx-auto @[480px]:mx-0"
        />
        <div className="flex flex-col gap-3 grow min-w-0 text-center @[480px]:text-left">
          <span className="text-overline text-t3 uppercase font-semibold">
            PLAYLIST {playlist.kind === 'local' ? '· ON THIS DEVICE' : ''}
          </span>
          <span className="text-display-m @[720px]:text-display text-t1 font-semibold truncate">{displayName}</span>
          <span className="text-body-m text-t2 truncate">
            {isOwn ? 'Made by you' : 'Curated playlist'}
            {` · ${tracks.length} songs`}
            {durationStr ? ` · ${durationStr}` : ''}
          </span>

          <div className="flex items-center justify-center @[480px]:justify-start gap-2 flex-wrap">
            {playlist.kind === 'local' && (
              <span className="badge bg-local inline-flex items-center gap-1">
                <Icon name="smartphone" size={9} />
                <span>On device</span>
              </span>
            )}
            {playlist.kind === 'synced' && (
              <span className="badge bg-dl inline-flex items-center gap-1">
                <Icon name="sync" size={9} />
                <span>Synced</span>
              </span>
            )}
            {CAPS.downloads && playlist?.downloadedCount !== undefined && playlist.downloadedCount > 0 && (
              <span className="badge bg-neutral">{playlist.downloadedCount} of {tracks.length} downloaded</span>
            )}
          </div>

          <div className="flex items-center justify-center @[480px]:justify-start gap-3 mt-1 flex-wrap">
            <button
              className="playbtn playbtn-56 flex-none"
              aria-label="Play playlist"
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
            >
              <Icon name="play" size={24} />
            </button>
            <Button
              variant="out"
              size="lg"
              icon="shuffle"
              onClick={handleShuffle}
              disabled={tracks.length === 0}
            >
              Shuffle
            </Button>
            <DownloadButton tracks={tracks} offline={isOffline} />
            {isOwn && (
              <Button
                variant="out"
                size="lg"
                icon="plus"
                onClick={() => navigate(`/search?addTo=${encodeURIComponent(id)}`)}
              >
                Add songs
              </Button>
            )}
            <IconButton
              icon="more"
              label="More options"
              size={44}
              bordered
              disabled={tracks.length === 0 && !isOwn}
              onClick={e => openTrackMenu(tracks, e, isOwn ? { id, name: displayName } : undefined)}
            />
          </div>
        </div>
      </div>

      {/* Track table */}
      <div className="flex flex-col gap-0.5 px-4 @[480px]:px-8 pb-8 relative">
        <SongTableHeader />
        {tracksLoading ? (
          <div className="flex flex-col gap-2 animate-pulse pt-2">
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
                  <span className="flex-none text-t4 cursor-grab px-1 select-none" aria-hidden>
                    <Icon name="menu" size={14} />
                  </span>
                  <div className="grow min-w-0">
                    <SongRow
                      track={track}
                      index={i + 1}
                      isActive={currentTrack?.id === track.id}
                      onClick={() => playTrack(track, tracks)}
                      onRemove={isOwn ? () => void removeAt(i) : undefined}
                    />
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
