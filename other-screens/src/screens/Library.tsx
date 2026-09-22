import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { MOCK_TRACKS } from '../data/mock'
import SongRow from '../components/music/SongRow'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { Chip } from '../components/ui/ChipBadge'
import Icon from '../components/ui/Icon'
import { staggerContainer, staggerItem, fadeRise, transition } from '../lib/motion'
import { cn } from '../lib/utils'

const TABS = ['Songs', 'Albums', 'Artists', 'Genres', 'Folders', 'Favourites', 'Most played'] as const
type Tab = typeof TABS[number]

export default function Library() {
  const { mode } = useModeStore()
  const [activeTab, setActiveTab] = useState<Tab>('Songs')
  const isOffline = mode === 'offline'

  const tracks = isOffline ? MOCK_TRACKS.filter(t => t.source === 'local') : MOCK_TRACKS

  return (
    <div className="flex flex-col gap-7 overflow-hidden h-full">
      <div className="flex flex-col gap-6 px-8 pt-6 flex-none">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-display-m text-t1">Your Library</span>
            <span className="text-body-m text-t2">{tracks.length.toLocaleString()} songs · sorted by recently added</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link to="/folders" className="btn btn-out"><Icon name="folder" size={15} />Manage folders</Link>
            <Button variant="out" icon="shuffle">Shuffle all</Button>
            <Button variant={isOffline ? 'gold' : 'acc'} icon="play">Play all</Button>
          </div>
        </div>

        <div className="tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={cn('tab', activeTab === tab && 'on')}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
          <span className="grow min-w-0" />
          <Chip size="sm" icon="clock" suffixIcon="chevron-down">
            Recently added
          </Chip>
          <div className="flex items-center gap-0.5 ml-2">
            <IconButton icon="list" label="List view" size={28} active />
            <IconButton icon="layout-grid" label="Grid view" size={28} />
          </div>
        </div>

        <div className="grid gap-4 items-center text-label-s text-t3 pb-2.5 border-b border-ln grid-cols-[30px_44px_minmax(0,2.4fr)_minmax(0,1.7fr)_116px_64px_58px_78px] px-3">
          <span className="text-right">#</span>
          <span />
          <span>TITLE</span>
          <span>ALBUM</span>
          <span>SOURCE</span>
          <span className="text-right">PLAYS</span>
          <span className="flex justify-end"><Icon name="clock" size={13} /></span>
          <span />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + mode}
          className="flex flex-col gap-0.5 px-8 pb-8 overflow-auto"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {tracks.map((track, i) => (
            <SongRow
              key={track.id}
              track={track}
              index={i + 1}
              isActive={i === 0}
              isPlaying={i === 0}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
