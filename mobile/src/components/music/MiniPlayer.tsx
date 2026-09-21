import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { cn } from '../../lib/cn';
import { useModeStore } from '../../store/mode';
import { usePlayerStore } from '../../store/player';
import { Artwork } from './Artwork';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';

const THRESHOLD = -50;

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);

  const translateY = useSharedValue(0);

  const handleGestureEnd = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, velocityY } = event.nativeEvent;
    
    // Swipe up
    if (translationY < THRESHOLD || velocityY < -500) {
      translateY.value = withSpring(-800, { damping: 20, stiffness: 200 }, () => {
        runOnJS(navigation.navigate)('NowPlaying');
        translateY.value = 0; // Reset
      });
    } else {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    }
  };
  
  const handleGestureEvent = (event: PanGestureHandlerGestureEvent) => {
      // Allow only swipe up
      if(event.nativeEvent.translationY < 0) {
         translateY.value = event.nativeEvent.translationY;
      }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const AnimatedViewComponent = Animated.View as any;

  if (!currentTrack) return null;

  return (
    <PanGestureHandler onGestureEvent={handleGestureEvent as any} onEnded={handleGestureEnd as any}>
      <AnimatedViewComponent style={animatedStyle} className="absolute bottom-[64px] inset-x-0 h-[64px] bg-[#111114] flex-row items-center px-4 border-b border-black z-50">
        <View className="absolute top-0 left-0 right-0 h-[2px] bg-ln3">
          <View className={cn('h-full', mode === 'online' ? 'bg-acc' : 'bg-gold')} style={{ width: '40%' }} />
        </View>

        <Pressable
          onPress={() => navigation.navigate('NowPlaying')}
          accessibilityRole="button"
          accessibilityLabel="Open now playing"
          className="flex-row items-center gap-3 flex-1"
        >
          <Artwork uri={currentTrack.albumId} size={48} sharedTransitionTag={`artwork-${currentTrack.id}`} />
          <View className="flex-1 gap-0.5">
            <Text numberOfLines={1} className="text-t1 text-tm font-medium">
              {currentTrack.title}
            </Text>
            <Text numberOfLines={1} className="text-t2 text-bs">
              {currentTrack.artist}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setIsPlaying(!isPlaying)}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          className={cn(
            'w-10 h-10 rounded-full items-center justify-center',
            mode === 'online' ? 'bg-acc' : 'bg-gold'
          )}
        >
          <Text className="text-black text-h2">{isPlaying ? '❚❚' : '▸'}</Text>
        </Pressable>
      </AnimatedViewComponent>
    </PanGestureHandler>
  );
}
