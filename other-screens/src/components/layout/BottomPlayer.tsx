import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'
import { useModeStore } from '../../store/modeStore'
import { usePlayerStore } from '../../store/playerStore'
import { usePeaks } from '../../data/hooks'
import { useFavourite } from '../../data/favourites'
import Icon from '../ui/Icon'
import { IconButton } from '../ui/Button'
import { Slider } from '../ui/Slider'
import { SourceGlyph } from '../ui/SourceGlyph'
import Artwork, { trackArtwork } from '../music/Artwork'
import Waveform from '../music/Waveform'
import { formatDuration } from '../../lib/utils'
import * as player from '../../data/player'

export default function BottomPlayer() {
  const { mode } = useModeStore()
  const {
    state,
    currentTrack,
    isPlaying,
    isLoading,
    durationMs,
    playbackError,
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
  const peaks = currentTrack?.peaks || peaksData?.peaks
  const { favourite, toggle: toggleFavourite } = useFavourite(currentTrack?.id, currentTrack?.favourite)

  if (!currentTrack) {
    return (
      <footer className="dplayer">
        <div className="flex items-center gap-3 flex-none w-[290px] opacity-40">
          <Artwork variant="a1" size={56} radius="sm" />
          <span className="flex flex-col grow gap-[3px] min-w-0">
            <span className="text-title-m text-t3 truncate">Nothing playing</span>
            <span className="text-body-s text-t4 truncate">Select a track to start</span>
          </span>
        </div>

        <div className="flex flex-col grow gap-1 max-w-[560px] opacity-40">
          <div className="flex items-center justify-center gap-3.5">
            <IconButton icon="shuffle" label="Shuffle" size={32} disabled />
            <IconButton icon="skip-back" label="Previous track" size={32} disabled />
            <button className={cn('playbtn playbtn-40', isOffline ? 'bg-gold' : 'bg-acc')} aria-label="Play" disabled>
              <Icon name="play" size={18} />
            </button>
            <IconButton icon="skip-forward" label="Next track" size={32} disabled />
            <IconButton icon="repeat" label="Repeat" size={32} disabled />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-mono-s text-t3 flex-none">0:00</span>
            <div className="grow h-6 bg-s2/40 rounded-sm" />
            <span className="text-mono-s text-t3 flex-none">0:00</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-none w-[290px] justify-end opacity-60">
          <Link to="/queue" className="ib ib-32" aria-label="Queue"><Icon name="list" size={16} /></Link>
          <Link to="/equalizer" className="ib ib-32" aria-label="Equalizer"><Icon name="sliders" size={16} /></Link>
        </div>
      </footer>
    )
  }

  // Prefer the decoded duration from the audio element; fall back to the catalog value
  // before the stream has loaded its metadata.
  const effectiveDurationMs = durationMs || currentTrack.durationMs || 1
  const positionRatio = state.positionMs / effectiveDurationMs

  return (
    <footer className="dplayer">
      <Link
        to="/now-playing"
        className="flex items-center gap-3 flex-none no-underline text-inherit w-[290px]"
        aria-label="Open now playing"
      >
        <motion.div layoutId="now-playing-artwork">
          <Artwork
            src={trackArtwork(currentTrack, 64)}
            alt={currentTrack.title}
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
          {playbackError ? (
            <span className="text-body-s text-red truncate" role="alert">{playbackError}</span>
          ) : (
            <span className="text-body-s text-t2 truncate">{currentTrack.artist}</span>
          )}
        </span>
      </Link>
      {playbackError && (
        <IconButton icon="sync" label="Retry playback" size={32} onClick={() => void player.retry()} />
      )}

      <IconButton
        icon="heart"
        label={favourite ? 'Remove from favourites' : 'Add to favourites'}
        size={32}
        active={favourite}
        onClick={toggleFavourite}
      />

      <div className="flex flex-col grow gap-1 max-w-[560px]">
        <div className="flex items-center justify-center gap-3.5">
          <IconButton
            icon="shuffle"
            label={state.shuffle ? 'Shuffle on' : 'Shuffle off'}
            size={32}
            active={state.shuffle}
            onClick={toggleShuffle}
          />
          <IconButton icon="skip-back" label="Previous track" size={32} onClick={previous} />
          <button
            className={cn('playbtn playbtn-40', isOffline ? 'bg-gold shadow-glow-g' : 'bg-acc shadow-glow-s')}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={togglePlay}
            disabled={isLoading}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
          </button>
          <IconButton icon="skip-forward" label="Next track" size={32} onClick={next} />
          <IconButton
            icon={state.repeat === 'one' ? 'repeat-one' : 'repeat'}
            label={
              state.repeat === 'one' ? 'Repeat one' : state.repeat === 'all' ? 'Repeat all' : 'Repeat off'
            }
            size={32}
            active={state.repeat !== 'off'}
            onClick={cycleRepeat}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-mono-s text-t2 flex-none">{formatDuration(state.positionMs)}</span>
          <Waveform
            peaks={peaks}
            barCount={120}
            positionRatio={positionRatio}
            durationMs={effectiveDurationMs}
            offline={isOffline}
            className="wave-sm"
            onSeek={seekRatio}
          />
          <span className="text-mono-s text-t3 flex-none">{formatDuration(effectiveDurationMs)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-none w-[290px] justify-end">
        <Link to="/lyrics" className="ib ib-32" aria-label="Lyrics" title="Lyrics">
          <Icon name="lyrics" size={16} />
        </Link>
        <Link to="/queue" className="ib ib-32" aria-label="Queue" title="Queue">
          <Icon name="list" size={16} />
        </Link>
        <Link to="/equalizer" className="ib ib-32" aria-label="Equalizer" title="Equalizer">
          <Icon name="sliders" size={16} />
        </Link>
        <div className="flex items-center gap-1.5 flex-none w-28">
          <button
            className={cn('ib ib-28 flex-none', volume === 0 ? 'text-t4' : 'text-t3')}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
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
        <Link to="/now-playing" className="ib ib-32" aria-label="Full screen player" title="Full screen player">
          <Icon name="minimize" size={16} />
        </Link>
      </div>
    </footer>
  )
}
