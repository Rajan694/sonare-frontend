import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Mode, Track } from './types';
import { CAPS } from './lib/caps';
import { hasInternet } from './lib/connectivity';
import { ModeContext } from './store/modeContext';
import { PlayerContext, defaultPlayerState, type PlayerStore } from './store/playerContext';
import { setPlaybackPosition } from './store/playbackPosition';
import type { PlayerState } from './types';
import { initDevAuth } from './api/auth';
import * as player from './audio/player';
import { maybeRecordPlay, resetPlay } from './api/plays';
import { setSyncOnline, startBackgroundSync } from './api/sync';
import { loadSettings, updateSettings, useSettings } from './storage/settings';
import { watchOutput } from './audio/output';
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

type Playback = Omit<player.PlaybackStatus, 'positionMs'>;

function withoutPosition(s: player.PlaybackStatus): Playback {
  const { trackId, playing, loading, durationMs, muxed, error, volume } = s;
  return { trackId, playing, loading, durationMs, muxed, error, volume };
}

function samePlayback(a: Playback, b: player.PlaybackStatus): boolean {
  return (
    a.trackId === b.trackId &&
    a.playing === b.playing &&
    a.loading === b.loading &&
    a.durationMs === b.durationMs &&
    a.muxed === b.muxed &&
    a.error === b.error &&
    a.volume === b.volume
  );
}

