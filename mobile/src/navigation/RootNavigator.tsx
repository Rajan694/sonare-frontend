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
import { View, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/ui/Icon';
import { Text } from '../components/ui/Text';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { loadServerOrigin } from '../data/config';
import { PlayerSheetsHost } from '../components/music/PlayerSheets';
import { useDevicePrefsStore } from '../store/devicePrefs';
import { cn } from '../lib/cn';

const Stack = createNativeStackNavigator<Record<string, object | undefined>, undefined>();

const ModeToast = () => {
  const insets = useSafeAreaInsets();
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

  const gold = toast.mode === 'offline';
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(20).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.reduceMotion(ReduceMotion.System)}
      className={cn(
        'absolute left-5 right-5 z-50 flex-row items-start gap-3 px-3.5 py-3 rounded-[14px] bg-s1 border shadow-e3',
        gold ? 'border-[rgba(255,194,77,0.32)]' : 'border-[rgba(0,226,138,0.32)]',
      )}
      style={{ top: insets.top + 8 }}
    >
      <View className={cn('w-1.5 h-1.5 rounded-full mt-1.5', gold ? 'bg-gold' : 'bg-acc')} />
      <View className="flex-1 gap-0.5">
        <Text className={cn('text-ll', gold ? 'text-gold' : 'text-acc')}>{toast.title ?? defaultTitle}</Text>
        <Text className="text-t2 text-bs">{toast.description ?? defaultDesc}</Text>
      </View>
      <Pressable
        onPress={() => setToast((t) => (t ? { ...t, visible: false } : null))}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={10}
      >
        <Icon name="close" size={14} color="#7E7E8C" />
      </Pressable>
    </Animated.View>
  );
};

/**
 * Signed in: load the user's library, then finish whatever they were doing as a guest when
 * asked to sign in (e.g. the like they tapped). Back to guest: drop the library. Playback
 * carries on either way — guests can listen.
 */
const useSessionEffects = (status: string) => {
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
};

export const RootNavigator = () => {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    useDevicePrefsStore.getState().hydrate();
    // A server address saved in Settings applies before the first request goes out.
    loadServerOrigin().finally(() => {
      hydrate();
      // Picks up downloads that were running when the app last closed.
      useDownloadsStore.getState().hydrate();
    });
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
        {/* A sheet over the screen it was opened from, which stays visible (dimmed) behind it. */}
        <Stack.Screen
          name="ModeSwitch"
          component={ModeSwitchScreen}
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="SignIn" component={SignInScreen} />
      </Stack.Navigator>
      <TrackMenuHost />
      <PlayerSheetsHost />
    </NavigationContainer>
  );
};
