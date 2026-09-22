import React from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { MOCK_PLAYLISTS, MOCK_TRACKS } from '../data/mock'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { staggerContainer, transition } from '../lib/motion'
import { cn } from '../lib/utils'

export default function Playlist() {
  const { id } = useParams()
  const { mode } = useModeStore()
  const isOffline = mode === 'offline'

  const playlist = MOCK_PLAYLISTS.find(p => p.id === id) ?? MOCK_PLAYLISTS[0]
  const tracks = MOCK_TRACKS.filter(t => isOffline ? t.source === 'local' : true)

  return (
    <div className="flex flex-col overflow-auto h-full">
      <div className="flex items-end gap-6 p-8 pb-6">
        <Artwork variant="a1" size={160} radius="lg" rings />
        <div className="flex flex-col gap-4 grow min-w-0">
          <div className="flex flex-col gap-1.5">
            <span className="text-overline text-t3">Playlist · {playlist.kind}</span>
            <span className="text-display text-t1">{playlist.name}</span>
            <span className="text-title-l text-t2">{playlist.trackCount} songs{playlist.downloadedCount > 0 && ` · ${playlist.downloadedCount} downloaded`}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant={isOffline ? 'gold' : 'acc'} icon="play">Play</Button>
            <Button variant="out" icon="shuffle">Shuffle</Button>
            <IconButton icon="download" label="Download playlist" size={40} bordered />
            <IconButton icon="more" label="More options" size={40} />
          </div>
        </div>
      </div>

      <motion.div
        className="flex flex-col gap-0.5 px-8 pb-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {tracks.map((track, i) => (
          <SongRow key={track.id} track={track} index={i + 1} isActive={i === 0} isPlaying={i === 0} />
        ))}
      </motion.div>
    </div>
  )
}
