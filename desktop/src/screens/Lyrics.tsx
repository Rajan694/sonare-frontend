import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/playerContext';
import { usePlaybackPosition } from '../store/playbackPosition';
import { useModeStore } from '../store/modeContext';
import { showToast } from '../store/toasts';
import { useAsync, useLyrics } from '../api/hooks';
import { patchCachedOffset } from '../api/lyricsAvailability';
import { localLibrary } from '../storage/local';
import { ApiError, api, loadErrorMessage } from '../api/api';
import { requireAccount } from '../api/accountGate';
import { isAuthenticated } from '../api/auth';
import Artwork, { trackArtwork } from '../components/music/Artwork';
import Button, { IconButton } from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { Switch } from '../components/ui/Switch';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/cn';
import { formatDuration } from '../lib/format';

const OFFSET_STEP_MS = 250;
/** Earlier / Later move the lyrics at once; the new offset is saved this long after the last tap. */
const OFFSET_SAVE_DELAY_MS = 600;
const AUTOSCROLL_KEY = 'sonare_lyrics_autoscroll';

const PROVIDERS: Record<string, string> = { lrclib: 'LRCLIB', tags: 'File tags' };

const readAutoScroll = (): boolean => {
  try {
    return localStorage.getItem(AUTOSCROLL_KEY) !== 'false';
  } catch {
    return true;
  }
};

/**
 * The timing change a guest tried before being sent to sign in. The gate runs its action while
 * this screen is still unmounted, so the action only records the intent and the screen carries
 * it out once it's back with the lyrics loaded.
 */
let resumeAfterSignIn: { delta: number } | null = null;

type PendingOffset = { trackId: string; offsetMs: number; local: boolean };

const saveOffset = ({ trackId, offsetMs, local }: PendingOffset) => {
  if (!local) patchCachedOffset(trackId, offsetMs);
  const save = local ? localLibrary.setLyricsOffset(trackId, offsetMs) : api.updateLyricsOffset(trackId, offsetMs);
  void save.catch(() => {
    showToast({ title: 'Could not save lyric offset', icon: 'info' });
  });
};

