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
    playTrack,
  } = usePlayerStore()
  const isOffline = mode === 'offline'

  const { data: peaksData } = usePeaks(currentTrack?.id)
  const { favourite, toggle: toggleFavourite } = useFavourite(currentTrack?.id, currentTrack?.favourite)
  const peaks = currentTrack?.peaks || peaksData?.peaks

  if (!currentTrack) {
    return (
      <div className="@container flex items-center justify-center h-full p-8">
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
  const remainingMs = Math.max(0, durationMs - state.positionMs)

  // Next 4 upcoming tracks from queue
  const currentIndex = state.index >= 0 ? state.index : 0
  const upcomingQueue = state.queue.slice(currentIndex + 1, currentIndex + 5)

  // Eyebrow source
  const sourceEyebrow = currentTrack.album ? (
    <span className="flex flex-col items-center justify-center gap-0.5 min-w-0">
      <span className="text-overline text-t3 uppercase tracking-wider">PLAYING FROM ALBUM</span>
      <span className="text-label-m text-t1 truncate max-w-[200px] @sm:max-w-[320px] font-medium">{currentTrack.album}</span>
    </span>
  ) : null

  // Codec/bitrate/origin metadata
  const metaParts: string[] = []
  if (currentTrack.codec) metaParts.push(currentTrack.codec)
  if (currentTrack.bitrateKbps) metaParts.push(`${currentTrack.bitrateKbps} kbps`)
  if (currentTrack.source === 'local') {
    if (currentTrack.localPath) {
      const parts = currentTrack.localPath.split('/')
      parts.pop() // filename
      const folder = parts.slice(-2).join('/')
      if (folder) metaParts.push(`/${folder}`)
    }
  }

  return (
    <div className="@container relative w-full h-full min-h-full overflow-y-auto @3xl:overflow-hidden bg-bg text-t1 flex flex-col justify-between select-none">
      {/* Ambient glowing background */}
      <div className="ambient pointer-events-none" aria-hidden>
        <i
          className={cn(
            isOffline ? 'bg-gold' : 'bg-[#2A5AA8]',
            'w-[400px] h-[400px] @3xl:w-[700px] @3xl:h-[700px] -top-[120px] @3xl:-top-[200px] -left-[100px] @3xl:-left-[180px]'
          )}
          style={{ opacity: isOffline ? 0.18 : 0.45 }}
        />
        <i
          className={cn(
            isOffline ? 'bg-[#A86B25]' : 'bg-[#0F7A5E]',
            'w-[350px] h-[350px] @3xl:w-[560px] @3xl:h-[560px] top-[100px] @3xl:top-[140px] -right-[100px] @3xl:-right-[140px]'
          )}
          style={{ opacity: isOffline ? 0.2 : 0.4 }}
        />
        <i
          className="bg-[#6B3FA0] w-[300px] h-[300px] @3xl:w-[460px] @3xl:h-[460px] bottom-[10px] @3xl:top-[440px] left-[50px] @3xl:left-[480px]"
          style={{ opacity: 0.25 }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between flex-none h-14 @3xl:h-16 px-4 @3xl:px-7">
        <button
          onClick={exit}
          className="flex items-center gap-2 text-t2 hover:text-t1 transition-colors text-label-m cursor-pointer group"
          aria-label="Back"
        >
          <Icon name="chevron-down" size={18} className="rotate-90 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden @sm:inline">Back</span>
        </button>

        {sourceEyebrow}

        <div className="flex items-center gap-2 flex-none">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-full text-label-s font-semibold',
              isOffline ? 'bg-goldbg text-gold' : 'bg-accbg text-acc'
            )}
          >
            <Icon name={isOffline ? 'smartphone' : 'cloud'} size={12} />
            <span className="tracking-wide">{isOffline ? 'OFFLINE' : 'ONLINE'}</span>
          </span>
          <button
            onClick={exit}
            className="ib ib-32 text-t2 hover:text-t1 hover:bg-s3 rounded-full flex items-center justify-center transition-colors"
            aria-label="Exit full screen"
            data-tip="Exit full screen"
            data-tip-kbd="Esc"
          >
            <Icon name="minimize" size={16} />
          </button>
        </div>
      </header>

      {/* Main content body */}
      <div className="relative z-10 flex-1 flex flex-col @3xl:flex-row @3xl:items-center justify-center px-6 @3xl:px-14 py-4 @3xl:py-6 gap-8 @3xl:gap-14 max-w-[1280px] mx-auto w-full">
        {/* Artwork Column */}
        <div className="flex flex-col items-center justify-center flex-none w-full @3xl:w-auto">
          <motion.div layoutId="now-playing-artwork" className="relative flex items-center justify-center">
            <Artwork
              src={trackArtwork(currentTrack, 640)}
              alt={currentTrack.title}
              variant="a1"
              radius="xl"
              rings
              className={cn(
                'w-[280px] h-[280px] @sm:w-[320px] @sm:h-[320px] @xl:w-[380px] @xl:h-[380px] @3xl:w-[400px] @3xl:h-[400px] @5xl:w-[440px] @5xl:h-[440px]',
                'shadow-e4 transition-all duration-300'
              )}
            />
          </motion.div>
        </div>

        {/* Right Info/Controls/Queue Column */}
        <div className="flex flex-col gap-5 @3xl:gap-5 min-w-0 flex-1 w-full max-w-[620px] mx-auto @3xl:mx-0">
          {/* Track Details */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <h1 className="text-h1 @sm:text-display-m @3xl:text-display-l text-t1 font-bold tracking-tight truncate">
                  {currentTrack.title}
                </h1>
                {currentTrack.artistId ? (
                  <Link
                    to={`/artist/${currentTrack.artistId}`}
                    className="text-h3 @3xl:text-h2 text-t2 hover:text-t1 transition-colors truncate w-fit"
                  >
                    {currentTrack.artist}
                  </Link>
                ) : (
                  <span className="text-h3 @3xl:text-h2 text-t2 truncate">{currentTrack.artist}</span>
                )}
              </div>
            </div>

            {/* Error state if any */}
            {playbackError && (
              <div className="flex items-center gap-2 mt-1" role="alert">
                <span className="text-body-m text-red">{playbackError}</span>
                <button className="btn btn-out btn-sm" onClick={() => void player.retry()}>
                  Retry
                </button>
              </div>
            )}

            {/* Badges & Codec */}
            <div className="flex items-center gap-2.5 mt-1 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-label-s font-semibold flex-none',
                  currentTrack.source === 'local' ? 'bg-goldbg text-gold' : 'bg-accbg text-acc'
                )}
              >
                <Icon name={currentTrack.source === 'local' ? 'smartphone' : 'cloud'} size={12} />
                <span>{currentTrack.source === 'local' ? 'ON DEVICE' : 'STREAMING'}</span>
              </span>
              {metaParts.length > 0 && (
                <span className="text-mono-s text-t3 truncate">{metaParts.join(' · ')}</span>
              )}
            </div>
          </div>

          {/* Waveform seek rail */}
          <div className="flex flex-col gap-2 w-full">
            <Waveform
              peaks={peaks}
              barCount={150}
              positionRatio={positionRatio}
              durationMs={durationMs}
              offline={isOffline}
              onSeek={seekRatio}
              className="h-9 @3xl:h-10"
            />
            <div className="flex items-center justify-between text-mono-s @3xl:text-mono-m">
              <span className="text-t2">{formatDuration(state.positionMs)}</span>
              <span className="text-t3">-{formatDuration(remainingMs)}</span>
            </div>
          </div>

          {/* Transport Row */}
          <div className="flex items-center justify-between @3xl:justify-start gap-2 @sm:gap-4 @3xl:gap-4.5 flex-wrap">
            <IconButton
              icon="shuffle"
              label={state.shuffle ? 'Shuffle on' : 'Shuffle off'}
              size={40}
              active={state.shuffle}
              onClick={toggleShuffle}
              className={state.shuffle ? (isOffline ? 'text-gold' : 'text-acc') : 'text-t2'}
            />
            <IconButton
              icon="skip-back"
              label="Previous track"
              kbd="←←"
              size={44}
              onClick={previous}
              className="text-t1"
            />
            <button
              className={cn(
                'playbtn playbtn-56 flex-none transition-transform active:scale-95',
                isOffline ? 'bg-gold text-black shadow-glow-g' : 'bg-acc text-black shadow-glow-s'
              )}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              data-tip={isPlaying ? 'Pause' : 'Play'}
              data-tip-kbd="Space"
              onClick={togglePlay}
              disabled={isLoading}
            >
              <Icon
                name={isLoading ? 'loader' : isPlaying ? 'pause' : 'play'}
                size={26}
                className={cn(isLoading && 'animate-spin')}
              />
            </button>
            <IconButton
              icon="skip-forward"
              label="Next track"
              kbd="→→"
              size={44}
              onClick={next}
              className="text-t1"
            />
            <IconButton
              icon={state.repeat === 'one' ? 'repeat-one' : 'repeat'}
              label={
                state.repeat === 'one'
                  ? 'Repeat one'
                  : state.repeat === 'all'
                  ? 'Repeat all'
                  : 'Repeat off'
              }
              size={40}
              active={state.repeat !== 'off'}
              onClick={cycleRepeat}
              className={state.repeat !== 'off' ? (isOffline ? 'text-gold' : 'text-acc') : 'text-t2'}
            />

            <span className="hidden @sm:block w-px h-6 bg-ln2 mx-1 flex-none" />

            <IconButton
              icon="heart"
              label={favourite ? 'Remove from favourites' : 'Add to favourites'}
              size={40}
              active={favourite}
              onClick={toggleFavourite}
              className={favourite ? (isOffline ? 'text-gold' : 'text-acc') : 'text-t2'}
            />
            <Link
              to="/lyrics"
              className="ib ib-40 flex items-center justify-center text-t2 hover:text-t1 hover:bg-s3 rounded-full transition-colors"
              aria-label="Lyrics"
              data-tip="Lyrics"
            >
              <Icon name="lyrics" size={20} />
            </Link>
            <Link
              to="/equalizer"
              className="ib ib-40 flex items-center justify-center text-t2 hover:text-t1 hover:bg-s3 rounded-full transition-colors"
              aria-label="Equalizer"
              data-tip="Equalizer"
            >
              <Icon name="sliders" size={20} />
            </Link>

            {/* Volume */}
            <div className="hidden @md:flex items-center gap-2 flex-none w-[110px] @3xl:w-[130px] ml-auto @3xl:ml-2">
              <button
                className="ib ib-28 flex-none text-t2 hover:text-t1"
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                data-tip={volume === 0 ? 'Unmute' : 'Mute'}
                onClick={toggleMute}
              >
                <Icon name={volume === 0 ? 'mute' : 'volume'} size={16} />
              </button>
              <Slider
                value={volume * 100}
                variant={isOffline ? 'gold' : 'acc'}
                ariaLabel="Volume"
                onChange={v => setVolume(v / 100)}
                className="w-full"
              />
            </div>
          </div>

          {/* UP NEXT Section (hidden on mobile single column if small, or displayed nicely) */}
          {upcomingQueue.length > 0 && (
            <div className="flex flex-col gap-2.5 mt-2 pt-2 border-t border-ln/60">
              <div className="flex items-center justify-between">
                <span className="text-overline text-t3 uppercase font-semibold tracking-wider">UP NEXT</span>
                <Link to="/queue" className="text-label-s text-t2 hover:text-t1 transition-colors">
                  Open queue
                </Link>
              </div>

              <div className="flex flex-col gap-1">
                {upcomingQueue.map((track, i) => (
                  <div
                    key={track.id || i}
                    onClick={() => playTrack(track)}
                    className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-s2/80 transition-colors cursor-pointer group"
                  >
                    <Artwork
                      src={trackArtwork(track, 64)}
                      alt={track.title}
                      variant="a1"
                      size={34}
                      radius="sm"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-label-m text-t1 truncate group-hover:text-acc transition-colors font-medium">
                          {track.title}
                        </span>
                        <SourceGlyph source={track.source} />
                      </div>
                      <span className="text-label-s text-t3 truncate">{track.artist}</span>
                    </div>
                    {track.durationMs && (
                      <span className="text-mono-s text-t3 flex-none pr-1">
                        {formatDuration(track.durationMs)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="h-4 flex-none" />
    </div>
  )
}

