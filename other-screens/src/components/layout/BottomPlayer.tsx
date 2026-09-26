import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useModeStore } from '../../store/modeStore';
import { usePlayerStore } from '../../store/playerStore';
import { usePeaks } from '../../data/hooks';
import { useFavourite } from '../../data/favourites';
import Icon from '../ui/Icon';
import { IconButton } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SourceGlyph } from '../ui/SourceGlyph';
import Artwork, { trackArtwork } from '../music/Artwork';
import Waveform from '../music/Waveform';
import { formatDuration } from '../../lib/utils';
import * as player from '../../data/player';

export default function BottomPlayer() {
  const { mode } = useModeStore();
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
  } = usePlayerStore();
  const isOffline = mode === 'offline';

  const { data: peaksData } = usePeaks(currentTrack?.id);
  const peaks = currentTrack?.peaks || peaksData?.peaks;
  const { favourite, toggle: toggleFavourite } = useFavourite(currentTrack?.id, currentTrack?.favourite);

  if (!currentTrack) {
    return (
      <footer className="dplayer min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 flex-none w-[200px] lg:w-[250px] xl:w-[290px] min-w-0 opacity-40">
          <Artwork variant="a1" size={48} radius="sm" className="flex-none" />
          <span className="flex flex-col grow gap-[3px] min-w-0">
            <span className="text-title-m text-t3 truncate">Nothing playing</span>
            <span className="text-body-s text-t4 truncate">Select a track to start</span>
          </span>
        </div>

        <div className="flex flex-col grow gap-1 max-w-[560px] min-w-0 opacity-40">
          <div className="flex items-center justify-center gap-2 sm:gap-3.5">
            <IconButton icon="shuffle" label="Shuffle" size={28} disabled />
            <IconButton icon="skip-back" label="Previous track" size={32} disabled />
            <button className={cn('playbtn playbtn-40', isOffline ? 'bg-gold' : 'bg-acc')} aria-label="Play" data-tip="Play" data-tip-kbd="Space" disabled>
              <Icon name="play" size={18} />
            </button>
            <IconButton icon="skip-forward" label="Next track" size={32} disabled />
            <IconButton icon="repeat" label="Repeat" size={28} disabled />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-mono-s text-t3 flex-none">0:00</span>
            <div className="grow h-5 bg-s2/40 rounded-sm min-w-0" />
            <span className="text-mono-s text-t3 flex-none">0:00</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-none w-[200px] lg:w-[250px] xl:w-[290px] justify-end opacity-60">
          <Link to="/lyrics" className="ib ib-32 hidden sm:inline-flex" aria-label="Lyrics" data-tip="Lyrics">
            <Icon name="lyrics" size={16} />
          </Link>
          <Link to="/queue" className="ib ib-32" aria-label="Queue" data-tip="Queue" data-tip-kbd="Ctrl Q">
            <Icon name="list" size={16} />
          </Link>
          <Link to="/equalizer" className="ib ib-32 hidden md:inline-flex" aria-label="Equalizer" data-tip="Equalizer">
            <Icon name="sliders" size={16} />
          </Link>
          <Link to="/now-playing" className="ib ib-32" aria-label="Full screen player" data-tip="Full screen player">
            <Icon name="minimize" size={16} />
          </Link>
        </div>
      </footer>
    );
  }

  // Prefer the decoded duration from the audio element; fall back to the catalog value
  // before the stream has loaded its metadata.
  const effectiveDurationMs = durationMs || currentTrack.durationMs || 1;
  const positionRatio = state.positionMs / effectiveDurationMs;

  return (
    <footer className="dplayer min-w-0 overflow-hidden">
      <Link
        to="/now-playing"
        className="flex items-center gap-3 flex-none no-underline text-inherit w-[180px] sm:w-[220px] lg:w-[250px] xl:w-[290px] min-w-0"
        aria-label="Open now playing"
      >
        <motion.div layoutId="now-playing-artwork" className="flex-none">
          <Artwork
            src={trackArtwork(currentTrack, 64)}
            alt={currentTrack.title}
            variant="a1"
            size={48}
            radius="sm"
            rings
          />
        </motion.div>
        <span className="flex flex-col grow gap-0.5 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-label-l sm:text-title-m text-t1 truncate">{currentTrack.title}</span>
            <SourceGlyph source={currentTrack.source} />
          </span>
          {playbackError ? (
            <span className="text-label-s text-red truncate" role="alert">
              {playbackError}
            </span>
          ) : (
            <span className="text-label-s sm:text-body-s text-t2 truncate">{currentTrack.artist}</span>
          )}
        </span>
      </Link>
      {playbackError && <IconButton icon="sync" label="Retry playback" size={32} onClick={() => void player.retry()} />}

      <IconButton
        icon="heart"
        label={favourite ? 'Remove from favourites' : 'Add to favourites'}
        size={32}
        active={favourite}
        onClick={toggleFavourite}
        className="hidden sm:inline-flex flex-none"
      />

      <div className="flex flex-col grow gap-1 max-w-[520px] min-w-0">
        <div className="flex items-center justify-center gap-2 sm:gap-3.5">
          <IconButton
            icon="shuffle"
            label={state.shuffle ? 'Shuffle on' : 'Shuffle off'}
            size={28}
            active={state.shuffle}
            onClick={toggleShuffle}
          />
          <IconButton icon="skip-back" label="Previous track" kbd="←←" size={32} onClick={previous} />
          <button
            className={cn('playbtn playbtn-40 flex-none', isOffline ? 'bg-gold shadow-glow-g' : 'bg-acc shadow-glow-s')}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            data-tip={isPlaying ? 'Pause' : 'Play'}
            data-tip-kbd="Space"
            onClick={togglePlay}
            disabled={isLoading}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
          </button>
          <IconButton icon="skip-forward" label="Next track" kbd="→→" size={32} onClick={next} />
          <IconButton
            icon={state.repeat === 'one' ? 'repeat-one' : 'repeat'}
            label={state.repeat === 'one' ? 'Repeat one' : state.repeat === 'all' ? 'Repeat all' : 'Repeat off'}
            size={28}
            active={state.repeat !== 'off'}
            onClick={cycleRepeat}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="text-mono-s text-t2 flex-none">{formatDuration(state.positionMs)}</span>
          <div className="grow min-w-0 overflow-hidden flex items-center">
            <Waveform
              peaks={peaks}
              barCount={80}
              positionRatio={positionRatio}
              durationMs={effectiveDurationMs}
              offline={isOffline}
              className="wave-sm"
              onSeek={seekRatio}
            />
          </div>
          <span className="text-mono-s text-t3 flex-none">{formatDuration(effectiveDurationMs)}</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 flex-none w-[180px] sm:w-[220px] lg:w-[250px] xl:w-[290px] justify-end min-w-0">
        <Link to="/lyrics" className="ib ib-32" aria-label="Lyrics" data-tip="Lyrics">
          <Icon name="lyrics" size={16} />
        </Link>
        <Link to="/queue" className="ib ib-32" aria-label="Queue" data-tip="Queue" data-tip-kbd="Ctrl Q">
          <Icon name="list" size={16} />
        </Link>
        <Link to="/equalizer" className="ib ib-32 hidden md:inline-flex" aria-label="Equalizer" data-tip="Equalizer">
          <Icon name="sliders" size={16} />
        </Link>
        <div className="hidden lg:flex items-center gap-1.5 flex-none w-24 xl:w-28">
          <button
            className={cn('ib ib-28 flex-none', volume === 0 ? 'text-t4' : 'text-t3')}
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
            onChange={(v) => setVolume(v / 100)}
            className="w-full"
          />
        </div>
        <Link to="/now-playing" className="ib ib-32" aria-label="Full screen player" data-tip="Full screen player">
          <Icon name="minimize" size={16} />
        </Link>
      </div>
    </footer>
  );
}
