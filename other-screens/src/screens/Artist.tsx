import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useArtist, useArtistTopTracks, useArtistAlbums } from '../data/hooks'
import { api } from '../data/api'
import { requireAccount } from '../data/accountGate'
import { openTrackMenu } from '../components/music/TrackMenu'
import SongRow, { SongTableHeader } from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button, { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { Card } from '../components/ui/Card'
import { staggerContainer } from '../lib/motion'
import type { Track, Album } from '../data/types'

export default function Artist() {
  const { id } = useParams()
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const isOffline = mode === 'offline'

  const { data: artist, loading: artistLoading, error: artistError } = useArtist(id)
  const { data: tracksData, loading: tracksLoading } = useArtistTopTracks(id)
  const { data: albumsData } = useArtistAlbums(id)

  const [followingOverride, setFollowing] = useState<boolean | null>(null)
  const isFollowing = followingOverride ?? (artist?.following || false)

  const tracks: Track[] = tracksData?.items || []
  const albums: Album[] = albumsData?.items || []

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

  const toggleFollowing = () =>
    requireAccount('Create a free account to follow artists.', async () => {
      if (!id) return
      const next = !isFollowing
      setFollowing(next)
      try {
        await api.setArtistFollowing(id, next)
      } catch {
        setFollowing(!next)
      }
    })

  if (artistLoading) {
    return (
      <div className="flex flex-col p-8 gap-6 animate-pulse">
        <div className="flex items-end gap-6 pb-6">
          <div className="w-[180px] h-[180px] bg-s2/40 rounded-full" />
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

  const isLocalArtist = CAPS.localLibrary && !!artist.localTrackCount

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
          src={artist.thumbnail || (id ? `/api/v1/artists/${id}/artwork?size=300` : undefined)}
          alt={artist.name}
          variant="a5"
          size={184}
          radius="circ"
          rings
          className="shadow-2xl flex-none mx-auto @[480px]:mx-0"
        />
        <div className="flex flex-col gap-3 grow min-w-0 text-center @[480px]:text-left">
          <span className="text-overline text-t3 uppercase font-semibold">
            ARTIST {isLocalArtist ? '· ON THIS DEVICE' : ''}
          </span>
          <span className="text-display-m @[720px]:text-display text-t1 font-semibold truncate">{artist.name}</span>
          <span className="text-body-m text-t2 truncate">
            {artist.monthlyListeners && !isOffline ? `${artist.monthlyListeners.toLocaleString()} monthly listeners` : ''}
            {artist.monthlyListeners && (artist.albumCount || artist.localTrackCount) ? ' · ' : ''}
            {artist.albumCount ? `${artist.albumCount} albums` : ''}
            {artist.localTrackCount ? `${artist.albumCount ? ' · ' : ''}${artist.localTrackCount} local songs` : ''}
          </span>

          <div className="flex items-center justify-center @[480px]:justify-start gap-3 mt-1 flex-wrap">
            <button
              className="playbtn playbtn-56 flex-none"
              aria-label="Play artist"
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
            <Button
              variant={isFollowing ? 'solid' : 'out'}
              size="lg"
              onClick={toggleFollowing}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
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

      {/* Popular Tracks & About Side-by-Side (or stacked on mobile) */}
      <div className="flex flex-col gap-8 px-4 @[480px]:px-8 pb-8 relative">
        <div className="grid grid-cols-1 @[840px]:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
          {/* Popular list column with its own @container */}
          <div className="@container flex flex-col gap-3 min-w-0">
            <span className="text-h2 text-t1 font-semibold">Popular</span>
            {tracksLoading ? (
              <div className="flex flex-col gap-2 animate-pulse pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="srow h-14 bg-s2/30 rounded" />
                ))}
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-t3 py-4">No tracks found for this artist</div>
            ) : (
              <motion.div className="flex flex-col gap-0.5" variants={staggerContainer} initial="hidden" animate="visible">
                {tracks.slice(0, 5).map((track: Track, i: number) => (
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

          {/* About Card: only render if artist has local track counts */}
          {CAPS.localLibrary && !!artist.localTrackCount && (
            <div className="flex flex-col gap-3">
              <span className="text-h2 text-t1 font-semibold">About</span>
              <div className="surf flex flex-col gap-3 p-5 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-body-s text-t3">On this device</span>
                  <span className="text-mono-s text-gold">{artist.localTrackCount} songs</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Albums Shelf */}
        {albums.length > 0 && (
          <div className="flex flex-col gap-3.5">
            <div className="shead">
              <span className="text-h2 text-t1 font-semibold">Albums</span>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {albums.map((album: Album, i: number) => (
                <Card
                  key={album.id}
                  title={album.title}
                  subtitle={album.year ? String(album.year) : 'Album'}
                  artVariant={`a${(((i + 1) % 12) || 12) as 1}`}
                  thumbnail={album.thumbnail || `/api/v1/albums/${album.id}/artwork?size=140`}
                  to={`/album/${album.id}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
