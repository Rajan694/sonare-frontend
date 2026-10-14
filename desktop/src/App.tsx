import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Mode, Track } from './types';
import { CAPS } from './lib/caps';
import { hasInternet } from './lib/connectivity';
import { ModeContext } from './store/modeContext';
import { PlayerContext, defaultPlayerState, type PlayerStore } from './store/playerContext';
import { getPlaybackPosition, setPlaybackPosition } from './store/playbackPosition';
import type { PlayerState, PlayingFrom } from './types';
import * as queueOps from '../../shared/player/queue';
import { getCurrentUser, initDevAuth, onAuthChange } from './api/auth';
import { accountQueue, queueChanged, savedQueue, setQueueSource } from './storage/playerPersist';
import { bindMediaSession, showInMediaSession, showPositionInMediaSession } from './audio/mediaSession';
import type { SavedQueue } from '../../shared/player/savedQueue';
import * as player from './audio/player';
import { maybeRecordPlay, resetPlay } from './api/plays';
import { setSyncOnline, startBackgroundSync } from './api/sync';
import { loadSettings, updateSettings, useSettings } from './storage/settings';
import { showToast } from './store/toasts';
import { localLibrary } from './storage/local';
import { downloads } from './storage/downloads';
import AppShell from './components/layout/AppShell';
import Home from './screens/Home';
import Search from './screens/Search';
import Library from './screens/Library';
import Album from './screens/Album';
import Artist from './screens/Artist';
import PlaylistDetail from './screens/PlaylistDetail';
import Playlists from './screens/Playlists';
import NowPlaying from './screens/NowPlaying';
import Lyrics from './screens/Lyrics';
import Queue from './screens/Queue';
import Equalizer from './screens/Equalizer';
import ModeSwitch from './screens/ModeSwitch';
import Settings from './screens/Settings';
import Folders from './screens/Folders';
import Downloads from './screens/Downloads';
import SignIn from './screens/SignIn';
import ResetPassword from './screens/ResetPassword';
import VerifyEmail from './screens/VerifyEmail';
import './styles.css';
import './sonare.css';

// The web build's intro page at "/": its own chunk, so the music app doesn't load it.
const Landing = lazy(() => import('./screens/Landing'));

type Playback = Omit<player.PlaybackStatus, 'positionMs'>;

const withoutPosition = (s: player.PlaybackStatus): Playback => {
  const { trackId, playing, loading, durationMs, muxed, error, volume } = s;
  return { trackId, playing, loading, durationMs, muxed, error, volume };
};

const samePlayback = (a: Playback, b: player.PlaybackStatus): boolean => {
  return (
    a.trackId === b.trackId &&
    a.playing === b.playing &&
    a.loading === b.loading &&
    a.durationMs === b.durationMs &&
    a.muxed === b.muxed &&
    a.error === b.error &&
    a.volume === b.volume
  );
};

