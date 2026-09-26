import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { cn } from '../../lib/cn';
import { useModeStore } from '../../store/mode';
import { usePlayerStore } from '../../store/player';
import { useLibraryStore } from '../../store/library';
import { Artwork } from './Artwork';
import { SourceGlyph } from './SourceGlyph';
import { artworkUrl } from '../../data/config';
import { IconButton } from '../ui/IconButton';
import Icon from '../ui/Icon';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';

const THRESHOLD = -50;

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const playNext = usePlayerStore((state) => state.playNext);
  const favourite = useLibraryStore((s) => currentTrack ? !!s.favouriteIds[currentTrack.id] : false);
  const toggleFavourite = useLibraryStore((s) => s.toggleFavourite);
  const progress = usePlayerStore((state) => (state.durationMs ? Math.min(1, state.positionMs / state.durationMs) : 0));

  const translateY = useSharedValue(0);
  const insets = useSafeAreaInsets();

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

  const isGold = mode === 'offline' || currentTrack.source === 'local';

  return (
    <PanGestureHandler onGestureEvent={handleGestureEvent as any} onEnded={handleGestureEnd as any}>
      <AnimatedViewComponent
        style={[animatedStyle, { bottom: 64 + insets.bottom }]}
        className="absolute inset-x-0 h-[64px] bg-[#111114] flex-row items-center px-2.5 border-t border-ln2 z-50"
      >
        <View className="absolute -top-[1px] left-0 right-0 h-[2px] bg-ln2">
          <View
            className={cn('h-full', isGold ? 'bg-gold' : 'bg-acc')}
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('NowPlaying')}
          accessibilityRole="button"
          accessibilityLabel="Open now playing"
          className="flex-row items-center gap-3 flex-1 min-w-0 mr-1"
        >
          <Artwork uri={artworkUrl(currentTrack, 140)} size={44} rings className="rounded-sm" sharedTransitionTag={`artwork-${currentTrack.id}`} />
          <View className="flex-1 gap-0.5 justify-center min-w-0">
            <View className="flex-row items-center gap-1.5 min-w-0">
              <Text numberOfLines={1} className="text-t1 text-tm font-medium shrink">
                {currentTrack.title}
              </Text>
              <SourceGlyph source={currentTrack.source} size={18} />
            </View>
            <Text numberOfLines={1} className="text-t2 text-bs">
              {currentTrack.artist}
            </Text>
          </View>
        </Pressable>

        <View className="flex-row items-center gap-0.5">
          <IconButton
            icon={
              <Icon
                name="heart"
                size={18}
                color={favourite ? (isGold ? '#FFC24D' : '#00E28A') : '#9A9AA8'}
              />
            }
            size={32}
            onPress={() => {
              if (currentTrack) toggleFavourite(currentTrack).catch(() => {});
            }}
            accessibilityLabel={favourite ? 'Remove from favourites' : 'Add to favourites'}
          />
          <IconButton
            icon={<Icon name={isPlaying ? 'pause' : 'play'} size={20} color="#FFFFFF" />}
            size={40}
            onPress={() => setIsPlaying(!isPlaying)}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          />
          <IconButton
            icon={<Icon name="skip-forward" size={18} color="#FFFFFF" />}
            size={32}
            onPress={() => playNext()}
            accessibilityLabel="Next track"
          />
        </View>
      </AnimatedViewComponent>
    </PanGestureHandler>
  );
}
