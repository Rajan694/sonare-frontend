import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'
import { useModeStore } from '../../store/modeStore'
import { usePlayerStore } from '../../store/playerStore'
import Icon from '../ui/Icon'
import { IconButton } from '../ui/Button'
import { Slider } from '../ui/Slider'
import { SourceGlyph } from '../ui/SourceGlyph'
import Artwork from '../music/Artwork'
import Waveform from '../music/Waveform'
import { formatDuration } from '../../lib/utils'

export default function BottomPlayer() {
  const { mode } = useModeStore()
  const { state, currentTrack } = usePlayerStore()
  const isOffline = mode === 'offline'

  const positionRatio = state.positionMs / (currentTrack.durationMs || 1)

  return (
    <footer className="dplayer">
      <Link
        to="/now-playing"
        className="flex items-center gap-3 flex-none no-underline text-inherit w-[290px]"
        aria-label="Open now playing"
      >
        <motion.div layoutId="now-playing-artwork">
          <Artwork
            variant="a1"
            size={56}
            radius="sm"
            rings
          />
        </motion.div>
        <span className="flex flex-col grow gap-[3px] min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-title-m text-t1 truncate">{currentTrack.title}</span>
            <SourceGlyph source={currentTrack.source} />
          </span>
          <span className="text-body-s text-t2 truncate">{currentTrack.artist}</span>
        </span>
      </Link>

      <IconButton icon="heart" label="Favourite" size={32} active={currentTrack.favourite} />

      <div className="flex flex-col grow gap-1 max-w-[560px]">
        <div className="flex items-center justify-center gap-3.5">
          <IconButton icon="shuffle" label="Shuffle" size={32} active={state.shuffle} />
          <IconButton icon="skip-back" label="Previous track" size={32} />
          <button
            className={cn('playbtn playbtn-40', isOffline ? 'bg-gold shadow-glow-g' : 'bg-acc shadow-glow-s')}
            aria-label="Pause"
          >
            <Icon name="pause" size={18} />
          </button>
          <IconButton icon="skip-forward" label="Next track" size={32} />
          <IconButton
            icon={state.repeat === 'one' ? 'repeat-one' : 'repeat'}
            label="Repeat"
            size={32}
            active={state.repeat !== 'off'}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-mono-s text-t2 flex-none">{formatDuration(state.positionMs)}</span>
          <Waveform
            peaks={currentTrack.peaks}
            barCount={150}
            positionRatio={positionRatio}
            offline={isOffline}
            className="wave-sm"
          />
          <span className="text-mono-s text-t3 flex-none">{formatDuration(currentTrack.durationMs)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-none w-[290px] justify-end">
        <Link to="/lyrics" className="ib ib-32" aria-label="Lyrics">
          <Icon name="music4" size={16} />
        </Link>
        <Link to="/queue" className="ib ib-32" aria-label="Queue">
          <Icon name="list" size={16} />
        </Link>
        <Link to="/equalizer" className="ib ib-32" aria-label="Equalizer">
          <Icon name="sliders" size={16} />
        </Link>
        <IconButton icon="volume" label="Audio output" size={32} />
        <div className="flex items-center gap-1.5 flex-none w-24">
          <Icon name="volume" size={14} className="text-t3 flex-none" />
          <Slider value={62} className="w-full" />
        </div>
        <Link to="/now-playing" className="ib ib-32" aria-label="Full screen player">
          <Icon name="minimize" size={16} />
        </Link>
      </div>
    </footer>
  )
}
