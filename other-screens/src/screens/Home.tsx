import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { MOCK_TRACKS, MOCK_ALBUMS } from '../data/mock'
import SongRow from '../components/music/SongRow'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tile } from '../components/ui/Tile'
import { staggerContainer, staggerItem, transition } from '../lib/motion'
import { cn } from '../lib/utils'

const TILES = [
  { title: 'Paper Lanterns', subtitle: 'Hollow Coast', artVariant: 'a1' as const, to: '/album/al1' },
  { title: 'Static Bloom', subtitle: 'Vela Nine', artVariant: 'a2' as const, to: '/album/al2' },
  { title: 'Winter Arithmetic', subtitle: 'The Orchard Machine', artVariant: 'a3' as const, to: '/album/al3' },
  { title: 'Signal Decay', subtitle: 'Kite Runner', artVariant: 'a4' as const, to: '/album/al4' },
  { title: 'Deep Work Session', subtitle: 'Focus · 88 tracks', artVariant: 'a5' as const, to: '/playlist/pl2' },
  { title: 'Low Sun, Long Shadows', subtitle: 'Alinea', artVariant: 'a6' as const, to: '/album/al1' },
]

export default function Home() {
  const { mode } = useModeStore()
  const isOnline = mode === 'online'

  return (
    <motion.div
      className="flex flex-col gap-7 p-6 pb-8 overflow-auto"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex items-center justify-between" variants={staggerItem} transition={transition.normal}>
        <div className="flex flex-col gap-1">
          <span className="text-body-s text-t3">Thursday evening · {isOnline ? '2 new releases from artists you follow' : 'Showing local library'}</span>
          <span className="text-display-m text-t1">Welcome back, Rajan</span>
        </div>
        <div className="flex items-center gap-2.5">
          {isOnline && <Button variant="out" icon="sync">Sync now</Button>}
          <Button variant={isOnline ? 'acc' : 'gold'} icon="play">Resume</Button>
        </div>
      </motion.div>

      <motion.div className="grid gap-3 grid-cols-3" variants={staggerItem} transition={transition.normal}>
        {TILES.map((tile, i) => (
          <Tile key={i} {...tile} />
        ))}
      </motion.div>

      {isOnline && (
        <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
          <div className="shead">
            <span className="text-h2 text-t1">Trending locally this week</span>
            <Link to="/library" className="text-label-l text-t3 no-underline hover:text-t1">See all</Link>
          </div>
          <div className="flex gap-4 flex-wrap">
            {MOCK_ALBUMS.slice(0, 3).map((album, i) => (
              <Card
                key={album.id}
                title={album.title}
                subtitle={album.artist}
                artVariant={`a${i + 7}` as any}
                to={`/album/${album.id}`}
              />
            ))}
          </div>
        </motion.div>
      )}

      <motion.div className="flex flex-col gap-3.5" variants={staggerItem} transition={transition.normal}>
        <div className="shead">
          <span className="text-h2 text-t1">Recently played</span>
          <Link to="/library" className="text-label-l text-t3 no-underline hover:text-t1">See all</Link>
        </div>
        <div className="flex flex-col gap-0.5">
          {MOCK_TRACKS.slice(0, 5).map((track, i) => (
            <SongRow
              key={track.id}
              track={track}
              index={i + 1}
              isActive={i === 0}
              isPlaying={i === 0}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
