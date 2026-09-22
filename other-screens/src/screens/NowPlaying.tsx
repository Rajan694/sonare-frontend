import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { usePeaks } from '../data/hooks'
import { useFavourite } from '../data/favourites'
import Artwork from '../components/music/Artwork'
import Waveform from '../components/music/Waveform'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { SourceGlyph } from '../components/ui/SourceGlyph'
import { Slider } from '../components/ui/Slider'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDuration } from '../lib/utils'
import { cn } from '../lib/utils'

export default function NowPlaying() {
  const { mode } = useModeStore()
  const { state, currentTrack } = usePlayerStore()
  const isOffline = mode === 'offline'

  const { data: peaksData } = usePeaks(currentTrack?.id)
  const { favourite, toggle: toggleFavourite } = useFavourite(currentTrack?.id, currentTrack?.favourite)
  const peaks = currentTrack?.peaks || peaksData?.peaks

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="music"
          title="Nothing playing"
          description="Choose a song from your library or search to start playback"
          action={<Link to="/home" className="btn btn-acc">Go to Home</Link>}
        />
      </div>
    )
  }

  const durationMs = currentTrack.durationMs || 1
  const positionRatio = state.positionMs / durationMs

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-6 relative overflow-hidden">
      <div className="ambient" aria-hidden>
        <i className={cn(isOffline ? 'bg-gold' : 'bg-acc', 'w-[600px] h-[600px] -top-[200px] -left-[100px] opacity-[0.18]')} />
        <i className="bg-s2 w-[400px] h-[400px] -bottom-[100px] -right-[100px]" />
      </div>

      <div className="flex flex-col items-center gap-6 relative w-full max-w-[480px]">
        <motion.div layoutId="now-playing-artwork" className="relative">
          <Artwork
            src={currentTrack.thumbnail || `/api/v1/tracks/${currentTrack.id}/artwork?size=640`}
            alt={currentTrack.title}
            variant="a1"
            size={300}
            radius="xl"
            rings
            className="shadow-e4"
          />
        </motion.div>

        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col grow min-w-0">
              <span className="text-display-m text-t1 truncate">{currentTrack.title}</span>
              <span className="text-h2 text-t2">{currentTrack.artist}</span>
            </div>
            <IconButton
              icon="heart"
              label={favourite ? 'Remove from favourites' : 'Add to favourites'}
              size={40}
              active={favourite}
              onClick={toggleFavourite}
            />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <SourceGlyph source={currentTrack.source} />
            <span className="text-label-s text-t3">
              {currentTrack.codec && `${currentTrack.codec} · `}
              {currentTrack.bitrateKbps && `${currentTrack.bitrateKbps} kbps`}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          <Waveform
            peaks={peaks}
            barCount={150}
            positionRatio={positionRatio}
            offline={isOffline}
          />
          <div className="flex items-center justify-between">
            <span className="text-mono-s text-t2">{formatDuration(state.positionMs)}</span>
            <span className="text-mono-s text-t3">{formatDuration(currentTrack.durationMs)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 w-full">
          <IconButton icon="shuffle" label="Shuffle" size={32} active={state.shuffle} />
          <IconButton icon="skip-back" label="Previous track" size={40} />
          <button
            className={cn('playbtn', isOffline ? 'bg-gold shadow-glow-g' : 'bg-acc shadow-glow-s')}
            aria-label="Pause"
          >
            <Icon name="pause" size={24} />
          </button>
          <IconButton icon="skip-forward" label="Next track" size={40} />
          <IconButton icon={state.repeat === 'one' ? 'repeat-one' : 'repeat'} label="Repeat" size={32} active={state.repeat !== 'off'} />
        </div>

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 flex-none w-[96px]">
            <Icon name="volume" size={14} className="text-t3 flex-none" />
            <Slider value={62} className="w-full" />
          </div>
          <div className="flex items-center gap-1">
            <Link to="/lyrics" className="ib ib-32" aria-label="Lyrics"><Icon name="music4" size={16} /></Link>
            <Link to="/queue" className="ib ib-32" aria-label="Queue"><Icon name="list" size={16} /></Link>
          </div>
        </div>
      </div>
    </div>
  )
}
