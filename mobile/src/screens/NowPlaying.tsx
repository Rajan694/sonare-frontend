import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Artwork } from '../components/music/Artwork';
import { IconButton } from '../components/ui/IconButton';
import { Badge } from '../components/ui/Badge';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import { requireAccount } from '../data/accountGate';
import { useNavigation } from '@react-navigation/native';
import { formatDuration } from '../lib/format';
import { cn } from '../lib/cn';
import { Waveform } from '../components/music/Waveform';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import Icon from '../components/ui/Icon';

const SWIPE_THRESHOLD = 50;

export function NowPlayingScreen() {
  const mode = useModeStore((state) => state.mode);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const playNext = usePlayerStore((state) => state.playNext);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const buffering = usePlayerStore((state) => state.buffering);
  const error = usePlayerStore((state) => state.error);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const favourite = useLibraryStore((state) => !!currentTrack && !!state.favouriteIds[currentTrack.id]);
  const peaks = useAsync(() => api.peaks(currentTrack!.id, 76), [currentTrack?.id], {
    enabled: currentTrack?.source === 'server',
  });
  const progress = durationMs ? Math.min(1, positionMs / durationMs) : 0;

  const navigation = useNavigation<any>();

  const translateX = useSharedValue(0);

  const handleGestureEnd = (event: PanGestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    
    if (translationX > SWIPE_THRESHOLD) {
      translateX.value = withSpring(400, { damping: 20, stiffness: 200 }, () => {
        runOnJS(playPrevious)();
        translateX.value = 0;
      });
    } else if (translationX < -SWIPE_THRESHOLD) {
      translateX.value = withSpring(-400, { damping: 20, stiffness: 200 }, () => {
        runOnJS(playNext)();
        translateX.value = 0;
      });
    } else {
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    }
  };

  const handleGestureEvent = (event: PanGestureHandlerGestureEvent) => {
     translateX.value = event.nativeEvent.translationX;
  };

  const artworkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const AnimatedViewComponent = Animated.View as any;

  if (!currentTrack) {
    return (
      <Screen>
        <Header 
          title="Now Playing" 
          left={<IconButton icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Close now playing" />}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-t3 text-bm">Nothing playing</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header 
        left={<IconButton icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Close now playing" />}
        right={
          <IconButton
            icon={<Icon name="heart" size={20} color={favourite ? '#00E28A' : '#FFFFFF'} />}
            onPress={() =>
              requireAccount('Create a free account to save songs you love.', () =>
                useLibraryStore.getState().toggleFavourite(currentTrack).catch(() => {}),
              )
            }
            accessibilityLabel={favourite ? 'Remove from favourites' : 'Add to favourites'}
            variant={favourite ? 'active' : 'default'}
          />
        }
      />
      <View className="flex-1 px-6 pt-8">
        
        <PanGestureHandler onGestureEvent={handleGestureEvent as any} onEnded={handleGestureEnd as any}>
          <AnimatedViewComponent style={artworkStyle} className="self-center mb-8">
             <Artwork
               uri={artworkUrl(currentTrack, 640)}
               fallbackUri={artworkUrl(currentTrack, 300)}
               size={240}
               sharedTransitionTag={`artwork-${currentTrack.id}`}
             />
          </AnimatedViewComponent>
        </PanGestureHandler>

        <View className="gap-2 mb-6">
          <Text className="text-h1 font-semibold text-t1 text-center">
            {currentTrack.title}
          </Text>
          <Text
            className="text-tl text-t2 text-center"
            onPress={() => navigation.navigate('Artist', { id: currentTrack.artistId })}
            accessibilityRole="link"
          >
            {currentTrack.artist}
          </Text>
          <View className="flex-row items-center justify-center gap-2 mt-2">
            <Badge
              label={currentTrack.source === 'local' ? 'On device' : 'Server'}
              variant={currentTrack.source === 'local' ? 'local' : 'cloud'}
            />
            {currentTrack.codec && (
              <Badge label={currentTrack.codec} variant="neutral" />
            )}
          </View>
          {error && <Text className="text-red text-bs text-center mt-1">{error}</Text>}
        </View>

        <View className="mb-2 w-full h-[32px] justify-end">
          <Waveform
            trackId={currentTrack.id}
            progress={progress}
            mode={mode}
            peaks={peaks.data?.peaks}
            onSeek={durationMs ? f => seekTo(Math.round(f * durationMs)) : undefined}
          />
        </View>

        <View className="flex-row justify-between mb-8">
          <Text className="text-mono font-mono text-t3">{formatDuration(positionMs)}</Text>
          <Text className="text-mono font-mono text-t3">
            {formatDuration(durationMs || currentTrack.durationMs || 0)}
          </Text>
        </View>

        <View className="flex-row items-center justify-center gap-6 mb-8 mt-auto">
          <IconButton
            icon={<Icon name="shuffle" size={14} color="#7E7E8C" />}
            onPress={toggleShuffle}
            accessibilityLabel="Toggle shuffle"
            variant={shuffle ? 'active' : 'default'}
          />
          
          <IconButton
            icon={<Icon name="skip-back" size={20} color="#FFFFFF" />}
            onPress={playPrevious}
            accessibilityLabel="Previous track"
            size={44}
          />

          <Pressable
            onPress={() => setIsPlaying(!isPlaying)}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            className={cn(
              'w-16 h-16 rounded-full items-center justify-center shadow-lg',
              mode === 'online' ? 'bg-acc shadow-acc/20' : 'bg-gold shadow-gold/20'
            )}
          >
            {buffering && isPlaying ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Icon name={isPlaying ? 'pause' : 'play'} size={28} color="#000000" />
            )}
          </Pressable>

          <IconButton
            icon={<Icon name="skip-forward" size={20} color="#FFFFFF" />}
            onPress={playNext}
            accessibilityLabel="Next track"
            size={44}
          />

          <IconButton
            icon={<Icon name="repeat" size={14} color="#7E7E8C" />}
            onPress={cycleRepeat}
            accessibilityLabel="Toggle repeat"
            variant={repeat !== 'off' ? 'active' : 'default'}
          />
        </View>

        <View className="flex-row items-center justify-between mt-auto mb-6 px-2">
          <IconButton
            icon={<Icon name="lyrics" size={18} color="#7E7E8C" />}
            onPress={() => navigation.navigate('Lyrics')}
            accessibilityLabel="Lyrics"
          />
          <IconButton
            icon={<Icon name="equalizer" size={18} color="#7E7E8C" />}
            onPress={() => navigation.navigate('Equalizer')}
            accessibilityLabel="Equalizer"
          />
          <IconButton
            icon={<Icon name="playlist" size={18} color="#7E7E8C" />}
            onPress={() => navigation.navigate('Queue')}
            accessibilityLabel="Queue"
          />
        </View>
      </View>
    </Screen>
  );
}
