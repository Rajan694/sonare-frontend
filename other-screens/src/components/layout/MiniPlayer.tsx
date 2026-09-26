import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'
import { useModeStore } from '../../store/modeStore'
import { usePlayerStore } from '../../store/playerStore'
import { useFavourite } from '../../data/favourites'
import Icon from '../ui/Icon'
import { IconButton } from '../ui/Button'
import { SourceGlyph } from '../ui/SourceGlyph'
import Artwork, { trackArtwork } from '../music/Artwork'

export default function MiniPlayer() {
  const navigate = useNavigate()
  const { mode } = useModeStore()
  const {
    state,
    currentTrack,
    isPlaying,
    isLoading,
    durationMs,
    togglePlay,
    next,
  } = usePlayerStore()

  const isOffline = mode === 'offline'
  const { favourite, toggle: toggleFavourite } = useFavourite(currentTrack?.id, currentTrack?.favourite)

  if (!currentTrack) return null

  const effectiveDurationMs = durationMs || currentTrack.durationMs || 1
  const progressPercent = Math.min(100, Math.max(0, (state.positionMs / effectiveDurationMs) * 100))

  return (
    <div className={cn('mini flex items-center gap-3 h-16 px-3 bg-s2 border-t border-ln2 flex-none relative no-underline text-inherit')}>
      {/* 2px progress line along top edge */}
      <div className="absolute top-[-1px] left-0 right-0 h-[2px] bg-ln2 overflow-hidden pointer-events-none">
        <div
          className={cn('h-full transition-all duration-200', isOffline ? 'bg-gold' : 'bg-acc')}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div
        className="flex items-center gap-3 grow min-w-0 cursor-pointer"
        onClick={() => navigate('/now-playing')}
      >
        <motion.div layoutId="now-playing-artwork" className="flex-none">
          <Artwork
            src={trackArtwork(currentTrack, 64)}
            alt={currentTrack.title}
            variant="a1"
            size={44}
            radius="sm"
            rings
          />
        </motion.div>
        <span className="flex flex-col grow gap-0.5 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-title-m text-t1 truncate">{currentTrack.title}</span>
            <SourceGlyph source={currentTrack.source} />
          </span>
          <span className="text-body-s text-t2 truncate">{currentTrack.artist}</span>
        </span>
      </div>

      <div className="flex items-center gap-0.5 flex-none" onClick={e => e.stopPropagation()}>
        <IconButton
          icon="heart"
          label={favourite ? 'Remove from favourites' : 'Add to favourites'}
          size={32}
          active={favourite}
          onClick={toggleFavourite}
        />
        <button
          className={cn('ib flex-none text-t1')}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlay}
          disabled={isLoading}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={20} />
        </button>
        <IconButton icon="skip-forward" label="Next track" size={32} onClick={next} />
      </div>
    </div>
  )
}
