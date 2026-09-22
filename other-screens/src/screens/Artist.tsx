import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useArtist, useArtistTopTracks, useArtistAlbums } from '../data/hooks'
import { api } from '../data/api'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { staggerContainer } from '../lib/motion'
import type { Track } from '../data/types'

export default function Artist() {
  const { id } = useParams()
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const isOffline = mode === 'offline'

  const { data: artist, loading: artistLoading, error: artistError } = useArtist(id)
  const { data: topTracksData, loading: tracksLoading } = useArtistTopTracks(id, 10)
  const { data: albumsData, loading: albumsLoading } = useArtistAlbums(id)
  const [following, setFollowing] = useState<boolean>(false)

  const tracks = topTracksData?.items || []
  const albums = albumsData?.items || []

  const isFollowing = artist?.following ?? following

  const toggleFollowing = async () => {
    if (!id) return
    const next = !isFollowing
    setFollowing(next)
    try {
      await api.setArtistFollowing(id, next)
    } catch {
      setFollowing(!next)
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

  if (artistLoading) {
    return (
      <div className="flex flex-col p-8 gap-6 animate-pulse">
        <div className="flex items-end gap-6 pb-6 min-h-[280px]">
          <div className="w-[160px] h-[160px] bg-s2/40 rounded-xl" />
          <div className="flex flex-col gap-4 grow">
            <div className="h-4 bg-s2/40 rounded w-20" />
            <div className="h-10 bg-s2/40 rounded w-1/2" />
            <div className="h-4 bg-s2/40 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (artistError || !artist) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="mic"
          title="Artist not found"
          description={artistError?.message || "Could not load artist profile"}
          action={<Link to="/home" className="btn btn-acc">Back to Home</Link>}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-auto h-full">
      <div className="relative flex items-end gap-6 p-8 pb-6 min-h-[280px]">
        <div className="ambient" aria-hidden>
          <i className="bg-acc w-[400px] h-[400px] -top-[100px] -left-[100px]" />
          <i className="bg-s3 w-[300px] h-[300px] top-0 right-0" />
        </div>
        <Artwork
          src={artist.thumbnail || (id ? `/api/v1/artists/${id}/artwork?size=300` : undefined)}
          alt={artist.name}
          variant="a5"
          size={160}
          radius="xl"
          className="relative"
        />
        <div className="flex flex-col gap-4 grow min-w-0 relative">
          <div className="flex flex-col gap-1">
            <span className="text-overline text-t3">Artist</span>
            <span className="text-display text-t1">{artist.name}</span>
            {artist.monthlyListeners && !isOffline && (
              <span className="text-title-l text-t2">{artist.monthlyListeners.toLocaleString()} monthly listeners</span>
            )}
            <span className="text-body-l text-t3">
              {artist.localTrackCount ? `${artist.localTrackCount} local tracks · ` : ''}
              {artist.albumCount ? `${artist.albumCount} albums` : ''}
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
            <Button
              variant={isFollowing ? 'solid' : 'out'}
              onClick={toggleFollowing}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <IconButton icon="more" label="More options" size={40} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-8 pb-8">
        <div className="flex flex-col gap-2">
          <span className="text-h2 text-t1">Popular tracks</span>
          {tracksLoading ? (
            <div className="flex flex-col gap-2 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="srow h-14 bg-s2/30 rounded" />
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-t3 py-4">No tracks found for this artist</div>
          ) : (
            <motion.div className="flex flex-col gap-0.5" variants={staggerContainer} initial="hidden" animate="visible">
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

        {albums.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-h2 text-t1">Albums</span>
            <div className="flex gap-4 flex-wrap">
              {albums.map((album, i) => (
                <Link
                  key={album.id}
                  to={`/album/${album.id}`}
                  className="acard w-[140px] no-underline text-inherit"
                >
                  <Artwork
                    src={album.thumbnail || `/api/v1/albums/${album.id}/artwork?size=140`}
                    alt={album.title}
                    variant={`a${((i + 1) % 12) || 12}` as any}
                    size={140}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-label-l text-t1 truncate">{album.title}</span>
                    {album.year && <span className="text-label-s text-t3 truncate">{album.year}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
