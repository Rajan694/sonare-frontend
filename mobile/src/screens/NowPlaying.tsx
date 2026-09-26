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
import { useTrackMenuStore } from '../store/trackMenu';
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
  const remainingMs = durationMs ? Math.max(0, durationMs - positionMs) : 0;

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

  const isGold = mode === 'offline' || currentTrack.source === 'local';

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header 
        left={
          <IconButton
            icon={<Icon name="chevron-down" size={22} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close now playing"
          />
        }
        title={currentTrack.album ? (
          <View className="items-center">
            <Text className="text-[11px] font-semibold tracking-[0.9px] text-t3 uppercase">PLAYING FROM ALBUM</Text>
            <Text className="text-ll font-semibold text-t1 truncate max-w-[200px]" numberOfLines={1}>{currentTrack.album}</Text>
          </View>
        ) : undefined}
        right={
          <IconButton
            icon={<Icon name="more" size={20} color="#FFFFFF" />}
            onPress={() => useTrackMenuStore.getState().open(currentTrack)}
            accessibilityLabel="More options"
          />
        }
      />
      <View className="flex-1 px-5 pt-1 pb-6">
        
        {/* Large Artwork matching M09 (~306px) */}
        <PanGestureHandler onGestureEvent={handleGestureEvent as any} onEnded={handleGestureEnd as any}>
          <AnimatedViewComponent style={artworkStyle} className="self-center mt-2 mb-4">
            <View className="relative">
              <View
                className="absolute inset-0 rounded-[40px]"
                style={{
                  backgroundColor: isGold ? '#FFC24D' : '#00E28A',
                  opacity: 0.04,
                  transform: [{ scale: 1.24 }],
                }}
              />
              <View
                className="absolute inset-0 rounded-[40px]"
                style={{
                  backgroundColor: isGold ? '#FFC24D' : '#00E28A',
                  opacity: 0.08,
                  transform: [{ scale: 1.14 }],
                }}
              />
              <View
                className="absolute inset-0 rounded-[40px]"
                style={{
                  backgroundColor: isGold ? '#FFC24D' : '#00E28A',
                  opacity: 0.14,
                  transform: [{ scale: 1.06 }],
                }}
              />
              <Artwork
                uri={artworkUrl(currentTrack, 640)}
                fallbackUri={artworkUrl(currentTrack, 300)}
                size={306}
                rings
                className="rounded-2xl shadow-2xl"
                sharedTransitionTag={`artwork-${currentTrack.id}`}
              />
            </View>
          </AnimatedViewComponent>
        </PanGestureHandler>

        <View className="gap-2.5">
          {/* Title and Heart */}
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-1 min-w-0">
              <Text className="text-h1 font-bold text-t1 truncate" numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text
                className="text-tm text-t2 font-medium truncate"
                numberOfLines={1}
                onPress={() => {
                  navigation.goBack();
                  navigation.navigate('Artist', { id: currentTrack.artistId });
                }}
                accessibilityRole="link"
              >
                {currentTrack.artist}
              </Text>
            </View>
            <IconButton
              icon={<Icon name="heart" size={23} color={favourite ? (isGold ? '#FFC24D' : '#00E28A') : '#9A9AA8'} />}
              size={44}
              onPress={() =>
                requireAccount('Create a free account to save songs you love.', () =>
                  useLibraryStore.getState().toggleFavourite(currentTrack).catch(() => {}),
                )
              }
              accessibilityLabel={favourite ? 'Remove from favourites' : 'Add to favourites'}
            />
          </View>

          {/* Badges line: Source pill + Codec */}
          <View className="flex-row items-center gap-2">
            <Badge
              label={currentTrack.source === 'local' ? 'ON THIS DEVICE' : 'STREAMING'}
              variant={currentTrack.source === 'local' ? 'local' : 'cloud'}
              icon={<Icon name={currentTrack.source === 'local' ? 'smartphone' : 'cloud'} size={12} color={currentTrack.source === 'local' ? '#FFC24D' : '#00E28A'} />}
            />
            {currentTrack.codec && (
              <Text className="text-mono-s font-mono text-t3">
                {[
                  currentTrack.codec,
                  currentTrack.bitrateKbps ? `${currentTrack.bitrateKbps} kbps` : null,
                  currentTrack.bitDepth ? `${currentTrack.bitDepth}-bit` : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            )}
            {error && <Text className="text-red text-bs ml-2 flex-1 truncate">{error}</Text>}
          </View>

          {/* Waveform Seek Rail */}
          <View className="gap-1 mt-1">
            <View className="w-full h-[34px] justify-center">
              <Waveform
                trackId={currentTrack.id}
                progress={progress}
                mode={isGold ? 'offline' : 'online'}
                peaks={peaks.data?.peaks}
                onSeek={durationMs ? f => seekTo(Math.round(f * durationMs)) : undefined}
              />
            </View>

            <View className="flex-row justify-between">
              <Text className="text-mono-s font-mono text-t2">{formatDuration(positionMs)}</Text>
              <Text className="text-mono-s font-mono text-t3">
                {durationMs ? `-${formatDuration(remainingMs)}` : formatDuration(currentTrack.durationMs || 0)}
              </Text>
            </View>
          </View>

          {/* Transport Controls */}
          <View className="flex-row items-center justify-between mt-1 px-1">
            <IconButton
              icon={<Icon name="shuffle" size={21} color={shuffle ? (isGold ? '#FFC24D' : '#00E28A') : '#7E7E8C'} />}
              size={44}
              onPress={toggleShuffle}
              accessibilityLabel="Toggle shuffle"
            />
            
            <IconButton
              icon={<Icon name="skip-back" size={26} color="#FFFFFF" />}
              size={44}
              onPress={playPrevious}
              accessibilityLabel="Previous track"
            />

            <Pressable
              onPress={() => setIsPlaying(!isPlaying)}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              className={cn(
                'w-16 h-16 rounded-full items-center justify-center',
                isGold ? 'bg-gold shadow-glow-gold' : 'bg-acc shadow-glow-acc'
              )}
            >
              {buffering && isPlaying ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Icon name={isPlaying ? 'pause' : 'play'} size={27} color="#000000" />
              )}
            </Pressable>

            <IconButton
              icon={<Icon name="skip-forward" size={26} color="#FFFFFF" />}
              size={44}
              onPress={playNext}
              accessibilityLabel="Next track"
            />

            <IconButton
              icon={<Icon name="repeat" size={21} color={repeat !== 'off' ? (isGold ? '#FFC24D' : '#00E28A') : '#7E7E8C'} />}
              size={44}
              onPress={cycleRepeat}
              accessibilityLabel="Toggle repeat"
            />
          </View>

          {/* Bottom Utility Row */}
          <View className="flex-row items-center justify-between mt-1 px-4">
            <IconButton
              icon={<Icon name="lyrics" size={21} color="#7E7E8C" />}
              size={44}
              onPress={() => navigation.navigate('Lyrics')}
              accessibilityLabel="Lyrics"
            />
            <IconButton
              icon={<Icon name="equalizer" size={21} color="#7E7E8C" />}
              size={44}
              onPress={() => navigation.navigate('Equalizer')}
              accessibilityLabel="Equalizer"
            />
            <IconButton
              icon={<Icon name="playlist" size={21} color="#7E7E8C" />}
              size={44}
              onPress={() => navigation.navigate('Queue')}
              accessibilityLabel="Queue"
            />
          </View>
        </View>

        <View className="flex-1" />
      </View>
    </Screen>
  );
}
