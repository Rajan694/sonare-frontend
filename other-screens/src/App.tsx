import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Mode, Track } from './data/types'
import { ModeContext } from './store/modeStore'
import { PlayerContext, defaultPlayerState } from './store/playerStore'
import type { PlayerState } from './data/types'
import { initDevAuth } from './data/auth'
import * as player from './data/player'
import { maybeRecordPlay, resetPlay } from './data/plays'
import AppShell from './components/layout/AppShell'
import Home from './screens/Home'
import Search from './screens/Search'
import Library from './screens/Library'
import Album from './screens/Album'
import Artist from './screens/Artist'
import Playlist from './screens/Playlist'
import NowPlaying from './screens/NowPlaying'
import Lyrics from './screens/Lyrics'
import Queue from './screens/Queue'
import Equalizer from './screens/Equalizer'
import ModeSwitch from './screens/ModeSwitch'
import SettingsScreen from './screens/SettingsScreen'
import Folders from './screens/Folders'
import './styles.css'
import './sonare.css'

export default function App() {
  const [mode, setMode] = useState<Mode>('online')
  const [playerState, setPlayerState] = useState<PlayerState>(defaultPlayerState)
  const currentTrack: Track | null = playerState.queue[playerState.index] ?? null

  const [playback, setPlayback] = useState(player.getStatus())
  /** Queue indices in shuffled order; rebuilt whenever shuffle is switched on. */
  const shuffleOrder = useRef<number[]>([])
  /** When the current listen began — used to key a play so a replay counts again. */
  const playStartedAt = useRef<number>(Date.now())

  useEffect(() => {
    initDevAuth()
  }, [])

  // Mirror the audio element's state into React, and keep positionMs on the shared
  // PlayerState so screens that already read it (NowPlaying, BottomPlayer) keep working.
  useEffect(() => {
    return player.onPlaybackChange(s => {
      setPlayback(s)
      setPlayerState(prev => (prev.positionMs === s.positionMs ? prev : { ...prev, positionMs: s.positionMs }))
    })
  }, [])

  // Load and play whenever the selected track changes.
  useEffect(() => {
    if (!currentTrack) return
    if (currentTrack.source === 'local') return // device-local playback is not wired on web (contract 6.6)
    const startedAt = Date.now()
    playStartedAt.current = startedAt
    resetPlay(currentTrack.id, startedAt)
    void player.playTrackId(currentTrack.id)
  }, [currentTrack?.id])

  // Count the play once enough of the track has actually been heard.
  useEffect(() => {
    if (!currentTrack || !playback.playing) return
    maybeRecordPlay(
      currentTrack.id,
      playStartedAt.current,
      playback.positionMs,
      playback.durationMs || currentTrack.durationMs || 0
    )
  }, [currentTrack?.id, playback.positionMs, playback.playing])

  // Advance the queue when a track finishes.
  useEffect(() => {
    return player.onEnded(() => {
      setPlayerState(prev => {
        if (prev.repeat === 'one') {
          player.seek(0)
          void player.play()
          return { ...prev, positionMs: 0 }
        }
        return stepQueue(prev, 1)
      })
    })
  }, [])

  function patchPlayerState(patch: Partial<PlayerState>) {
    setPlayerState(prev => ({ ...prev, ...patch }))
  }

  // Shuffle keeps the queue order intact and walks a separate randomised order, so
  // turning it off returns you to the real running order rather than a scrambled queue.
  function buildShuffleOrder(length: number, startIndex: number): number[] {
    const rest = Array.from({ length }, (_, i) => i).filter(i => i !== startIndex)
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rest[i], rest[j]] = [rest[j], rest[i]]
    }
    return [startIndex, ...rest]
  }

  function stepQueue(prev: PlayerState, delta: 1 | -1): PlayerState {
    if (prev.queue.length === 0) return prev
    if (prev.shuffle && shuffleOrder.current.length === prev.queue.length) {
      const pos = shuffleOrder.current.indexOf(prev.index)
      const nextPos = pos + delta
      if (nextPos < 0) return prev
      if (nextPos >= shuffleOrder.current.length) {
        if (prev.repeat !== 'all') return prev
        return { ...prev, index: shuffleOrder.current[0], positionMs: 0 }
      }
      return { ...prev, index: shuffleOrder.current[nextPos], positionMs: 0 }
    }
    const nextIndex = prev.index + delta
    if (nextIndex < 0) return prev
    if (nextIndex >= prev.queue.length) {
      if (prev.repeat !== 'all') return prev
      return { ...prev, index: 0, positionMs: 0 }
    }
    return { ...prev, index: nextIndex, positionMs: 0 }
  }

  function next() {
    setPlayerState(prev => stepQueue(prev, 1))
  }

  function toggleShuffle() {
    setPlayerState(prev => {
      const shuffle = !prev.shuffle
      shuffleOrder.current = shuffle ? buildShuffleOrder(prev.queue.length, prev.index) : []
      return { ...prev, shuffle }
    })
  }

  function cycleRepeat() {
    setPlayerState(prev => {
      const order: PlayerState['repeat'][] = ['off', 'all', 'one']
      const repeat = order[(order.indexOf(prev.repeat) + 1) % order.length]
      return { ...prev, repeat }
    })
  }

  function seekRatio(ratio: number) {
    const total = playback.durationMs || currentTrack?.durationMs || 0
    if (total > 0) player.seek(Math.max(0, Math.min(1, ratio)) * total)
  }

  function previous() {
    // Match the usual player convention: restart the track unless we are near its start.
    if (playback.positionMs > 3000) {
      player.seek(0)
      return
    }
    setPlayerState(prev => stepQueue(prev, -1))
  }

  function playTrack(track: Track, newQueue?: Track[]) {
    if (newQueue) {
      const idx = newQueue.findIndex(t => t.id === track.id)
      setPlayerState(prev => ({
        ...prev,
        queue: newQueue,
        index: idx >= 0 ? idx : 0,
        positionMs: 0,
      }))
    } else {
      setPlayerState(prev => {
        const existingIdx = prev.queue.findIndex(t => t.id === track.id)
        if (existingIdx >= 0) {
          return { ...prev, index: existingIdx, positionMs: 0 }
        }
        const queue = [track, ...prev.queue]
        return { ...prev, queue, index: 0, positionMs: 0 }
      })
    }
  }

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <PlayerContext.Provider
        value={{
          state: playerState,
          setState: patchPlayerState,
          currentTrack,
          playTrack,
          isPlaying: playback.playing,
          isLoading: playback.loading,
          durationMs: playback.durationMs || currentTrack?.durationMs || 0,
          playbackError: playback.error,
          togglePlay: player.toggle,
          seek: player.seek,
          seekRatio,
          next,
          previous,
          volume: playback.volume,
          setVolume: player.setVolume,
          toggleShuffle,
          cycleRepeat,
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route element={<AppShell />}>
              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/library" element={<Library />} />
              <Route path="/album/:id?" element={<Album />} />
              <Route path="/artist/:id?" element={<Artist />} />
              <Route path="/playlist/:id?" element={<Playlist />} />
              <Route path="/now-playing" element={<NowPlaying />} />
              <Route path="/lyrics" element={<Lyrics />} />
              <Route path="/queue" element={<Queue />} />
              <Route path="/equalizer" element={<Equalizer />} />
              <Route path="/mode-switch" element={<ModeSwitch />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/folders" element={<Folders />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PlayerContext.Provider>
    </ModeContext.Provider>
  )
}
