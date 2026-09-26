import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useTrending, useRecentlyPlayed, useAuth } from '../data/hooks'
import { loadErrorMessage } from '../data/api'
import { useLocalLibrary, resolveLocalRefs } from '../data/local'
import Icon from '../components/ui/Icon'
import SongRow, { SongTableHeader } from '../components/music/SongRow'
import { trackArtwork } from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tile } from '../components/ui/Tile'
import { EmptyState } from '../components/ui/EmptyState'
import { staggerContainer, staggerItem, transition } from '../lib/motion'
import { formatBytes } from '../lib/utils'
import type { Track } from '../data/types'

export default function Home() {
  const { mode, setMode } = useModeStore()
  const isOnline = mode === 'online'
  const { currentTrack, playTrack, isPlaying, togglePlay } = usePlayerStore()
  const { user } = useAuth()

  const { data: trendingData, loading: trendingLoading, error: trendingError, refetch: refetchTrending } = useTrending('IN', 20)
  const [allTrending, setAllTrending] = useState(false)
  const [allRecent, setAllRecent] = useState(false)
  const { data: recentData, loading: recentLoading, error: recentError, refetch: refetchRecent } = useRecentlyPlayed(allRecent ? 50 : 10)

  const local = useLocalLibrary()
  const trendingTracks = isOnline ? trendingData?.items || [] : local.tracks
  
  const hasRealRecent = !!(recentData?.items && recentData.items.length > 0)
  const recentTracks = !isOnline
    ? local.tracks.slice(6, 26)
    : hasRealRecent
    ? resolveLocalRefs(recentData.items, local).filter((t, i, all) => all.findIndex(x => x.id === t.id) === i)
    : []

  const trendingFailed = isOnline && !!trendingError && trendingTracks.length === 0
  const recentFailed = isOnline && !!user && !!recentError && !hasRealRecent

  const retry = () => {
    refetchTrending()
    refetchRecent()
  }
  const retryButton = <Button variant="out" size="sm" icon="sync" onClick={retry}>Try again</Button>

  const tiles = trendingTracks.slice(0, 6).map((t, i) => ({
    title: t.title,
    subtitle: t.artist,
    artVariant: `a${(i % 12) + 1}` as const,
    to: t.albumId ? `/album/${t.albumId}` : undefined,
    track: t,
  }))

  const trendingCards = trendingTracks.slice(0, allTrending ? undefined : 10).map((t, i) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    artVariant: `a${((i + 6) % 12) + 1}` as const,
    to: t.albumId ? `/album/${t.albumId}` : undefined,
    track: t,
  }))

  const handlePlay = (track: Track, queue: Track[]) => {
    playTrack(track, queue)
  }

  // Greeting based on real user or generic
  const userName = user?.displayName || user?.email?.split('@')[0] || ''
  const greeting = isOnline
    ? (userName ? `Welcome back, ${userName}` : 'Welcome back')
    : 'Your device library'

  const totalLocalBytes = local.tracks.reduce((acc, t) => acc + ((t as any).size || 0), 0)

  return (
    <motion.div
      className="@container flex flex-col gap-7 p-4 @[480px]:p-8 pb-8 overflow-auto h-full"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header row */}
      <motion.div className="flex flex-col @[480px]:flex-row @[480px]:items-center justify-between gap-4" variants={staggerItem} transition={transition.normal}>
        <div className="flex flex-col gap-1">
          {isOnline ? (
            <span className="text-body-s text-t3">
              Online mode · Connected to Sonare API
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-label-s text-gold font-semibold uppercase">
              <span className="w-2 h-2 rounded-full bg-gold" />
              <span>OFFLINE MODE</span>
            </span>
          )}
          <span className="text-display-m text-t1 font-semibold">
            {greeting}
          </span>
          {!isOnline && local.tracks.length > 0 && (
            <span className="text-body-m text-t2">
              {local.tracks.length.toLocaleString()} songs on this device
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {!isOnline && CAPS.localLibrary && (
            <Link to="/folders" className="btn btn-out">
              <Icon name="folder" size={16} />
              <span>Scan folders</span>
            </Link>
          )}
          {currentTrack ? (
            <Button variant={isOnline ? 'acc' : 'gold'} icon={isPlaying ? 'pause' : 'play'} onClick={togglePlay}>
              {isPlaying ? 'Pause' : 'Resume'}
            </Button>
          ) : trendingTracks.length > 0 && (
            <Button
              variant={isOnline ? 'acc' : 'gold'}
              icon="play"
              onClick={() => handlePlay(trendingTracks[0], trendingTracks)}
            >
              {isOnline ? 'Play trending' : 'Play all'}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Guest Banner */}
      {isOnline && !user && (
        <motion.div className="onstrip gap-3" variants={staggerItem} transition={transition.normal}>
          <Icon name="info" size={16} className="text-acc flex-none" />
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-acc">You're listening as a guest</span>
            <span className="text-body-s text-t2">Create a free account to save songs you love, build playlists and keep your history across devices.</span>
          </span>
          <Link to="/signin" state={{ mode: 'signup' }} className="no-underline"><Button variant="acc" size="sm">Create account</Button></Link>
          <Link to="/signin" state={{ mode: 'signin' }} className="no-underline"><Button variant="out" size="sm">Sign in</Button></Link>
        </motion.div>
      )}

      {/* Offline banner (matching D02) */}
      {!isOnline && (
        <motion.div className="offstrip gap-3" variants={staggerItem} transition={transition.normal}>
          <Icon name="smartphone" size={16} className="text-gold flex-none" />
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-gold">You're offline — showing music available on this device.</span>
            <span className="text-body-s text-t3">
              Recommendations, trending and server search are hidden until you go online.
            </span>
          </span>
          <button className="btn btn-sm btn-out flex-none" onClick={() => setMode('online')}>
            <Icon name="cloud" size={14} />
            <span>Go online</span>
          </button>
        </motion.div>
      )}

      {/* Quick Access Tiles: 2 cols on phone/web/tablet, 3 cols at desktop (@[960px]:) */}
      {(tiles.length > 0 || (isOnline && trendingLoading)) && (
        <motion.div className="grid gap-3 grid-cols-1 @[480px]:grid-cols-2 @[960px]:grid-cols-3" variants={staggerItem} transition={transition.normal}>
          {isOnline && trendingLoading && tiles.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tile animate-pulse opacity-50 h-14 bg-s2/40" />
            ))
          ) : (
            tiles.map((tile, i) => (
              <Tile
                key={i}
                title={tile.title}
                subtitle={tile.subtitle}
                artVariant={tile.artVariant}
                to={tile.to}
                thumbnail={trackArtwork(tile.track, 64)}
                onPlay={() => handlePlay(tile.track, trendingTracks)}
              />
            ))
          )}
        </motion.div>
      )}

      {/* Recently played / Jump back in shelf */}
      {(recentTracks.length > 0 || (!isOnline && local.tracks.length > 6)) && (
        <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1 font-semibold">
              {!isOnline ? 'Jump back in' : 'Recently played'}
            </span>
            {recentTracks.length > 6 && (
              <button
                className="text-label-l text-t3 bg-transparent border-0 cursor-pointer hover:text-t1 inline-flex items-center gap-1"
                onClick={() => setAllRecent(v => !v)}
              >
                <span>{allRecent ? 'Show less' : 'See all'}</span>
                <Icon name="chevron-right" size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {recentTracks.slice(0, allRecent ? undefined : 8).map((track, i) => (
              <Card
                key={track.id}
                title={track.title}
                subtitle={track.artist}
                artVariant={`a${((i % 12) + 1) as 1}`}
                thumbnail={trackArtwork(track, 140)}
                to={track.albumId ? `/album/${track.albumId}` : undefined}
                onPlay={() => handlePlay(track, recentTracks)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Trending shelf (Square cards) - Online only */}
      {isOnline && (
        <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1 font-semibold">Trending locally this week</span>
            {trendingTracks.length > 6 && (
              <button
                className="text-label-l text-t3 bg-transparent border-0 cursor-pointer hover:text-t1 inline-flex items-center gap-1"
                onClick={() => setAllTrending(v => !v)}
              >
                <span>{allTrending ? 'Show less' : 'See all'}</span>
                <Icon name="chevron-right" size={14} />
              </button>
            )}
          </div>
          {trendingFailed ? (
            <EmptyState icon="wifi-off" title="Could not load trending" description={loadErrorMessage(trendingError)} action={retryButton} />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {trendingLoading && trendingCards.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="acard w-[160px] h-[210px] animate-pulse bg-s2/40 rounded-md flex-none" />
                ))
              ) : (
                trendingCards.map((card) => (
                  <Card
                    key={card.id}
                    title={card.title}
                    subtitle={card.artist}
                    artVariant={card.artVariant}
                    to={card.to}
                    thumbnail={trackArtwork(card.track, 140)}
                    onPlay={() => handlePlay(card.track, trendingTracks)}
                  />
                ))
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Song Table */}
      <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
        <div className="shead">
          <span className="text-h2 text-t1 font-semibold">
            {isOnline ? 'Trending tracks' : 'Songs on device'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <SongTableHeader />
          {trendingTracks.slice(0, 10).map((track, i) => (
            <SongRow
              key={track.id}
              track={track}
              index={i + 1}
              isActive={currentTrack?.id === track.id}
              onClick={() => handlePlay(track, trendingTracks)}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
