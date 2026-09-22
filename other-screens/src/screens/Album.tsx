import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useAlbum, useAlbumTracks } from '../data/hooks'
import { api } from '../data/api'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { staggerContainer } from '../lib/motion'
import type { Track } from '../data/types'

export default function Album() {
  const { id } = useParams()
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const isOffline = mode === 'offline'

  const { data: album, loading: albumLoading, error: albumError } = useAlbum(id)
  const { data: tracksData, loading: tracksLoading } = useAlbumTracks(id)
  const [favourite, setFavourite] = useState(false)

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

  const toggleFavourite = async () => {
    if (!id) return
    const next = !favourite
    setFavourite(next)
    try {
      await api.setAlbumFavourite(id, next)
    } catch {
      setFavourite(!next)
    }
  }

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

  return (
    <div className="flex flex-col overflow-auto h-full">
      <div className="flex items-end gap-6 p-8 pb-6">
        <Artwork
          src={album.thumbnail || (id ? `/api/v1/albums/${id}/artwork?size=300` : undefined)}
          alt={album.title}
          variant="a1"
          size={200}
          radius="xl"
          rings
        />
        <div className="flex flex-col gap-4 grow min-w-0">
          <div className="flex flex-col gap-1.5">
            <span className="text-overline text-t3">Album</span>
            <span className="text-display text-t1">{album.title}</span>
            <span className="text-title-l text-t2">
              {album.artist}
              {album.year ? ` · ${album.year}` : ''}
              {album.trackCount ? ` · ${album.trackCount} songs` : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={isOffline ? 'gold' : 'acc'}
              icon="play"
              size="lg"
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
            {!album.downloaded && !isOffline && (
              <Button variant="out" icon="download">Download</Button>
            )}
            <IconButton
              icon="heart"
              label="Favourite album"
              size={40}
              bordered
              active={favourite}
              onClick={toggleFavourite}
            />
            <IconButton icon="more" label="More options" size={40} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-8 pb-8">
        {tracksLoading ? (
          <div className="flex flex-col gap-2 animate-pulse">
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
                isPlaying={currentTrack?.id === track.id}
                onClick={() => playTrack(track, tracks)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
