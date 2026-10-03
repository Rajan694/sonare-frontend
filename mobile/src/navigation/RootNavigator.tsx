import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { NowPlayingScreen } from '../screens/NowPlaying';
import { LyricsScreen } from '../screens/Lyrics';
import { QueueScreen } from '../screens/Queue';
import { EqualizerScreen } from '../screens/Equalizer';
import { useDownloadsStore } from '../store/downloads';
import { useSettingsStore } from '../data/settings';
import { ModeSwitchScreen } from '../screens/ModeSwitch';
import { SignInScreen } from '../screens/SignIn';
import { useAuthStore } from '../data/auth';
import { useLibraryStore } from '../store/library';
import { navigationRef, takePendingAction } from '../data/accountGate';
import { TrackMenuHost } from '../components/music/TrackMenuHost';
import { useModeStore } from '../store/mode';
import { View, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { cn } from '../lib/cn';

const Stack = createNativeStackNavigator<Record<string, object | undefined>, undefined>();

function ModeToast() {
  const mode = useModeStore((state) => state.mode);
  const prevMode = useRef(mode);
  const [toast, setToast] = useState<{
    mode: 'online' | 'offline';
    title?: string;
    description?: string;
    visible: boolean;
  } | null>(null);

  useEffect(() => {
    if (mode !== prevMode.current) {
      prevMode.current = mode;
      const toastInfo = useModeStore.getState().toastInfo;
      setToast({
        mode,
        title: toastInfo?.title,
        description: toastInfo?.description,
        visible: true,
      });
      const timer = setTimeout(() => {
        setToast((t) => (t ? { ...t, visible: false } : null));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  if (!toast?.visible) return null;

  const defaultTitle = `Switched to ${toast.mode === 'offline' ? 'Offline' : 'Online'} Mode`;
  const defaultDesc =
    toast.mode === 'offline'
      ? 'Server content hidden. Playback continues from this device.'
      : 'Server content restored. Playback continues.';

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(20).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.reduceMotion(ReduceMotion.System)}
      className="absolute top-12 left-4 right-4 bg-s1 rounded-2xl border border-gold/30 p-3 shadow-2xl flex-row items-center gap-3 z-50 pointer-events-none"
    >
      <View className="w-2 rounded-full self-stretch bg-gold" />
      <View className="flex-1 ml-1 py-1">
        <Text className={cn('text-h2 font-medium', toast.mode === 'offline' ? 'text-gold' : 'text-acc')}>
          {toast.title ?? defaultTitle}
        </Text>
        <Text className="text-t2 text-bs mt-0.5">{toast.description ?? defaultDesc}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * Signed in: load the user's library, then finish whatever they were doing as a guest when
 * asked to sign in (e.g. the like they tapped). Back to guest: drop the library. Playback
 * carries on either way — guests can listen.
 */
function useSessionEffects(status: string) {
  useEffect(() => {
    if (status === 'loading') return;
    // Account settings (download quality / format) follow whoever is signed in.
    useSettingsStore.getState().hydrate();
    if (status === 'signedIn') {
      useLibraryStore
        .getState()
        .load()
        .finally(() => takePendingAction()?.());
    } else if (status === 'guest') {
      useLibraryStore.getState().reset();
    }
  }, [status]);
}

export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    // Picks up downloads that were running when the app last closed.
    useDownloadsStore.getState().hydrate();
  }, [hydrate]);
  useSessionEffects(status);

  if (status === 'loading') {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#00E28A" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
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
        <Stack.Screen name="Queue" component={QueueScreen} />
        {/* Opened from Now Playing, over it; from Settings it opens inside the tab. */}
        <Stack.Screen name="Equalizer" component={EqualizerScreen} />
        <Stack.Screen name="ModeSwitch" component={ModeSwitchScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
      </Stack.Navigator>
      <TrackMenuHost />
    </NavigationContainer>
  );
}
