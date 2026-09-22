import React from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { MOCK_ARTISTS, MOCK_TRACKS, MOCK_ALBUMS } from '../data/mock'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { staggerContainer, transition } from '../lib/motion'
import { cn } from '../lib/utils'

export default function Artist() {
  const { id } = useParams()
  const { mode } = useModeStore()
  const isOffline = mode === 'offline'

  const artist = MOCK_ARTISTS.find(a => a.id === id) ?? MOCK_ARTISTS[0]
  const tracks = MOCK_TRACKS.filter(t => isOffline ? t.source === 'local' : true).slice(0, 5)
  const albums = MOCK_ALBUMS.filter(a => isOffline ? a.downloaded : true)

  return (
    <div className="flex flex-col overflow-auto h-full">
      <div className="relative flex items-end gap-6 p-8 pb-6 min-h-[280px]">
        <div className="ambient" aria-hidden>
          <i className="bg-acc w-[400px] h-[400px] -top-[100px] -left-[100px]" />
          <i className="bg-s3 w-[300px] h-[300px] top-0 right-0" />
        </div>
        <Artwork variant="a5" size={160} radius="xl" className="relative" />
        <div className="flex flex-col gap-4 grow min-w-0 relative">
          <div className="flex flex-col gap-1">
            <span className="text-overline text-t3">Artist</span>
            <span className="text-display text-t1">{artist.name}</span>
            {artist.monthlyListeners && !isOffline && (
              <span className="text-title-l text-t2">{artist.monthlyListeners.toLocaleString()} monthly listeners</span>
            )}
            <span className="text-body-l text-t3">{artist.localTrackCount} local tracks · {artist.albumCount} albums</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant={isOffline ? 'gold' : 'acc'} icon="play">Play</Button>
            <Button variant="out" icon="shuffle">Shuffle</Button>
            <Button variant={artist.following ? 'solid' : 'out'}>{artist.following ? 'Following' : 'Follow'}</Button>
            <IconButton icon="more" label="More options" size={40} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-8 pb-8">
        <div className="flex flex-col gap-2">
          <span className="text-h2 text-t1">Popular tracks</span>
          <motion.div className="flex flex-col gap-0.5" variants={staggerContainer} initial="hidden" animate="visible">
            {tracks.map((track, i) => (
              <SongRow key={track.id} track={track} index={i + 1} isActive={i === 0} isPlaying={i === 0} />
            ))}
          </motion.div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-h2 text-t1">Albums</span>
          <div className="flex gap-4 flex-wrap">
            {albums.map((album, i) => (
              <div key={album.id} className="acard w-[140px]">
                <Artwork variant={`a${(i + 1) % 12 || 12}` as any} size={140} />
                <div className="flex flex-col gap-1">
                  <span className="text-label-l text-t1 truncate">{album.title}</span>
                  <span className="text-label-s text-t3 truncate">{album.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
