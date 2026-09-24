import React from 'react'
import { cn } from '../../lib/utils'
import Icon from '../ui/Icon'
import { IconButton } from '../ui/Button'
import { SourceGlyph } from '../ui/SourceGlyph'
import EqualizerBars from './EqualizerBars'
import Artwork, { trackArtwork } from './Artwork'
import type { Track } from '../../data/types'
import { useFavourite } from '../../data/favourites'
import { formatDuration } from '../../lib/utils'
import { motion } from 'motion/react'
import { staggerItem, transition } from '../../lib/motion'
import { openTrackMenu } from './TrackMenu'
import { useLocalLibrary } from '../../data/local'
import { usePlayerStore } from '../../store/playerStore'

interface SongRowProps {
  track: Track
  index: number
  /** The row is the current track; its bars move only while audio is actually playing. */
  isActive?: boolean
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  /** Shows a remove (X) button — queue and own playlists. */
  onRemove?: () => void
  /** Add-to-playlist mode (FLOWS M08 "Add songs"): a visible + / ✓ at the row's end. */
  onAdd?: () => void
  added?: boolean
}

export default function SongRow({ track, index, isActive, onClick, onContextMenu, onRemove, onAdd, added }: SongRowProps) {
  const { favourite, toggle: toggleFavourite } = useFavourite(track.id, track.favourite)
  const { isPlaying } = usePlayerStore()
  const { downloads, downloading } = useLocalLibrary()
  const progress = downloading[track.id]

  return (
    <motion.div
      className={cn(
        'srow',
        isActive ? 'srow-on' : 'srow-hover',
        'group cursor-default select-none'
      )}
      variants={staggerItem}
      transition={transition.normal}
      role="row"
      aria-selected={isActive}
      onContextMenu={onContextMenu ?? (e => openTrackMenu(track, e))}
      onDoubleClick={onClick}
    >
      <span className="srow-idx">
        {isActive ? (
          <EqualizerBars playing={isPlaying} />
        ) : (
          <span className="text-mono-s text-t3">{index}</span>
        )}
      </span>

      <Artwork
        src={trackArtwork(track)}
        alt={track.title}
        variant={`a${((index % 12) || 12) as 1}`}
        size={40}
        radius="xs"
      />

      <div className="flex flex-col grow min-w-0 pr-4">
        <button
          className={cn('text-body-m font-medium truncate text-left bg-transparent border-0 p-0 cursor-default', isActive ? 'text-acc' : 'text-t1')}
          onClick={onClick}
          onDoubleClick={e => e.stopPropagation()}
          aria-label={`Play ${track.title}`}
        >
          {track.title}
        </button>
        <span className="text-body-s text-t3 truncate">{track.artist}</span>
      </div>

      <div className="flex-none w-48 text-body-s text-t3 truncate">{track.album}</div>

      <div className="flex-none w-11 flex items-center justify-center">
        {progress !== undefined ? (
          <span className="text-mono-s text-gold" aria-label="Downloading">{Math.round(progress * 100)}%</span>
        ) : (
          <SourceGlyph source={downloads.has(track.id) ? 'local' : track.source} />
        )}
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
          onDoubleClick={e => e.stopPropagation()}
        />
        <IconButton
          icon="more"
          label="More options"
          size={32}
          onClick={e => openTrackMenu(track, e)}
          onDoubleClick={e => e.stopPropagation()}
        />
        {onRemove && (
          <IconButton
            icon="close"
            label={`Remove ${track.title}`}
            size={32}
            onClick={e => {
              e.stopPropagation()
              onRemove()
            }}
            onDoubleClick={e => e.stopPropagation()}
          />
        )}
      </div>
      {onAdd && (
        <IconButton
          icon={added ? 'check' : 'plus'}
          label={added ? `${track.title} added` : `Add ${track.title} to playlist`}
          size={32}
          active={added}
          disabled={added}
          bordered
          className="flex-none ml-1"
          onClick={e => {
            e.stopPropagation()
            onAdd()
          }}
          onDoubleClick={e => e.stopPropagation()}
        />
      )}
    </motion.div>
  )
}
