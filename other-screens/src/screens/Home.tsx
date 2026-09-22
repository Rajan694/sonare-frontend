import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useTrending, useRecentlyPlayed } from '../data/hooks'
import { getCurrentUser } from '../data/auth'
import SongRow from '../components/music/SongRow'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tile } from '../components/ui/Tile'
import { staggerContainer, staggerItem, transition } from '../lib/motion'
import type { Track } from '../data/types'

export default function Home() {
  const { mode } = useModeStore()
  const isOnline = mode === 'online'
  const { currentTrack, playTrack } = usePlayerStore()
  const user = getCurrentUser()

  const { data: trendingData, loading: trendingLoading } = useTrending('IN', 20)
  const { data: recentData, loading: recentLoading } = useRecentlyPlayed(10)

  const trendingTracks = trendingData?.items || []
  const recentTracks = recentData?.items && recentData.items.length > 0 
    ? recentData.items 
    : trendingTracks.slice(0, 5)

  const tiles = trendingTracks.slice(0, 6).map((t, i) => ({
    title: t.title,
    subtitle: t.artist,
    artVariant: `a${(i % 12) + 1}` as const,
    to: t.albumId ? `/album/${t.albumId}` : `/search?q=${encodeURIComponent(t.title)}`,
    track: t,
  }))

  const trendingCards = trendingTracks.slice(6, 12).map((t, i) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    artVariant: `a${((i + 6) % 12) + 1}` as const,
    to: t.albumId ? `/album/${t.albumId}` : `/search?q=${encodeURIComponent(t.title)}`,
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
          {isOnline && <Button variant="out" icon="sync">Sync now</Button>}
          {trendingTracks.length > 0 && (
            <Button
              variant={isOnline ? 'acc' : 'gold'}
              icon="play"
              onClick={() => handlePlay(trendingTracks[0], trendingTracks)}
            >
              Resume
            </Button>
          )}
        </div>
      </motion.div>

      {/* Quick Access Tiles */}
      <motion.div className="grid gap-3 grid-cols-3" variants={staggerItem} transition={transition.normal}>
        {trendingLoading && tiles.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tile animate-pulse opacity-50 h-14 bg-s2/40" />
          ))
        ) : (
          tiles.map((tile, i) => (
            <div key={i} onClick={() => handlePlay(tile.track, trendingTracks)} className="cursor-pointer">
              <Tile
                title={tile.title}
                subtitle={tile.subtitle}
                artVariant={tile.artVariant}
                to={tile.to}
                thumbnail={tile.track.thumbnail || `/api/v1/tracks/${tile.track.id}/artwork?size=64`}
              />
            </div>
          ))
        )}
      </motion.div>

      {/* Trending Section */}
      {isOnline && (
        <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1">Trending locally this week</span>
            <Link to="/library" className="text-label-l text-t3 no-underline hover:text-t1">See all</Link>
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
                  thumbnail={card.track.thumbnail || `/api/v1/tracks/${card.track.id}/artwork?size=140`}
                />
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Recently Played / Recommended Tracks */}
      <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
        <div className="shead">
          <span className="text-h2 text-t1">{recentData?.items && recentData.items.length > 0 ? 'Recently played' : 'Recommended tracks'}</span>
          <Link to="/library" className="text-label-l text-t3 no-underline hover:text-t1">See all</Link>
        </div>
        <div className="flex flex-col gap-0.5">
          {recentLoading && recentTracks.length === 0 ? (
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
