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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, onAiUnavailable } from './src/data/api';
import { useAiStore } from './src/store/ai';
import { startTitleSync } from '../shared/ai/titleSync';
import type { TitleFix } from '../shared/catalog/titleFixes';
import './global.css';

const TITLE_FIXES_KEY = 'sonare.aiTitleFixes';

const App = () => {
  useEffect(() => {
    startBackgroundSync();
    const stopAutoplay = startAutoplay();
    // What the admin set for in-app YouTube; checked now, every 5 min and on returning to the app.
    const stopPolling = startAppConfigPolling();
    // An AI call that found no provider answering hides the AI features until app-config says otherwise.
    onAiUnavailable(() => useAiStore.getState().setAvailable(false));
    // Cleaner titles for messy YouTube uploads, worked out by the backend's AI (shared/ai/titleSync.ts).
    const stopTitleSync = startTitleSync({
      post: api.aiTitles,
      enabled: () => useAiStore.getState().available && useModeStore.getState().mode === 'online',
      load: async () =>
        JSON.parse((await AsyncStorage.getItem(TITLE_FIXES_KEY)) ?? 'null') as Record<string, TitleFix> | null,
      save: (fixes) => AsyncStorage.setItem(TITLE_FIXES_KEY, JSON.stringify(fixes)),
    });
    return () => {
      stopAutoplay();
      stopPolling();
      stopTitleSync();
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