const Lyrics = () => {
  const navigate = useNavigate();
  const exit = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/now-playing'));
  const { currentTrack, seek } = usePlayerStore();
  const positionMs = usePlaybackPosition();
  const { mode } = useModeStore();
  const isOffline = mode === 'offline';

  // Local files bring their own lyrics (a sidecar .lrc); the server only knows catalog tracks.
  const isLocal = currentTrack?.source === 'local';
  const server = useLyrics(currentTrack);
  const local = useAsync(() => localLibrary.lyrics(currentTrack!.id), [currentTrack?.id], { enabled: !!isLocal });
  const { data: lyricsData, loading, refetch } = isLocal ? local : server;
  const lines = lyricsData?.lines || currentTrack?.lyrics?.lines || [];
  const synced = lyricsData?.synced ?? currentTrack?.lyrics?.synced ?? lines.length > 0;

  // Positive offset shows each line later; negative, earlier.
  const [offsetMs, setOffsetMs] = useState(0);
  const [autoScroll, setAutoScroll] = useState(readAutoScroll);
  // Synced lyrics can also be read as plain text, without timestamps or the moving highlight.
  const [view, setView] = useState<'synced' | 'plain'>('synced');
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // One save per burst of taps, so saves can't land out of order; one still waiting when the
  // screen closes goes out then.
  const pendingOffset = useRef<PendingOffset | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushOffset = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const pending = pendingOffset.current;
    pendingOffset.current = null;
    if (pending) saveOffset(pending);
  };
  useEffect(() => flushOffset, []);

  useEffect(() => {
    setOffsetMs(lyricsData?.offsetMs ?? currentTrack?.lyrics?.offsetMs ?? 0);
  }, [lyricsData, currentTrack?.id]);

  const showSynced = synced && lines.length > 0 && view === 'synced';
  const position = positionMs - offsetMs;
  const activeLineIndex = showSynced
    ? lines.findIndex((line, i) => {
        const next = lines[i + 1];
        return position >= line.atMs && (!next || position < next.atMs);
      })
    : -1;

  useEffect(() => {
    if (!showSynced || !autoScroll || activeLineIndex < 0) return;
    lineRefs.current[activeLineIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLineIndex, autoScroll, showSynced]);

  // Back from signing in: finish what the guest started, once the lyrics have loaded.
  const resumeRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!resumeAfterSignIn || loading || !isAuthenticated()) return;
    resumeRef.current();
  }, [loading, currentTrack?.id]);

  if (!currentTrack) {
    return (
      <div className="@container flex items-center justify-center h-full p-8">
        <EmptyState
          icon="lyrics"
          title="No track selected"
          description="Start playing a song to view lyrics"
          action={
            <Link to="/home" className="btn btn-acc">
              Go to Home
            </Link>
          }
        />
      </div>
    );
  }

  const trackId = currentTrack.id;
  const plainText = lyricsData?.plain ?? (lines.length > 0 ? lines.map((l) => l.text).join('\n') : '');
  const hasLyrics = lines.length > 0 || !!plainText;
  // A 404 is "no lyrics"; anything else (LRCLIB down, server unreachable) is worth a retry.
  const loadError =
    !isLocal && !hasLyrics && server.error && !(server.error instanceof ApiError && server.error.status === 404)
      ? server.error
      : null;
  const source =
    lyricsData?.provider === 'lrc'
      ? `${(currentTrack.localPath?.split(/[\\/]/).pop() ?? currentTrack.title).replace(/\.[^.]+$/, '')}.lrc`
      : lyricsData?.provider && PROVIDERS[lyricsData.provider];

  // Server lyrics are saved to the account; a guest signs in first and then carries on here.
  const needsAccount = !isLocal && !isAuthenticated();
  const changeOffset = (delta: number) => {
    if (needsAccount) {
      return requireAccount('Create a free account to fix the timing of lyrics.', () => {
        resumeAfterSignIn = { delta };
      });
    }
    const next = offsetMs + delta;
    setOffsetMs(next);
    // Another song's pending save goes out first.
    if (pendingOffset.current && pendingOffset.current.trackId !== trackId) flushOffset();
    pendingOffset.current = { trackId, offsetMs: next, local: !!isLocal };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushOffset, OFFSET_SAVE_DELAY_MS);
  };

  const toggleAutoScroll = (on: boolean) => {
    setAutoScroll(on);
    try {
      localStorage.setItem(AUTOSCROLL_KEY, String(on));
    } catch {
      // Preference just won't persist.
    }
  };

  resumeRef.current = () => {
    const resume = resumeAfterSignIn;
    resumeAfterSignIn = null;
    if (resume) changeOffset(resume.delta);
  };

  const glow = isOffline ? '0 0 30px rgba(255,194,77,.35)' : '0 0 30px rgba(0,226,138,.35)';

  return (
    <div className="@container relative flex flex-col w-full h-full overflow-hidden bg-bg text-t1 select-none">
      {/* Ambient background glow */}
      <div className="ambient pointer-events-none" aria-hidden>
        <i
          className={cn(
            isOffline ? 'bg-gold' : 'bg-[#2A5AA8]',
            'w-[400px] h-[400px] @3xl:w-[560px] @3xl:h-[560px] -top-[160px] @3xl:-top-[280px] -left-[100px] @3xl:-left-[180px]',
          )}
          style={{ opacity: isOffline ? 0.16 : 0.45 }}
        />
        <i
          className="bg-[#6B3FA0] w-[350px] h-[350px] @3xl:w-[420px] @3xl:h-[420px] -top-[80px] @3xl:-top-[100px] -right-[100px] @3xl:-right-[120px]"
          style={{ opacity: 0.3 }}
        />
      </div>

      {/* Mobile Top bar (< 3xl) */}
      <header className="relative z-10 flex @3xl:hidden items-center justify-between flex-none h-14 px-4 border-b border-ln bg-s0/40 backdrop-blur-md">
        <button
          onClick={exit}
          className="ib ib-32 text-t2 hover:text-t1 flex items-center justify-center"
          aria-label="Back"
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <span className="text-title-m font-semibold text-t1">Lyrics</span>
        <div className="w-8" />
      </header>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col @3xl:flex-row grow gap-6 @3xl:gap-10 px-5 @sm:px-8 @3xl:px-10 pt-4 @3xl:pt-8 pb-4 overflow-hidden">
        {/* Left Column: Artwork + Metadata + Actions */}
        <aside className="flex flex-col flex-none w-full @3xl:w-[300px] @4xl:w-[320px] gap-4 @3xl:gap-5 overflow-y-auto overflow-x-hidden">
          <div className="flex @3xl:flex-col items-center @3xl:items-start gap-4">
            <Artwork
              src={trackArtwork(currentTrack, 640)}
              alt={currentTrack.title}
              variant="a1"
              radius="lg"
              rings
              className="shadow-e4 flex-none w-16 h-16 @sm:w-20 @sm:h-20 @3xl:w-[300px] @3xl:h-[300px] rounded-lg @3xl:rounded-xl"
            />
            <div className="flex flex-col min-w-0 gap-1 grow">
              <span className="text-h3 @3xl:text-h2 font-semibold text-t1 truncate">{currentTrack.title}</span>
              <span className="text-body-s @3xl:text-body-m text-t2 truncate">
                {[currentTrack.artist, currentTrack.album].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>

          {hasLyrics && (
            <div className="flex flex-wrap items-center gap-2">
              {source && (
                <span className={cn('badge', isLocal ? 'bg-local' : 'bg-cloud')}>
                  <Icon name={isLocal ? 'smartphone' : 'cloud'} size={10} />
                  <span>{source}</span>
                </span>
              )}
              <span className="badge bg-neutral">{synced && lines.length > 0 ? 'Synced' : 'Plain text'}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {/* Sync offset control */}
            {synced && lines.length > 0 && (
              <div className="flex items-center justify-between gap-2 h-8.5 pl-3.5 pr-1 rounded-full border border-ln2 bg-s1/60">
                <span className="text-label-s font-semibold text-t1 flex items-center gap-1.5">
                  <span>Offset</span>
                  <span className="text-mono-s text-t3">
                    {offsetMs > 0 ? '+' : offsetMs < 0 ? '−' : ''}
                    {(Math.abs(offsetMs) / 1000).toFixed(1)}s
                  </span>
                </span>
                <span className="flex items-center gap-0.5">
                  <IconButton
                    icon="minus"
                    label="Show lyrics earlier"
                    size={28}
                    onClick={() => changeOffset(-OFFSET_STEP_MS)}
                  />
                  <IconButton
                    icon="plus"
                    label="Show lyrics later"
                    size={28}
                    onClick={() => changeOffset(OFFSET_STEP_MS)}
                  />
                </span>
              </div>
            )}
          </div>

          {/* Only timed lyrics can follow playback. */}
          {synced && lines.length > 0 && (
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-body-m text-t1">Auto-scroll</span>
              <Switch checked={autoScroll} onCheckedChange={toggleAutoScroll} aria-label="Toggle auto-scroll" />
            </label>
          )}
        </aside>

        {/* Right Column: Lyrics Viewport & Chips */}
        <section className="flex flex-col grow gap-4 @3xl:gap-5 min-w-0 overflow-hidden" aria-label="Lyrics">
          {hasLyrics && (
            <div className="flex items-center justify-between gap-2 flex-none shrink-0 min-h-8">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap shrink-0">
                <button
                  className={cn(
                    'chip chip-sm flex-none shrink-0 h-8 whitespace-nowrap inline-flex items-center',
                    showSynced && 'chip-on',
                  )}
                  disabled={!synced || lines.length === 0}
                  onClick={() => setView('synced')}
                >
                  <Icon name="sync" size={13} />
                  <span>Synced</span>
                </button>
                <button
                  className={cn(
                    'chip chip-sm flex-none shrink-0 h-8 whitespace-nowrap inline-flex items-center',
                    !showSynced && 'chip-on',
                  )}
                  onClick={() => setView('plain')}
                >
                  <span>Plain text</span>
                </button>
                {synced && lines.length > 0 && (
                  <span className="chip chip-sm text-t3 flex-none shrink-0 h-8 whitespace-nowrap inline-flex items-center">
                    <Icon name="clock" size={13} />
                    <span>
                      Offset {offsetMs > 0 ? '+' : offsetMs < 0 ? '−' : ''}
                      {(Math.abs(offsetMs) / 1000).toFixed(1)}s
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col grow overflow-y-auto pr-2 @3xl:pr-6 pb-12">
            {loading ? (
              <div className="flex flex-col gap-6 animate-pulse pt-4">
                <div className="h-8 bg-s2/40 rounded w-3/4" />
                <div className="h-8 bg-s2/40 rounded w-1/2" />
                <div className="h-8 bg-s2/40 rounded w-2/3" />
                <div className="h-8 bg-s2/40 rounded w-3/5" />
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center gap-3 grow text-center py-16" role="alert">
                <Icon name="lyrics" size={36} className="text-t4" />
                <span className="text-title-l text-t2 font-semibold">Couldn't load lyrics</span>
                <span className="text-body-s text-t3">{loadErrorMessage(loadError)}</span>
                <Button variant="out" onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            ) : showSynced ? (
              <div className="flex flex-col gap-4 @3xl:gap-5 pt-2">
                {lines.map((line, i) => {
                  const isActive = i === activeLineIndex;
                  return (
                    <button
                      key={i}
                      ref={(el) => {
                        lineRefs.current[i] = el;
                      }}
                      className="flex items-start gap-3.5 @3xl:gap-4 text-left bg-transparent border-0 p-0 cursor-pointer group"
                      aria-current={isActive}
                      data-tip={`Jump to ${formatDuration(line.atMs + offsetMs)}`}
                      onClick={() => seek(Math.max(0, line.atMs + offsetMs))}
                    >
                      <span
                        className={cn(
                          'text-mono-s @3xl:text-mono-m w-9 pt-1.5 flex-none font-medium',
                          isActive ? (isOffline ? 'text-gold' : 'text-acc') : 'text-t4',
                        )}
                      >
                        {formatDuration(line.atMs + offsetMs)}
                      </span>
                      <span
                        className={cn(
                          'text-h2 @sm:text-display-m @3xl:text-display-m font-bold leading-tight transition-all duration-300',
                          isActive
                            ? 'text-t1 opacity-100 scale-[1.01] origin-left'
                            : 'text-t3 opacity-[0.42] group-hover:opacity-75',
                        )}
                        style={isActive ? { textShadow: glow } : undefined}
                      >
                        {line.text || '♪'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : plainText ? (
              <p className="text-h2 text-t2 whitespace-pre-line leading-[1.7] pt-2">{plainText}</p>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 grow text-center py-16">
                <Icon name="lyrics" size={36} className="text-t4" />
                <span className="text-title-l text-t2 font-semibold">No lyrics available for this track</span>
                <span className="text-body-s text-t3">
                  {isLocal
                    ? 'Put an .lrc file with the same name next to the song to see its lyrics here.'
                    : 'LRCLIB, where lyrics come from, has none for this song yet.'}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
export default Lyrics;