export default function App() {
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

  // Everything about playback except the position, which lives in store/playbackPosition so
  // a position tick doesn't re-render the app (see there).
  const [playback, setPlayback] = useState<Playback>(() => withoutPosition(player.getStatus()));
  /** Queue indices in shuffled order; rebuilt whenever shuffle is switched on. */
  const shuffleOrder = useRef<number[]>([]);
  /** When the current listen began — used to key a play so a replay counts again. */
  const playStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    initDevAuth();
    loadSettings();
    startBackgroundSync();
    // Picks up downloads that were running when the app last closed.
    void downloads.init();
    // Puts playback back on the speaker chosen last time.
    watchOutput();
  }, []);

  // Plays held in Offline Mode upload in the background once the app is Online again.
  useEffect(() => setSyncOnline(effectiveMode === 'online'), [effectiveMode]);

  // Mirror the audio element's state: the position into its own store, the rest into React
  // only when something other than the position changed.
  useEffect(() => {
    return player.onPlaybackChange((s) => {
      setPlaybackPosition(s.positionMs);
      setPlayback((prev) => (samePlayback(prev, s) ? prev : withoutPosition(s)));
      // Count the play once enough of the track has actually been heard.
      const track = currentTrackRef.current;
      if (track && s.playing) {
        maybeRecordPlay(track.id, playStartedAt.current, s.positionMs, s.durationMs || track.durationMs || 0);
      }
    });
  }, []);

  // Load and play whenever the selected track changes.
  useEffect(() => {
    if (!currentTrack) return;
    const startedAt = Date.now();
    playStartedAt.current = startedAt;
    resetPlay(currentTrack.id, startedAt);
    void player.playTrackId(currentTrack.id);
  }, [currentTrack?.id]);

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

  function patchPlayerState(patch: Partial<PlayerState>) {
    setPlayerState((prev) => ({ ...prev, ...patch }));
  }

  // Shuffle keeps the queue order intact and walks a separate randomised order, so
  // turning it off returns you to the real running order rather than a scrambled queue.
  function buildShuffleOrder(length: number, startIndex: number): number[] {
    const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== startIndex);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [startIndex, ...rest];
  }

  /** Offline, only tracks on this device (local files or downloads) can play. */
  function playable(t: Track) {
    return modeRef.current === 'online' || !!localLibrary.localIdFor(t.id);
  }

  function stepQueue(prev: PlayerState, delta: 1 | -1): PlayerState {
    // Walk past anything that cannot play right now, at most once round the queue.
    let next = stepOnce(prev, delta);
    for (let guard = 0; guard < prev.queue.length && next !== prev && !playable(next.queue[next.index]); guard++) {
      const after = stepOnce(next, delta);
      if (after === next) return prev;
      next = after;
    }
    return next !== prev && playable(next.queue[next.index]) ? next : prev;
  }

  function stepOnce(prev: PlayerState, delta: 1 | -1): PlayerState {
    if (prev.queue.length === 0) return prev;
    if (prev.shuffle && shuffleOrder.current.length === prev.queue.length) {
      const pos = shuffleOrder.current.indexOf(prev.index);
      const nextPos = pos + delta;
      if (nextPos < 0) return prev;
      if (nextPos >= shuffleOrder.current.length) {
        if (prev.repeat !== 'all') return prev;
        return { ...prev, index: shuffleOrder.current[0] };
      }
      return { ...prev, index: shuffleOrder.current[nextPos] };
    }
    const nextIndex = prev.index + delta;
    if (nextIndex < 0) return prev;
    if (nextIndex >= prev.queue.length) {
      if (prev.repeat !== 'all') return prev;
      return { ...prev, index: 0 };
    }
    return { ...prev, index: nextIndex };
  }

  function next() {
    setPlayerState((prev) => stepQueue(prev, 1));
  }

  function toggleShuffle() {
    setPlayerState((prev) => {
      const shuffle = !prev.shuffle;
      shuffleOrder.current = shuffle ? buildShuffleOrder(prev.queue.length, prev.index) : [];
      return { ...prev, shuffle };
    });
  }

  function cycleRepeat() {
    setPlayerState((prev) => {
      const order: PlayerState['repeat'][] = ['off', 'all', 'one'];
      const repeat = order[(order.indexOf(prev.repeat) + 1) % order.length];
      return { ...prev, repeat };
    });
  }

  function seekRatio(ratio: number) {
    const total = playback.durationMs || currentTrack?.durationMs || 0;
    if (total > 0) player.seek(Math.max(0, Math.min(1, ratio)) * total);
  }

  function skipToPrevious() {
    setPlayerState((prev) => stepQueue(prev, -1));
  }

  function previous() {
    // Match the usual player convention: restart the track unless we are near its start.
    if (player.getStatus().positionMs > 3000) {
      player.seek(0);
      return;
    }
    skipToPrevious();
  }

  /** Queue edits move the playing index along with the current track, and reshuffle. */
  function editQueue(edit: (queue: Track[], index: number) => { queue: Track[]; index: number }) {
    setPlayerState((prev) => {
      const { queue, index } = edit(prev.queue, prev.index);
      if (prev.shuffle) shuffleOrder.current = buildShuffleOrder(queue.length, index);
      return { ...prev, queue, index };
    });
  }

  function playNext(track: Track) {
    editQueue((queue, index) => {
      if (queue.length === 0) return { queue: [track], index: 0 };
      const current = queue[index];
      if (current.id === track.id) return { queue, index };
      const rest = queue.filter((t) => t.id !== track.id);
      const at = rest.indexOf(current);
      return { queue: [...rest.slice(0, at + 1), track, ...rest.slice(at + 1)], index: at };
    });
    showToast({ title: 'Playing next', description: track.title, icon: 'list' });
  }

  function enqueue(tracks: Track[]) {
    editQueue((queue, index) => {
      const known = new Set(queue.map((t) => t.id));
      return { queue: [...queue, ...tracks.filter((t) => !known.has(t.id))], index };
    });
    showToast({
      title: 'Added to queue',
      description: tracks.length === 1 ? tracks[0].title : `${tracks.length} songs`,
      icon: 'list',
    });
  }

  function removeFromQueue(i: number) {
    editQueue((queue, index) => {
      const next = queue.filter((_, j) => j !== i);
      // Removing the playing track hands over to whatever now sits at its position.
      const newIndex = i < index ? index - 1 : Math.min(index, Math.max(0, next.length - 1));
      return { queue: next, index: newIndex };
    });
  }

  function moveInQueue(from: number, to: number) {
    editQueue((queue, index) => {
      if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return { queue, index };
      const current = queue[index];
      const next = [...queue];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { queue: next, index: next.indexOf(current) };
    });
  }

  function clearUpcoming() {
    editQueue((queue, index) => ({ queue: queue.slice(0, index + 1), index }));
  }

  function playTrack(track: Track, newQueue?: Track[]) {
    if (newQueue) {
      const idx = Math.max(
        0,
        newQueue.findIndex((t) => t.id === track.id),
      );
      setPlayerState((prev) => {
        if (prev.shuffle) shuffleOrder.current = buildShuffleOrder(newQueue.length, idx);
        return { ...prev, queue: newQueue, index: idx };
      });
    } else {
      setPlayerState((prev) => {
        const existingIdx = prev.queue.findIndex((t) => t.id === track.id);
        if (existingIdx >= 0) {
          return { ...prev, index: existingIdx };
        }
        const queue = [track, ...prev.queue];
        if (prev.shuffle) shuffleOrder.current = buildShuffleOrder(queue.length, 0);
        return { ...prev, queue, index: 0 };
      });
    }
  }

  // The handlers above are recreated on every render; consumers get stable wrappers that
  // call the latest ones, so the context value changes only when its data does.
  const actions = {
    patchPlayerState,
    playTrack,
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
      playTrack: (track: Track, newQueue?: Track[]) => actionsRef.current.playTrack(track, newQueue),
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
      togglePlay: player.toggle,
      seek: player.seek,
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
            <Route path="/" element={<Navigate to="/home" replace />} />
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
}
