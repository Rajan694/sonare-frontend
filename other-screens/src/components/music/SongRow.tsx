import React from 'react'
import { cn } from '../../lib/utils'
import Icon from '../ui/Icon'
import { IconButton } from '../ui/Button'
import { SourceGlyph } from '../ui/SourceGlyph'
import EqualizerBars from './EqualizerBars'
import Artwork from './Artwork'
import type { Track } from '../../data/types'
import { useFavourite } from '../../data/favourites'
import { formatDuration } from '../../lib/utils'
import { motion } from 'motion/react'
import { staggerItem, transition } from '../../lib/motion'

interface SongRowProps {
  track: Track
  index: number
  isActive?: boolean
  isPlaying?: boolean
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export default function SongRow({ track, index, isActive, isPlaying, onClick, onContextMenu }: SongRowProps) {
  const { favourite, toggle: toggleFavourite } = useFavourite(track.id, track.favourite)

  return (
    <motion.div
      className={cn(
        'srow',
        isActive ? 'srow-on' : 'srow-hover',
        'group cursor-default'
      )}
      variants={staggerItem}
      transition={transition.normal}
      role="row"
      aria-selected={isActive}
      onContextMenu={onContextMenu}
    >
      <span className="srow-idx">
        {isActive ? (
          <EqualizerBars playing={isPlaying} />
        ) : (
          <span className="text-mono-s text-t3">{index}</span>
        )}
      </span>

      <Artwork
        src={track.thumbnail || `/api/v1/tracks/${track.id}/artwork`}
        alt={track.title}
        variant={`a${((index % 12) || 12) as 1}`}
        size={40}
        radius="xs"
      />

      <div className="flex flex-col grow min-w-0 pr-4">
        <button
          className={cn('text-body-m font-medium truncate text-left bg-transparent border-0 p-0 cursor-default', isActive ? 'text-acc' : 'text-t1')}
          onClick={onClick}
          aria-label={`Play ${track.title}`}
        >
          {track.title}
        </button>
        <span className="text-body-s text-t3 truncate">{track.artist}</span>
      </div>

      <div className="flex-none w-48 text-body-s text-t3 truncate">{track.album}</div>

      <div className="flex-none w-11 flex items-center justify-center">
        <SourceGlyph source={track.source} />
      </div>

      <div className="flex-none w-16 text-mono-s text-t3 text-right">{track.playCount.toLocaleString()}</div>

      <div className="flex-none w-14 text-mono-s text-t3 text-right">{formatDuration(track.durationMs)}</div>

      <div className="flex-none flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <IconButton
          icon="heart"
          label={favourite ? 'Remove from favourites' : 'Add to favourites'}
          size={32}
          active={favourite}
          onClick={e => {
            // The row itself starts playback — don't do both.
            e.stopPropagation()
            toggleFavourite()
          }}
        />
        <IconButton
          icon="more"
          label="More options"
          size={32}
        />
      </div>
    </motion.div>
  )
}
