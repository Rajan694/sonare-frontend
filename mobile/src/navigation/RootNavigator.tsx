import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { NowPlayingScreen } from '../screens/NowPlaying';
import { LyricsScreen } from '../screens/Lyrics';
import { AlbumScreen } from '../screens/Album';
import { ArtistScreen } from '../screens/Artist';
import { PlaylistScreen } from '../screens/Playlist';
import { QueueScreen } from '../screens/Queue';
import { EqualizerScreen } from '../screens/Equalizer';
import { SettingsScreen } from '../screens/Settings';
import { FoldersScreen } from '../screens/Folders';
import { ModeSwitchScreen } from '../screens/ModeSwitch';
import { useModeStore } from '../store/mode';
import { View, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { cn } from '../lib/cn';

const Stack = createNativeStackNavigator<Record<string, undefined>, undefined>();

function ModeToast() {
  const mode = useModeStore((state) => state.mode);
  const prevMode = useRef(mode);
  const [toast, setToast] = useState<{ mode: 'online' | 'offline', visible: boolean } | null>(null);

  useEffect(() => {
    if (mode !== prevMode.current) {
      prevMode.current = mode;
      setToast({ mode, visible: true });
      const timer = setTimeout(() => {
        setToast((t) => t ? { ...t, visible: false } : null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  if (!toast?.visible) return null;

  return (
    <Animated.View 
       entering={FadeInUp.springify().damping(20).reduceMotion(ReduceMotion.System)} 
       exiting={FadeOutUp.reduceMotion(ReduceMotion.System)} 
       className="absolute top-12 left-4 right-4 bg-s1 rounded-2xl border border-gold/30 p-3 shadow-2xl flex-row items-center gap-3 z-50 pointer-events-none"
    >
      <View className="w-2 rounded-full self-stretch bg-gold" />
      <View className="flex-1 ml-1 py-1">
         <Text className={cn("text-h2 font-medium", toast.mode === 'offline' ? "text-gold" : "text-acc")}>
            Switched to {toast.mode === 'offline' ? 'Offline' : 'Online'} Mode
         </Text>
         <Text className="text-t2 text-bs mt-0.5">
            {toast.mode === 'offline' 
              ? 'Server content hidden. Playback continues from this device.'
              : 'Server content restored. Playback continues.'}
         </Text>
      </View>
    </Animated.View>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <ModeToast />
      <Stack.Navigator
        id={undefined}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="NowPlaying" component={NowPlayingScreen} />
        <Stack.Screen name="Lyrics" component={LyricsScreen} />
        <Stack.Screen name="Album" component={AlbumScreen} />
        <Stack.Screen name="Artist" component={ArtistScreen} />
        <Stack.Screen name="Playlist" component={PlaylistScreen} />
        <Stack.Screen name="Queue" component={QueueScreen} />
        <Stack.Screen name="Equalizer" component={EqualizerScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Folders" component={FoldersScreen} />
        <Stack.Screen name="ModeSwitch" component={ModeSwitchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
