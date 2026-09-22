import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { MOCK_TRACKS, MOCK_ALBUMS, MOCK_ARTISTS } from '../data/mock'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Icon from '../components/ui/Icon'
import { Chip } from '../components/ui/ChipBadge'
import { Field } from '../components/ui/Field'
import { IconButton } from '../components/ui/Button'
import { fadeRise, staggerContainer, staggerItem, transition } from '../lib/motion'
import { cn } from '../lib/utils'

const CHIPS = ['Songs', 'Albums', 'Artists', 'Playlists']
if (false) CHIPS.push('Folders')

export default function Search() {
  const { mode } = useModeStore()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('Songs')

  const isOnline = mode === 'online'
  const hasQuery = query.length > 0

  const onlineTracks = isOnline ? MOCK_TRACKS : MOCK_TRACKS.filter(t => t.source === 'local')
  const serverOnlyTracks = !isOnline ? MOCK_TRACKS.filter(t => t.source === 'server') : []

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-3 px-8 pt-6 pb-4 flex-none">
        <Field
          square
          icon="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search songs, albums, artists..."
          className="grow max-w-[560px]"
          aria-label="Search your library"
        >
          {query && (
            <button
              className="ib ib-28 flex-none"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </Field>
      </div>

      {hasQuery && (
        <div className="flex items-center gap-2 px-8 pb-4 flex-none">
          {CHIPS.map(chip => (
            <Chip
              key={chip}
              active={active === chip}
              onClick={() => setActive(chip)}
            >
              {chip}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex flex-col grow overflow-auto px-8 pb-8">
        <AnimatePresence mode="wait">
          {hasQuery ? (
            <motion.div
              key="results"
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition.normal}
              className="flex flex-col gap-1"
            >
              {onlineTracks.map((track, i) => (
                <SongRow key={track.id} track={track} index={i + 1} isActive={i === 0} isPlaying={i === 0} />
              ))}

              {!isOnline && serverOnlyTracks.length > 0 && (
                <div className="mt-6 flex flex-col gap-3">
                  <hr className="hr" />
                  <div className="offstrip">
                    <Icon name="wifi-off" size={16} />
                    <span className="flex flex-col grow gap-px">
                      <span className="text-label-l text-gold">{serverOnlyTracks.length} more results not available offline</span>
                      <span className="text-label-s text-t3">Switch to Online mode to see server results</span>
                    </span>
                    <Link to="/mode-switch" className="btn btn-gold btn-sm">Go online</Link>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="browse"
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition.normal}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-3.5">
                <span className="text-h2 text-t1">Browse categories</span>
                <div className="grid grid-cols-4 gap-3">
                  {['Ambient', 'Electronica', 'Post-rock', 'Indie', 'Jazz', 'Classical', 'Hip-hop', 'Folk'].map((cat, i) => (
                    <button
                      key={cat}
                      className="gcard text-left cursor-pointer"
                      onClick={() => setQuery(cat)}
                    >
                      <Artwork variant={`a${(i % 12) + 1}` as any} size={56} radius="md" className="absolute top-2 right-2" />
                      <span className="text-title-l text-t1 relative">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
