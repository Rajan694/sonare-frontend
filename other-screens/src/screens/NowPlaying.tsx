import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { usePeaks } from '../data/hooks'
import { useFavourite } from '../data/favourites'
import Artwork, { trackArtwork } from '../components/music/Artwork'
import Waveform from '../components/music/Waveform'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { SourceGlyph } from '../components/ui/SourceGlyph'
import { Slider } from '../components/ui/Slider'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDuration } from '../lib/utils'
import { cn } from '../lib/utils'
import * as player from '../data/player'

export default function NowPlaying() {
  const navigate = useNavigate()
  // Leave full screen: back where the user came from, or Home on a direct visit.
  const exit = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/home'))
  const { mode } = useModeStore()
  const {
    state,
    currentTrack,
    isPlaying,
    isLoading,
    playbackError,
    durationMs: liveDurationMs,
    togglePlay,
    seekRatio,
    next,
    previous,
    volume,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore()
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

  const durationMs = liveDurationMs || currentTrack.durationMs || 1
  const positionRatio = state.positionMs / durationMs

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-6 relative overflow-hidden">
      <IconButton
        icon="chevron-down"
        label="Exit full screen"
        kbd="Esc"
        aria-keyshortcuts="Escape"
        size={40}
        className="absolute top-5 left-5 z-10"
        onClick={exit}
      />
      {/* Inline opacity: `.ambient i` in sonare.css would outrank a utility class. */}
      <div className="ambient" aria-hidden>
        <i className={cn(isOffline ? 'bg-gold' : 'bg-acc', 'w-[600px] h-[600px] -top-[200px] -left-[100px]')} style={{ opacity: 0.18 }} />
        <i className="bg-s2 w-[400px] h-[400px] -bottom-[100px] -right-[100px]" />
      </div>

      <div className="flex flex-col items-center gap-6 relative w-full max-w-[480px]">
        <motion.div layoutId="now-playing-artwork" className="relative">
          <Artwork
            src={trackArtwork(currentTrack, 640)}
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
          {/* Full screen hides the bottom bar, so failures must show here too. */}
          {playbackError && (
            <div className="flex items-center gap-2 mt-1" role="alert">
              <span className="text-body-m text-red">{playbackError}</span>
              <button className="btn btn-out btn-sm" onClick={() => void player.retry()}>Retry</button>
            </div>
          )}
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
            durationMs={durationMs}
            offline={isOffline}
            onSeek={seekRatio}
          />
          <div className="flex items-center justify-between">
            <span className="text-mono-s text-t2">{formatDuration(state.positionMs)}</span>
            <span className="text-mono-s text-t3">{formatDuration(durationMs)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 w-full">
          <IconButton
            icon="shuffle"
            label={state.shuffle ? 'Shuffle on' : 'Shuffle off'}
            size={32}
            active={state.shuffle}
            onClick={toggleShuffle}
          />
          <IconButton icon="skip-back" label="Previous track" kbd="←←" size={40} onClick={previous} />
          <button
            className={cn('playbtn', isOffline ? 'bg-gold shadow-glow-g' : 'bg-acc shadow-glow-s')}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            data-tip={isPlaying ? 'Pause' : 'Play'}
            data-tip-kbd="Space"
            onClick={togglePlay}
            disabled={isLoading}
          >
            <Icon name={isLoading ? 'loader' : isPlaying ? 'pause' : 'play'} size={24} className={cn(isLoading && 'animate-spin')} />
          </button>
          <IconButton icon="skip-forward" label="Next track" kbd="→→" size={40} onClick={next} />
          <IconButton
            icon={state.repeat === 'one' ? 'repeat-one' : 'repeat'}
            label={state.repeat === 'one' ? 'Repeat one' : state.repeat === 'all' ? 'Repeat all' : 'Repeat off'}
            size={32}
            active={state.repeat !== 'off'}
            onClick={cycleRepeat}
          />
        </div>

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 flex-none w-[140px]">
            <button
              className="ib ib-28 flex-none"
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              data-tip={volume === 0 ? 'Unmute' : 'Mute'}
              onClick={toggleMute}
            >
              <Icon name={volume === 0 ? 'mute' : 'volume'} size={14} />
            </button>
            <Slider
              value={volume * 100}
              variant={isOffline ? 'gold' : 'acc'}
              ariaLabel="Volume"
              onChange={v => setVolume(v / 100)}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-1">
            <Link to="/lyrics" className="ib ib-32" aria-label="Lyrics" data-tip="Lyrics"><Icon name="lyrics" size={16} /></Link>
            <Link to="/queue" className="ib ib-32" aria-label="Queue" data-tip="Queue" data-tip-kbd="Ctrl Q"><Icon name="list" size={16} /></Link>
            <Link to="/equalizer" className="ib ib-32" aria-label="Equalizer" data-tip="Equalizer"><Icon name="sliders" size={16} /></Link>
          </div>
        </div>
      </div>
    </div>
  )
}
