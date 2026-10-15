import React, { useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { isServerWaking, subscribeServerWaking } from '../../../../shared/net/serverWake';

/** Shown while a request waits for the sleeping server to start (shared/net/serverWake.ts). */
export const ServerWakeNotice = () => {
  const waking = useSyncExternalStore(subscribeServerWaking, isServerWaking);
  const insets = useSafeAreaInsets();
  if (!waking) return null;
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(20).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.reduceMotion(ReduceMotion.System)}
      accessibilityLiveRegion="polite"
      className="absolute left-5 right-5 z-50 flex-row items-center gap-3 px-3.5 py-3 rounded-[14px] bg-s1 border border-[rgba(0,226,138,0.32)] shadow-e3"
      style={{ top: insets.top + 8 }}
    >
      <ActivityIndicator size="small" color="#00E28A" />
      <View className="flex-1 gap-0.5">
        <Text className="text-ll text-acc">Waking up the Sonare server</Text>
        <Text className="text-t2 text-bs">After a quiet while it takes up to a minute to start.</Text>
      </View>
    </Animated.View>
  );
};
