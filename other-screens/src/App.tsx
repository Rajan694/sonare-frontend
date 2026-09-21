import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Mode } from './data/types'
import { ModeContext } from './store/modeStore'
import { PlayerContext, defaultPlayerState } from './store/playerStore'
import type { PlayerState } from './data/types'
import { MOCK_TRACKS } from './data/mock'
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
  const currentTrack = playerState.queue[playerState.index] ?? playerState.queue[0]

  function patchPlayerState(patch: Partial<PlayerState>) {
    setPlayerState(prev => ({ ...prev, ...patch }))
  }

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <PlayerContext.Provider value={{ state: playerState, setState: patchPlayerState, currentTrack }}>
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
