import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useTrending, useRecentlyPlayed } from '../data/hooks'
import { syncNow } from '../data/sync'
import { useLocalLibrary, resolveLocalRefs } from '../data/local'
import Icon from '../components/ui/Icon'
import { getCurrentUser } from '../data/auth'
import SongRow from '../components/music/SongRow'
import { trackArtwork } from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tile } from '../components/ui/Tile'
import { staggerContainer, staggerItem, transition } from '../lib/motion'
import type { Track } from '../data/types'

export default function Home() {
  const { mode } = useModeStore()
  const isOnline = mode === 'online'
  const { currentTrack, playTrack, isPlaying, togglePlay } = usePlayerStore()
  const user = getCurrentUser()

  const { data: trendingData, loading: trendingLoading } = useTrending('IN', 20)
  // "See all" expands a section in place — there is no separate trending / history page.
  const [allTrending, setAllTrending] = useState(false)
  const [allRecent, setAllRecent] = useState(false)
  const { data: recentData, loading: recentLoading } = useRecentlyPlayed(allRecent ? 50 : 10)

  const local = useLocalLibrary()
  // Offline (FLOWS M02) everything on Home comes from this device.
  const trendingTracks = isOnline ? trendingData?.items || [] : local.tracks
  // Play history repeats a track once per listen; the list shows each track once.
  const recentTracks = !isOnline
    ? local.tracks.slice(6, 26)
    : recentData?.items && recentData.items.length > 0
    ? resolveLocalRefs(recentData.items, local).filter((t, i, all) => all.findIndex(x => x.id === t.id) === i)
    : trendingTracks.slice(0, 5)

  const tiles = trendingTracks.slice(0, 6).map((t, i) => ({
    title: t.title,
    subtitle: t.artist,
    artVariant: `a${(i % 12) + 1}` as const,
    to: t.albumId ? `/album/${t.albumId}` : undefined,
    track: t,
  }))

  const trendingCards = trendingTracks.slice(6, allTrending ? undefined : 12).map((t, i) => ({
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

  return (
    <motion.div
      className="flex flex-col gap-7 p-6 pb-8 overflow-auto"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex items-center justify-between" variants={staggerItem} transition={transition.normal}>
        <div className="flex flex-col gap-1">
          <span className="text-body-s text-t3">
            {isOnline ? 'Online mode · Connected to Sonare API' : 'Showing local library'}
          </span>
          <span className="text-display-m text-t1">
            Welcome back{user?.displayName ? `, ${user.displayName}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {isOnline && <Button variant="out" icon="sync" onClick={() => void syncNow()}>Sync now</Button>}
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

      {!isOnline && (
        <motion.div className="offstrip gap-3" variants={staggerItem} transition={transition.normal}>
          <Icon name="smartphone" size={16} className="text-gold flex-none" />
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-gold">Offline mode</span>
            <span className="text-label-s text-t3">
              {local.tracks.length > 0
                ? `${local.tracks.length} songs on this device`
                : 'No music on this device yet — add a folder or download songs while online'}
            </span>
          </span>
          <Link to="/folders" className="btn btn-gold btn-sm no-underline">Manage music folders</Link>
        </motion.div>
      )}

      {/* Quick Access Tiles */}
      <motion.div className="grid gap-3 grid-cols-3" variants={staggerItem} transition={transition.normal}>
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

      {/* Trending Section */}
      {isOnline && (
        <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1">Trending locally this week</span>
            {trendingTracks.length > 12 && (
              <button className="text-label-l text-t3 bg-transparent border-0 cursor-pointer hover:text-t1" onClick={() => setAllTrending(v => !v)}>
                {allTrending ? 'Show less' : 'See all'}
              </button>
            )}
          </div>
          <div className="flex gap-4 flex-wrap">
            {trendingLoading && trendingCards.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="acard w-[160px] h-[210px] animate-pulse bg-s2/40 rounded-md" />
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
        </motion.div>
      )}

      {/* Recently Played / Recommended Tracks */}
      <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
        <div className="shead">
          <span className="text-h2 text-t1">
            {!isOnline ? 'On this device' : recentData?.items && recentData.items.length > 0 ? 'Recently played' : 'Recommended tracks'}
          </span>
          {isOnline && (recentData?.items.length ?? 0) >= 10 && (
            <button className="text-label-l text-t3 bg-transparent border-0 cursor-pointer hover:text-t1" onClick={() => setAllRecent(v => !v)}>
              {allRecent ? 'Show less' : 'See all'}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {isOnline && recentLoading && recentTracks.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="srow animate-pulse opacity-50 h-14 bg-s2/30" />
            ))
          ) : (
            recentTracks.map((track, i) => (
              <SongRow
                key={track.id}
                track={track}
                index={i + 1}
                isActive={currentTrack?.id === track.id}
                isPlaying={currentTrack?.id === track.id}
                onClick={() => handlePlay(track, recentTracks)}
              />
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