const App = () => {
  const [mode, setModeRaw] = useState<Mode>('online');
  const effectiveMode: Mode = CAPS.offlineMode ? mode : 'online';
  const { stayOffline } = useSettings();
  const stayOfflineRef = useRef(stayOffline);
  stayOfflineRef.current = stayOffline;
  // Track whether user explicitly changed mode in this session
  const userChangedMode = useRef(false);
  // Ensure connectivity check starts at most once per launch
  const launchCheckStarted = useRef(false);
  // Read inside queue updaters, which must not close over a stale mode.
  const modeRef = useRef<Mode>(effectiveMode);
  modeRef.current = effectiveMode;
  const setMode = (m: Mode) => {
    userChangedMode.current = true;
    if (!CAPS.offlineMode || m === mode) return;
    setModeRaw(m);
    if (m === 'online') {
      updateSettings({ stayOffline: false });
      showToast({ title: 'Connected to Sonare Online', icon: 'cloud', variant: 'acc' });
    } else {
      showToast({
        title: 'Switched to Offline Mode',
        description: 'Showing music on this device',
        icon: 'smartphone',
        variant: 'gold',
      });
    }
  };

  // "Stay offline until I switch back" survives restarts (FLOWS 1.1).
  useEffect(() => {
    if (CAPS.offlineMode && stayOffline) setModeRaw('offline');
  }, [stayOffline]);

  // Check internet connectivity once on launch for Neutralino window builds
  useEffect(() => {
    if (!CAPS.offlineMode || launchCheckStarted.current) return;
    launchCheckStarted.current = true;
    hasInternet().then((online) => {
      if (online || userChangedMode.current || stayOfflineRef.current) return;
      setModeRaw('offline');
      showToast({
        title: 'No internet connection',
        description: 'Switched to Offline Mode - showing music on this device',
        icon: 'smartphone',
        variant: 'gold',
      });
    });
  }, []);
  const [playerState, setPlayerState] = useState<PlayerState>(defaultPlayerState);
  const currentTrack: Track | null = playerState.queue[playerState.index] ?? null;

  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const playerStateRef = useRef(playerState);
  playerStateRef.current = playerState;
  /**
   * A queue brought back from the last session (or another device) waits, paused, until Play:
   * loading it at launch would fetch a stream (in the Linux window, the whole song) for nothing.
   */
  const resume = useRef<{ playId: number; id: string; positionMs: number } | null>(null);
  /** Something was played this launch: a queue saved elsewhere doesn't replace it any more. */
  const playedThisLaunch = useRef(false);
  /** When the queue shown was saved, to tell whether the account's copy is newer. */
  const queueSavedAt = useRef(0);
  const lastPositionSave = useRef(0);

  // Everything about playback except the position, which lives in store/playbackPosition so
  // a position tick doesn't re-render the app (see there).
  const [playback, setPlayback] = useState<Playback>(() => withoutPosition(player.getStatus()));
  /** When the current listen began — used to key a play so a replay counts again. */
  const playStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    initDevAuth();
    loadSettings();
    startBackgroundSync();
    // Picks up downloads that were running when the app last closed.
    void downloads.init();
  }, []);

  /** Put back a saved queue, paused at its position. */
  const restoreQueue = (saved: SavedQueue<Track>) => {
    const playId = playerStateRef.current.playId + 1;
    resume.current = { playId, id: saved.queue[saved.index].id, positionMs: saved.positionMs };
    queueSavedAt.current = saved.savedAt;
    setPlaybackPosition(saved.positionMs);
    setPlayerState((prev) => ({
      ...prev,
      queue: saved.queue,
      index: saved.index,
      shuffle: saved.shuffle,
      repeat: saved.repeat,
      playingFrom: saved.playingFrom,
      playId,
    }));
  };

  // The queue comes back after a restart; signed in, a newer one saved on another device
  // (start on the phone, carry on here) wins until something is played.
  useEffect(() => {
    setQueueSource(() => {
      const s = playerStateRef.current;
      if (!s.queue.length) return null;
      return {
        queue: s.queue,
        index: s.index,
        positionMs: resume.current?.positionMs ?? player.getStatus().positionMs,
        shuffle: s.shuffle,
        repeat: s.repeat,
        playingFrom: s.playingFrom,
        savedAt: Date.now(),
      };
    });
    const local = savedQueue();
    if (local) restoreQueue(local);
    const fromAccount = () =>
      void accountQueue().then((saved) => {
        if (saved && !playedThisLaunch.current && saved.savedAt > queueSavedAt.current) restoreQueue(saved);
      });
    if (getCurrentUser()) fromAccount();
    return onAuthChange((user) => {
      if (user) fromAccount();
    });
  }, []);

  // Lock screen, notification and media-key controls.
  useEffect(() => {
    return bindMediaSession({
      play: () => {
        if (!player.getStatus().playing) actionsRef.current.togglePlay();
      },
      pause: () => player.pause(),
      next: () => actionsRef.current.next(),
      previous: () => actionsRef.current.previous(),
      seekTo: (positionMs) => actionsRef.current.seek(positionMs),
    });
  }, []);

  useEffect(() => showInMediaSession(currentTrack, playback.playing), [currentTrack, playback.playing]);

  useEffect(() => {
    if (playerState.queue.length || queueSavedAt.current) queueChanged();
  }, [playerState]);

  // Plays held in Offline Mode upload in the background once the app is Online again.
  useEffect(() => setSyncOnline(effectiveMode === 'online'), [effectiveMode]);

  // Mirror the audio element's state: the position into its own store, the rest into React
  // only when something other than the position changed.
  useEffect(() => {
    return player.onPlaybackChange((s) => {
      // A restored queue shows its saved position until it plays.
      if (!resume.current) setPlaybackPosition(s.positionMs);
      showPositionInMediaSession(s.positionMs, s.durationMs);
      if (s.playing && Date.now() - lastPositionSave.current >= 5000) {
        lastPositionSave.current = Date.now();
        queueChanged();
      }
      setPlayback((prev) => (samePlayback(prev, s) ? prev : withoutPosition(s)));
      // Count the play once enough of the track has actually been heard.
      const track = currentTrackRef.current;
      if (track && s.playing) {
        maybeRecordPlay(track, playStartedAt.current, s.positionMs, s.durationMs || track.durationMs || 0);
      }
    });
  }, []);

  // Load and play whenever another queue entry becomes the current one.
  useEffect(() => {
    if (!currentTrack) return;
    // A restored queue waits for Play.
    if (resume.current?.playId === playerState.playId) return;
    resume.current = null;
    playedThisLaunch.current = true;
    const startedAt = Date.now();
    playStartedAt.current = startedAt;
    resetPlay(currentTrack.id, startedAt);
    void player.playTrackId(currentTrack.id, true);
  }, [currentTrack?.id, playerState.playId]);

  // Advance the queue when a track finishes.
  useEffect(() => {
    return player.onEnded(() => {
      setPlayerState((prev) => {
        if (prev.repeat === 'one') {
          player.seek(0);
          void player.play();
          return prev;
        }
        return stepQueue(prev, 1);
      });
    });
  }, []);

  const patchPlayerState = (patch: Partial<PlayerState>) => {
    setPlayerState((prev) => ({ ...prev, ...patch }));
  };

  /** Offline, only tracks on this device (local files or downloads) can play. */
  const playable = (t: Track) => {
    return modeRef.current === 'online' || !!localLibrary.localIdFor(t.id);
  };

  const stepQueue = (prev: PlayerState, delta: 1 | -1): PlayerState => {
    // Walk past anything that cannot play right now, at most once round the queue.
    let next = stepOnce(prev, delta);
    for (let guard = 0; guard < prev.queue.length && next !== prev && !playable(next.queue[next.index]); guard++) {
      const after = stepOnce(next, delta);
      if (after === next) return prev;
      next = after;
    }
    return next !== prev && playable(next.queue[next.index]) ? next : prev;
  };

  // Shuffle reorders the queue itself (shared/player/queue.ts), so the queue's order is the
  // play order: Up next and the queue panel show what really comes next.
  const stepOnce = (prev: PlayerState, delta: 1 | -1): PlayerState => {
    const at = queueOps.stepIndex(prev, delta);
    return at < 0 ? prev : { ...prev, index: at, playId: prev.playId + 1 };
  };

  const next = () => {
    setPlayerState((prev) => stepQueue(prev, 1));
  };

  const toggleShuffle = () => {
    setPlayerState((prev) => queueOps.toggleShuffle(prev));
  };

  const cycleRepeat = () => {
    setPlayerState((prev) => {
      const order: PlayerState['repeat'][] = ['off', 'all', 'one'];
      const repeat = order[(order.indexOf(prev.repeat) + 1) % order.length];
      return { ...prev, repeat };
    });
  };

  const seek = (positionMs: number) => {
    if (resume.current) {
      resume.current = { ...resume.current, positionMs };
      setPlaybackPosition(positionMs);
      queueChanged();
      return;
    }
    player.seek(positionMs);
  };

  const seekRatio = (ratio: number) => {
    const total = playback.durationMs || currentTrack?.durationMs || 0;
    if (total > 0) seek(Math.max(0, Math.min(1, ratio)) * total);
  };

  /** Play / pause; the first Play of a restored queue loads it from where it was left. */
  const togglePlay = () => {
    const waiting = resume.current;
    if (waiting && currentTrackRef.current?.id === waiting.id) {
      resume.current = null;
      playedThisLaunch.current = true;
      const startedAt = Date.now();
      playStartedAt.current = startedAt;
      resetPlay(waiting.id, startedAt);
      void player.playTrackId(waiting.id, false, waiting.positionMs);
      return;
    }
    player.toggle();
  };

  const skipToPrevious = () => {
    setPlayerState((prev) => stepQueue(prev, -1));
  };

  const previous = () => {
    // Match the usual player convention: restart the track unless we are near its start.
    if ((resume.current ? getPlaybackPosition() : player.getStatus().positionMs) > 3000) {
      seek(0);
      return;
    }
    skipToPrevious();
  };

  // A song already queued is added again rather than moved: moving it could take the playing
  // entry away or skip what was lined up.
  const playNext = (track: Track) => {
    setPlayerState((prev) => {
      const next = queueOps.insertNext(prev, [track]);
      return prev.queue.length ? next : { ...next, playId: prev.playId + 1 };
    });
    showToast({ title: 'Playing next', description: track.title, icon: 'list' });
  };

  const enqueue = (tracks: Track[]) => {
    setPlayerState((prev) => {
      const next = queueOps.append(prev, tracks);
      return prev.queue.length ? next : { ...next, playId: prev.playId + 1 };
    });
    showToast({
      title: 'Added to queue',
      description: tracks.length === 1 ? tracks[0].title : `${tracks.length} songs`,
      icon: 'list',
    });
  };

  const removeFromQueue = (i: number) => {
    setPlayerState((prev) => {
      const next = queueOps.removeAt(prev, i);
      // The playing entry was removed: whatever took its place starts.
      return i === prev.index ? { ...next, playId: prev.playId + 1 } : next;
    });
  };

  const moveInQueue = (from: number, to: number) => {
    setPlayerState((prev) => queueOps.move(prev, from, to));
  };

  const clearUpcoming = () => {
    setPlayerState((prev) => queueOps.clearUpcoming(prev));
  };

  const playAt = (index: number) => {
    setPlayerState((prev) =>
      index >= 0 && index < prev.queue.length ? { ...prev, index, playId: prev.playId + 1 } : prev,
    );
  };

  const playTrack = (track: Track, newQueue?: Track[], from?: PlayingFrom) => {
    setPlayerState((prev) => {
      if (newQueue) {
        return { ...queueOps.startQueue(prev, newQueue, track), playId: prev.playId + 1, playingFrom: from ?? null };
      }
      const at = queueOps.positionOf(prev.queue, track, prev.index);
      if (at >= 0) return { ...prev, index: at, playId: prev.playId + 1 };
      return { ...queueOps.startQueue(prev, [track, ...prev.queue], track), playId: prev.playId + 1 };
    });
  };

  /** Shuffle on, and the list in random order from a random song. */
  const playShuffled = (tracks: Track[], from?: PlayingFrom) => {
    if (!tracks.length) return;
    const first = tracks[Math.floor(Math.random() * tracks.length)];
    setPlayerState((prev) => ({
      ...queueOps.startQueue({ ...prev, shuffle: true }, tracks, first),
      playId: prev.playId + 1,
      playingFrom: from ?? null,
    }));
  };

  // The handlers above are recreated on every render; consumers get stable wrappers that
  // call the latest ones, so the context value changes only when its data does.
  const actions = {
    patchPlayerState,
    togglePlay,
    seek,
    playTrack,
    playShuffled,
    playAt,
    seekRatio,
    next,
    previous,
    skipToPrevious,
    toggleShuffle,
    cycleRepeat,
    playNext,
    enqueue,
    removeFromQueue,
    moveInQueue,
    clearUpcoming,
  };
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const stableActions = useMemo(
    () => ({
      setState: (patch: Partial<PlayerState>) => actionsRef.current.patchPlayerState(patch),
      togglePlay: () => actionsRef.current.togglePlay(),
      seek: (positionMs: number) => actionsRef.current.seek(positionMs),
      playTrack: (track: Track, newQueue?: Track[], from?: PlayingFrom) =>
        actionsRef.current.playTrack(track, newQueue, from),
      playShuffled: (tracks: Track[], from?: PlayingFrom) => actionsRef.current.playShuffled(tracks, from),
      playAt: (index: number) => actionsRef.current.playAt(index),
      seekRatio: (ratio: number) => actionsRef.current.seekRatio(ratio),
      next: () => actionsRef.current.next(),
      previous: () => actionsRef.current.previous(),
      skipToPrevious: () => actionsRef.current.skipToPrevious(),
      toggleShuffle: () => actionsRef.current.toggleShuffle(),
      cycleRepeat: () => actionsRef.current.cycleRepeat(),
      playNext: (track: Track) => actionsRef.current.playNext(track),
      enqueue: (tracks: Track[]) => actionsRef.current.enqueue(tracks),
      removeFromQueue: (index: number) => actionsRef.current.removeFromQueue(index),
      moveInQueue: (from: number, to: number) => actionsRef.current.moveInQueue(from, to),
      clearUpcoming: () => actionsRef.current.clearUpcoming(),
    }),
    [],
  );
  const durationMs = playback.durationMs || currentTrack?.durationMs || 0;
  const playerValue = useMemo<PlayerStore>(
    () => ({
      ...stableActions,
      state: playerState,
      currentTrack,
      isPlaying: playback.playing,
      isLoading: playback.loading,
      durationMs,
      playbackError: playback.error,
      volume: playback.volume,
      setVolume: player.setVolume,
      toggleMute: player.toggleMute,
    }),
    [stableActions, playerState, currentTrack, playback, durationMs],
  );

  return (
    <ModeContext.Provider value={{ mode: effectiveMode, setMode }}>
      <PlayerContext.Provider value={playerValue}>
        <BrowserRouter>
          <Routes>
            {CAPS.landing ? (
              <Route
                path="/"
                element={
                  <Suspense fallback={<div className="min-h-[100dvh] bg-bg" />}>
                    <Landing />
                  </Suspense>
                }
              />
            ) : (
              <Route path="/" element={<Navigate to="/home" replace />} />
            )}
            <Route element={<AppShell />}>
              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/library" element={<Library />} />
              <Route path="/album/:id?" element={<Album />} />
              <Route path="/artist/:id?" element={<Artist />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/playlist" element={<Navigate to="/playlists" replace />} />
              <Route path="/playlist/:id" element={<PlaylistDetail />} />
              <Route path="/now-playing" element={<NowPlaying />} />
              <Route path="/lyrics" element={<Lyrics />} />
              <Route path="/queue" element={<Queue />} />
              <Route path="/equalizer" element={<Equalizer />} />
              {CAPS.offlineMode && <Route path="/mode-switch" element={<ModeSwitch />} />}
              <Route path="/settings" element={<Settings />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              {CAPS.localLibrary && <Route path="/folders" element={<Folders />} />}
              {CAPS.downloads && <Route path="/downloads" element={<Downloads />} />}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PlayerContext.Provider>
    </ModeContext.Provider>
  );
};
export default App;
