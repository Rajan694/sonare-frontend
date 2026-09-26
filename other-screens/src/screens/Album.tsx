import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useAlbum, useAlbumTracks, useLibraryAlbums } from '../data/hooks'
import { api } from '../data/api'
import { requireAccount } from '../data/accountGate'
import { openTrackMenu } from '../components/music/TrackMenu'
import DownloadButton from '../components/music/DownloadButton'
import SongRow, { SongTableHeader } from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button, { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { staggerContainer } from '../lib/motion'
import { formatDuration } from '../lib/utils'
import type { Track } from '../data/types'

export default function Album() {
  const { id } = useParams()
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const isOffline = mode === 'offline'

  const { data: album, loading: albumLoading, error: albumError } = useAlbum(id)
  const { data: tracksData, loading: tracksLoading } = useAlbumTracks(id)
  const { data: savedAlbums } = useLibraryAlbums()
  const [favouriteOverride, setFavourite] = useState<boolean | null>(null)
  const favourite = favouriteOverride ?? !!savedAlbums?.items.some(a => a.id === id)

  const tracks = tracksData?.items || []

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

  const toggleFavourite = () =>
    requireAccount('Create a free account to save albums you love.', async () => {
      if (!id) return
      const next = !favourite
      setFavourite(next)
      try {
        await api.setAlbumFavourite(id, next)
      } catch {
        setFavourite(!next)
      }
    })

  if (albumLoading) {
    return (
      <div className="flex flex-col p-8 gap-6 animate-pulse">
        <div className="flex items-end gap-6 pb-6">
          <div className="w-[200px] h-[200px] bg-s2/40 rounded-xl" />
          <div className="flex flex-col gap-4 grow">
            <div className="h-4 bg-s2/40 rounded w-20" />
            <div className="h-10 bg-s2/40 rounded w-1/2" />
            <div className="h-4 bg-s2/40 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (albumError || !album) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="disc"
          title="Album not found"
          description={albumError?.message || "Could not load album details"}
          action={<Link to="/home" className="btn btn-acc">Back to Home</Link>}
        />
      </div>
    )
  }

  const totalDurationMs = tracks.reduce((acc, t) => acc + (t.durationMs || 0), 0)
  const durationStr = totalDurationMs > 0 ? formatDuration(totalDurationMs) : null
  const albumMeta = [
    album.artist,
    album.year,
    album.trackCount ? `${album.trackCount} songs` : (tracks.length > 0 ? `${tracks.length} songs` : null),
    durationStr,
  ].filter(Boolean).join(' · ')

  const isLocalAlbum = album.source === 'local' || tracks.every(t => t.source === 'local')

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
          src={album.thumbnail || (id ? `/api/v1/albums/${id}/artwork?size=300` : undefined)}
          alt={album.title}
          variant="a1"
          size={184}
          radius="lg"
          rings
          className="shadow-2xl flex-none mx-auto @[480px]:mx-0"
        />
        <div className="flex flex-col gap-3 grow min-w-0 text-center @[480px]:text-left">
          <span className="text-overline text-t3 uppercase font-semibold">
            ALBUM {isLocalAlbum ? '· ON THIS DEVICE' : ''}
          </span>
          <span className="text-display-m @[720px]:text-display text-t1 font-semibold truncate">{album.title}</span>
          <span className="text-body-m text-t2 truncate">
            {album.artistId ? (
              <Link to={`/artist/${album.artistId}`} className="text-t2 no-underline hover:text-t1 hover:underline">{album.artist}</Link>
            ) : album.artist}
            {album.year ? ` · ${album.year}` : ''}
            {album.trackCount ? ` · ${album.trackCount} songs` : (tracks.length > 0 ? ` · ${tracks.length} songs` : '')}
            {durationStr ? ` · ${durationStr}` : ''}
          </span>

          <div className="flex items-center justify-center @[480px]:justify-start gap-2 flex-wrap">
            {isLocalAlbum ? (
              <span className="badge bg-local inline-flex items-center gap-1">
                <Icon name="smartphone" size={9} />
                <span>On device</span>
              </span>
            ) : (
              <span className="badge bg-cloud inline-flex items-center gap-1">
                <Icon name="cloud" size={9} />
                <span>Server</span>
              </span>
            )}
            {album.genre && <span className="badge bg-neutral">{album.genre}</span>}
          </div>

          <div className="flex items-center justify-center @[480px]:justify-start gap-3 mt-1 flex-wrap">
            <button
              className="playbtn playbtn-56 flex-none"
              aria-label="Play album"
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
            <IconButton
              icon="heart"
              label="Favourite album"
              size={44}
              bordered
              active={favourite}
              onClick={toggleFavourite}
            />
            <IconButton
              icon="more"
              label="More options"
              size={44}
              bordered
              disabled={tracks.length === 0}
              onClick={e => openTrackMenu(tracks, e)}
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
        ) : (
          <motion.div
            className="flex flex-col gap-0.5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {tracks.map((track, i) => (
              <SongRow
                key={track.id}
                track={track}
                index={i + 1}
                isActive={currentTrack?.id === track.id}
                onClick={() => playTrack(track, tracks)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
