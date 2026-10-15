import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AudioEngine } from './src/components/music/AudioEngine';
import { hasInternet } from './src/lib/connectivity';
import { useModeStore } from './src/store/mode';
import { startBackgroundSync } from './src/data/sync';
import { startAppConfigPolling } from './src/youtube/appConfig';
import { startAutoplay } from './src/store/autoplay';
import './global.css';

const App = () => {
  useEffect(() => {
    startBackgroundSync();
    const stopAutoplay = startAutoplay();
    // What the admin set for in-app YouTube; checked now, every 5 min and on returning to the app.
    const stopPolling = startAppConfigPolling();
    return () => {
      stopAutoplay();
      stopPolling();
    };
  }, []);

  useEffect(() => {
    let active = true;
    hasInternet().then((online) => {
      if (!active) return;
      const { userChangedMode, setMode } = useModeStore.getState();
      if (!online && !userChangedMode) {
        setMode('offline', {
          title: 'No internet connection',
          description: 'Switched to Offline Mode - showing music on this device',
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
        <AudioEngine />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
export default App;
