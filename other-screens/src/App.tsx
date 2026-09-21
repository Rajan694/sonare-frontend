import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DesktopHomeOnline from './screens/DesktopHomeOnline';
import DesktopHomeOffline from './screens/DesktopHomeOffline';
import DesktopSearchOnline from './screens/DesktopSearchOnline';
import DesktopLibrary from './screens/DesktopLibrary';
import DesktopFolders from './screens/DesktopFolders';
import DesktopSettings from './screens/DesktopSettings';
import DesktopNowPlayingOnline from './screens/DesktopNowPlayingOnline';
import DesktopNowPlayingOffline from './screens/DesktopNowPlayingOffline';
import './styles.css';

export default function App() {
  const [mode, setMode] = useState<'online' | 'offline'>('online');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={mode === 'online' ? <DesktopHomeOnline /> : <DesktopHomeOffline />} />
        <Route path="/search" element={<DesktopSearchOnline />} />
        <Route path="/library" element={<DesktopLibrary />} />
        <Route path="/folders" element={<DesktopFolders />} />
        <Route path="/settings" element={<DesktopSettings />} />
        <Route path="/now-playing" element={mode === 'online' ? <DesktopNowPlayingOnline /> : <DesktopNowPlayingOffline />} />
      </Routes>
    </BrowserRouter>
  );
}
