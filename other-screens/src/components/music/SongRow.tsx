import React from 'react'
import { cn, formatDuration } from '../../lib/utils'
import Icon from '../ui/Icon'
import { IconButton } from '../ui/Button'
import { SourceGlyph } from '../ui/SourceGlyph'
import EqualizerBars from './EqualizerBars'
import Artwork, { trackArtwork } from './Artwork'
import type { Track } from '../../data/types'
import { useFavourite } from '../../data/favourites'
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
  hideAlbum?: boolean
}

export function SongTableHeader({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'hidden @[480px]:grid items-center gap-4 text-label-s text-t3 pb-2.5 px-3 border-b border-ln select-none',
        'grid-cols-[30px_44px_minmax(0,1fr)_116px_58px_74px] @[720px]:grid-cols-[30px_44px_minmax(0,2.4fr)_minmax(0,1.7fr)_116px_58px_74px]',
        className
      )}
    >
      {children ? (
        children
      ) : (
        <>
          <span className="text-right">#</span>
          <span />
          <span>TITLE</span>
          <span className="hidden @[720px]:inline">ALBUM</span>
          <span>SOURCE</span>
          <span className="text-right flex items-center justify-end">
            <Icon name="clock" size={13} />
          </span>
          <span />
        </>
      )}
    </div>
  )
}

export default function SongRow({
  track,
  index,
  isActive,
  onClick,
  onContextMenu,
  onRemove,
  onAdd,
  added,
  hideAlbum,
}: SongRowProps) {
  const { favourite, toggle: toggleFavourite } = useFavourite(track.id, track.favourite)
  const { isPlaying } = usePlayerStore()
  const { downloads, downloading } = useLocalLibrary()
  const progress = downloading[track.id]
  const isLocal = track.source === 'local' || downloads.has(track.id)

  return (
    <motion.div
      className={cn(
        'group cursor-default select-none transition-colors duration-150 rounded-[10px]',
        'flex items-center gap-3 p-2 min-h-[60px]',
        '@[480px]:grid @[480px]:grid-cols-[30px_44px_minmax(0,1fr)_116px_58px_74px] @[480px]:gap-4 @[480px]:px-3 @[480px]:py-[7px] @[480px]:min-h-0',
        '@[720px]:grid-cols-[30px_44px_minmax(0,2.4fr)_minmax(0,1.7fr)_116px_58px_74px]',
        isActive ? 'srow-on' : 'hover:bg-s1'
      )}
      variants={staggerItem}
      transition={transition.normal}
      role="row"
      aria-selected={isActive}
      onContextMenu={onContextMenu ?? (e => openTrackMenu(track, e))}
      onDoubleClick={onClick}
    >
      {/* Index column: hidden on phone (< 480px) */}
      <span className="hidden @[480px]:flex items-center justify-end text-mono-s text-t3">
        {isActive ? (
          <EqualizerBars playing={isPlaying} />
        ) : (
          <span>{index}</span>
        )}
      </span>

      {/* Artwork: 48px on phone, 40px on >=480px */}
      <div className="flex-none">
        <Artwork
          src={trackArtwork(track)}
          alt={track.title}
          variant={`a${((index % 12) || 12) as 1}`}
          size={44}
          radius="sm"
        />
      </div>

      {/* Title & Artist */}
      <div className="flex flex-col gap-0.5 min-w-0 grow @[480px]:grow-0 pr-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            className={cn(
              'text-title-m font-medium truncate text-left bg-transparent border-0 p-0 cursor-default hover:underline',
              isActive ? 'text-acc' : 'text-t1'
            )}
            onClick={onClick}
            onDoubleClick={e => e.stopPropagation()}
            aria-label={`Play ${track.title}`}
          >
            {track.title}
          </button>
          <span className="inline-flex @[480px]:hidden flex-none">
            <SourceGlyph source={isLocal ? 'local' : 'server'} />
          </span>
        </div>
        <span className="text-body-s text-t2 truncate">
          {track.artist}
          {track.album ? <span className="inline @[480px]:hidden text-t3"> · {track.album}</span> : null}
        </span>
      </div>

      {/* Album column: visible only at >= 720px */}
      <div className={cn('hidden @[720px]:block text-body-m text-t2 truncate', hideAlbum && 'invisible')}>
        {track.album || '—'}
      </div>

      {/* Source badge column: visible on >= 480px */}
      <div className="hidden @[480px]:flex items-center">
        {progress !== undefined ? (
          <span className="badge bg-local inline-flex items-center gap-1">
            <Icon name="smartphone" size={9} />
            <span>{Math.round(progress * 100)}%</span>
          </span>
        ) : isLocal ? (
          <span className="badge bg-local inline-flex items-center gap-1">
            <Icon name="smartphone" size={9} />
            <span>On device</span>
          </span>
        ) : (
          <span className="badge bg-cloud inline-flex items-center gap-1">
            <Icon name="cloud" size={9} />
            <span>Server</span>
          </span>
        )}
      </div>

      {/* Duration column */}
      <span className="flex-none text-mono-s text-t3 text-right">
        {formatDuration(track.durationMs)}
      </span>

      {/* Actions: Heart hidden on phone (< 480px), menu visible */}
      <div className="flex items-center justify-end gap-0.5 flex-none">
        <IconButton
          icon="heart"
          label={favourite ? 'Remove from favourites' : 'Add to favourites'}
          size={28}
          active={favourite}
          className={cn(
            'hidden @[480px]:inline-flex',
            !favourite && 'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
          onClick={e => {
            e.stopPropagation()
            toggleFavourite()
          }}
          onDoubleClick={e => e.stopPropagation()}
        />
        <IconButton
          icon="more"
          label="More options"
          size={28}
          className="opacity-80 @[480px]:opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => openTrackMenu(track, e)}
          onDoubleClick={e => e.stopPropagation()}
        />
        {onRemove && (
          <IconButton
            icon="close"
            label={`Remove ${track.title}`}
            tip="Remove"
            size={28}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => {
              e.stopPropagation()
              onRemove()
            }}
            onDoubleClick={e => e.stopPropagation()}
          />
        )}
        {onAdd && (
          <IconButton
            icon={added ? 'check' : 'plus'}
            label={added ? `${track.title} added` : `Add ${track.title} to playlist`}
            tip={added ? 'Added' : 'Add to playlist'}
            size={28}
            active={added}
            disabled={added}
            bordered
            onClick={e => {
              e.stopPropagation()
              onAdd()
            }}
            onDoubleClick={e => e.stopPropagation()}
          />
        )}
      </div>
    </motion.div>
  )
}
