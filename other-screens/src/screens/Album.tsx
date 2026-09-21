import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { MOCK_ALBUMS, MOCK_TRACKS } from '../data/mock'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { staggerContainer, staggerItem, transition } from '../lib/motion'
import { formatDuration } from '../lib/utils'

export default function Album() {
  const { id } = useParams()
  const { mode } = useModeStore()
  const isOffline = mode === 'offline'

  const album = MOCK_ALBUMS.find(a => a.id === id) ?? MOCK_ALBUMS[0]
  const tracks = MOCK_TRACKS.filter(t => t.albumId === album.id || (isOffline ? t.source === 'local' : true))

  return (
    <div className="flex flex-col overflow-auto h-full">
      <div className="flex items-end gap-6 p-8 pb-6">
        <Artwork variant="a1" size={200} radius="xl" rings />
        <div className="flex flex-col gap-4 grow min-w-0">
          <div className="flex flex-col gap-1.5">
            <span className="text-overline text-t3">Album</span>
            <span className="text-display text-t1">{album.title}</span>
            <span className="text-title-l text-t2">{album.artist} · {album.year} · {album.trackCount} songs</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant={isOffline ? 'gold' : 'acc'} icon="play" size="lg">Play</Button>
            <Button variant="out" icon="shuffle">Shuffle</Button>
            {!album.downloaded && !isOffline && (
              <Button variant="out" icon="download">Download</Button>
            )}
            <IconButton icon="heart" label="Favourite album" size={40} bordered />
            <IconButton icon="more" label="More options" size={40} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-8 pb-8">
        <motion.div
          className="flex flex-col gap-0.5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {MOCK_TRACKS.slice(0, 6).map((track, i) => (
            <SongRow
              key={track.id}
              track={track}
              index={i + 1}
              isActive={i === 0}
              isPlaying={i === 0}
            />
          ))}
        </motion.div>
      </div>
    </div>
  )
}
