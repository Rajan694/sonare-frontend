import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { usePlaylist, usePlaylistTracks, useMyPlaylists, useTrending } from '../data/hooks'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { staggerContainer } from '../lib/motion'
import type { Track } from '../data/types'

export default function Playlist() {
  const { id } = useParams()
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const isOffline = mode === 'offline'

  const { data: myPlaylistsData } = useMyPlaylists()
  const defaultId = id || (myPlaylistsData?.items && myPlaylistsData.items.length > 0 ? myPlaylistsData.items[0].id : undefined)

  const { data: playlist, loading: playlistLoading, error: playlistError } = usePlaylist(defaultId)
  const { data: tracksData, loading: tracksLoading } = usePlaylistTracks(defaultId)
  const { data: trendingData } = useTrending('IN', 20)

  const tracks = (tracksData?.items && tracksData.items.length > 0)
    ? tracksData.items
    : (!defaultId && trendingData?.items ? trendingData.items : [])

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

  if (!playlist && !defaultId && tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="playlist"
          title="No playlists yet"
          description="Create or add playlists to listen to your curated collections"
          action={<Link to="/home" className="btn btn-acc">Discover Music</Link>}
        />
      </div>
    )
  }

  const displayName = playlist?.name || 'Curated Playlist'
  const displayKind = playlist?.kind || 'online'
  const count = playlist?.trackCount ?? tracks.length

  return (
    <div className="flex flex-col overflow-auto h-full">
      <div className="flex items-end gap-6 p-8 pb-6">
        <Artwork
          src={playlist?.thumbnail || (defaultId ? `/api/v1/albums/${defaultId}/artwork?size=300` : undefined)}
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
              {playlist?.downloadedCount && playlist.downloadedCount > 0 ? ` · ${playlist.downloadedCount} downloaded` : ''}
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
            <IconButton icon="download" label="Download playlist" size={40} bordered />
            <IconButton icon="more" label="More options" size={40} />
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
