import React from 'react';
import { View, Text, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
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
import { springs } from '../lib/motion';
import Icon from '../components/ui/Icon';
import { TrackDownloadButton } from '../components/music/TrackDownloadButton';
import { useDownloadsStore } from '../store/downloads';
import { openInCurrentTab } from '../navigation/openInCurrentTab';
import { OUTPUT_ICON, usePlayerSheets } from '../components/music/PlayerSheets';
import { outputDetail, useOutputStore } from '../store/output';
import { useSleepTimerStore } from '../store/sleepTimer';

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
  const playingFrom = usePlayerStore((state) => state.playingFrom);
  const output = useOutputStore((state) => state.current);
  const sleepOn = useSleepTimerStore((state) => state.timer.kind !== 'off');
  const showSheet = usePlayerSheets((state) => state.show);
  // A finished download plays from the phone too.
  const onDevice = useDownloadsStore(
    (state) =>
      currentTrack?.source === 'local' ||
      (!!currentTrack && state.items[currentTrack.id]?.status === 'done' && !state.items[currentTrack.id]?.missing),
  );
  const peaks = useAsync(() => api.peaks(currentTrack!.id, 76), [currentTrack?.id], {
    enabled: currentTrack?.source === 'server',
  });
  const progress = durationMs ? Math.min(1, positionMs / durationMs) : 0;
  const remainingMs = durationMs ? Math.max(0, durationMs - positionMs) : 0;

  const navigation = useNavigation<any>();
  // The output card and the extra utility buttons need room on shorter phones.
  const { width, height } = useWindowDimensions();
  const artSize = width - 40 >= 306 && height >= 760 ? 306 : width - 40 >= 240 && height >= 640 ? 240 : 200;

  const translateX = useSharedValue(0);

  const handleGestureEnd = (event: PanGestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;

    if (translationX > SWIPE_THRESHOLD) {
      translateX.value = withSpring(400, springs.fling, () => {
        runOnJS(playPrevious)();
        translateX.value = 0;
      });
    } else if (translationX < -SWIPE_THRESHOLD) {
      translateX.value = withSpring(-400, springs.fling, () => {
        runOnJS(playNext)();
        translateX.value = 0;
      });
    } else {
      translateX.value = withSpring(0, springs.snapBack);
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
          left={
            <IconButton
              icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Close now playing"
            />
          }
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-t3 text-bm">Nothing playing</Text>
        </View>
      </Screen>
    );
  }

  const isGold = mode === 'offline' || currentTrack.source === 'local';
  const accent = isGold ? '#FFC24D' : '#00E28A';
  // Where the queue came from; a song's own album when it was started from elsewhere.
  const eyebrow = playingFrom ?? (currentTrack.album ? { kind: 'Album', name: currentTrack.album } : null);

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
        title={
          eyebrow ? (
            <View className="items-center">
              <Text className="text-[11px] font-semibold tracking-[0.9px] text-t3 uppercase">
                PLAYING FROM {eyebrow.kind}
              </Text>
              <Text className="text-ll font-semibold text-t1 truncate max-w-[200px]" numberOfLines={1}>
                {eyebrow.name}
              </Text>
            </View>
          ) : undefined
        }
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
              <Artwork
                uri={artworkUrl(currentTrack, 640)}
                fallbackUri={artworkUrl(currentTrack, 300)}
                size={artSize}
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
                  openInCurrentTab('Artist', { id: currentTrack.artistId });
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
                  useLibraryStore
                    .getState()
                    .toggleFavourite(currentTrack)
                    .catch(() => {}),
                )
              }
              accessibilityLabel={favourite ? 'Remove from favourites' : 'Add to favourites'}
            />
            <IconButton
              icon={<Icon name="plus" size={23} color="#9A9AA8" />}
              size={44}
              onPress={() =>
                requireAccount('Create a free account to make playlists.', () =>
                  useTrackMenuStore.getState().open(currentTrack, { view: 'playlists' }),
                )
              }
              accessibilityLabel="Add to playlist"
            />
            <TrackDownloadButton track={currentTrack} />
          </View>

          {/* Badges line: Source pill + Codec */}
          <View className="flex-row items-center gap-2">
            <Badge
              label={onDevice ? 'ON THIS DEVICE' : 'STREAMING'}
              variant={onDevice ? 'local' : 'cloud'}
              icon={
                <Icon name={onDevice ? 'smartphone' : 'cloud'} size={12} color={onDevice ? '#FFC24D' : '#00E28A'} />
              }
            />
            {currentTrack.codec && (
              <Text className="text-mono-s font-mono text-t3">
                {[
                  currentTrack.codec,
                  currentTrack.bitrateKbps ? `${currentTrack.bitrateKbps} kbps` : null,
                  currentTrack.bitDepth ? `${currentTrack.bitDepth}-bit` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
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
                onSeek={durationMs ? (f) => seekTo(Math.round(f * durationMs)) : undefined}
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
                isGold ? 'bg-gold shadow-glow-gold' : 'bg-acc shadow-glow-acc',
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
              icon={
                <Icon name="repeat" size={21} color={repeat !== 'off' ? (isGold ? '#FFC24D' : '#00E28A') : '#7E7E8C'} />
              }
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
              icon={<Icon name="output" size={21} color="#7E7E8C" />}
              size={44}
              onPress={() => showSheet('output')}
              accessibilityLabel="Audio output"
            />
            <IconButton
              icon={<Icon name="clock" size={21} color={sleepOn ? accent : '#7E7E8C'} />}
              size={44}
              onPress={() => showSheet('sleep')}
              accessibilityLabel={sleepOn ? 'Sleep timer on' : 'Sleep timer'}
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

        {/* Audio output card (design M09) */}
        <Pressable
          onPress={() => showSheet('output')}
          className="flex-row items-center gap-3.5 px-4 py-3 bg-s1 border border-ln rounded-xl"
          accessibilityRole="button"
          accessibilityLabel={`Audio output: ${output?.name ?? 'Phone speaker'}`}
        >
          <Icon name={output ? OUTPUT_ICON[output.type] : 'speaker'} size={20} color={accent} />
          <View className="flex-1 gap-0.5 min-w-0">
            <Text className="text-tm font-medium text-t1" numberOfLines={1}>
              {output?.name ?? 'Phone speaker'}
            </Text>
            <Text className="text-bs text-t3" numberOfLines={1}>
              {output?.type === 'speaker' || !output
                ? onDevice
                  ? 'Playing locally · no network used'
                  : 'Streaming to this phone'
                : outputDetail(output)}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="#7E7E8C" />
        </Pressable>
      </View>
    </Screen>
  );
}
