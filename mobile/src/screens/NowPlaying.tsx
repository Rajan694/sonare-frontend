import React, { useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text } from '../components/ui/Text';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Artwork } from '../components/music/Artwork';
import { Ambient } from '../components/music/Ambient';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { useTrackMenuStore } from '../store/trackMenu';
import { useLyricsAvailabilityStore } from '../store/lyricsAvailability';
import { useDevicePrefsStore } from '../store/devicePrefs';
import { artworkUrl } from '../data/config';
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
import { useWaveform } from '../store/waveforms';
import { openInCurrentTab } from '../navigation/openInCurrentTab';

const SWIPE_THRESHOLD = 50;

export const NowPlayingScreen = () => {
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
  const queue = usePlayerStore((state) => state.queue);
  const index = usePlayerStore((state) => state.index);
  const playAt = usePlayerStore((state) => state.playAt);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const buffering = usePlayerStore((state) => state.buffering);
  const error = usePlayerStore((state) => state.error);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const favourite = useLibraryStore((state) => !!currentTrack && !!state.favouriteIds[currentTrack.id]);
  const playingFrom = usePlayerStore((state) => state.playingFrom);
  // A finished download plays from the phone too.
  const onDevice = useDownloadsStore(
    (state) =>
      currentTrack?.source === 'local' ||
      (!!currentTrack && state.items[currentTrack.id]?.status === 'done' && !state.items[currentTrack.id]?.missing),
  );
  const wave = useWaveform(currentTrack, 76);
  const progress = durationMs ? Math.min(1, positionMs / durationMs) : 0;
  const remainingMs = durationMs ? Math.max(0, durationMs - positionMs) : 0;

  // Ask once per song whether its lyrics can be found, so a miss shows a disabled Lyrics button.
  const lyricsScript = useDevicePrefsStore((state) => state.lyricsScript);
  const lyricsStatus = useLyricsAvailabilityStore((state) =>
    currentTrack ? state.status[currentTrack.id] : undefined,
  );
  const lyricsUnavailable = lyricsStatus === 'unavailable';
  useEffect(() => {
    if (currentTrack) useLyricsAvailabilityStore.getState().check(currentTrack, lyricsScript);
  }, [currentTrack, lyricsScript]);

  // The next few queue entries after the one playing; tapping one jumps to it.
  const upNext = index >= 0 ? queue.slice(index + 1, index + 5) : [];

  const navigation = useNavigation<any>();
  // The extra utility buttons need room on shorter phones.
  const { width, height } = useWindowDimensions();
  const artSize = width - 44 >= 314 && height >= 780 ? 314 : width - 44 >= 240 && height >= 640 ? 240 : 200;

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
  // Where the queue came from; a song's own album when it was started from elsewhere.
  const eyebrow = playingFrom ?? (currentTrack.album ? { kind: 'Album', name: currentTrack.album } : null);

  return (
    <Screen scrollable={false} className="bg-bg">
      <Ambient uri={artworkUrl(currentTrack, 64)} />
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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 4, paddingBottom: 22 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Artwork matching M09 (~306px) */}
        <PanGestureHandler onGestureEvent={handleGestureEvent as any} onEnded={handleGestureEnd as any}>
          <AnimatedViewComponent style={artworkStyle} className="self-center mt-3 mb-[26px]">
            <View className="relative">
              <Artwork
                uri={artworkUrl(currentTrack, 640)}
                fallbackUri={artworkUrl(currentTrack, 300)}
                size={artSize}
                rings
                className="rounded-xl shadow-e4"
                sharedTransitionTag={`artwork-${currentTrack.id}`}
              />
            </View>
          </AnimatedViewComponent>
        </PanGestureHandler>

        <View className="gap-2.5">
          {/* Title and Heart */}
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-1 min-w-0">
              <Text className="text-h1 font-semibold text-t1 truncate" numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text
                className="text-tm text-t2 font-medium truncate"
                numberOfLines={1}
                onPress={() => {
                  const aid = currentTrack.artistId;
                  if (!aid || String(aid).startsWith('local:')) return;
                  navigation.goBack();
                  openInCurrentTab('Artist', { id: aid });
                }}
                accessibilityRole={
                  currentTrack.artistId && !String(currentTrack.artistId).startsWith('local:') ? 'link' : undefined
                }
              >
                {currentTrack.artist}
              </Text>
            </View>
            <IconButton
              icon={
                <Icon
                  name={favourite ? 'heart-filled' : 'heart'}
                  size={23}
                  color={favourite ? (isGold ? '#FFC24D' : '#00E28A') : '#9A9AA8'}
                />
              }
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
            <View
              className={cn(
                'flex-row items-center gap-1.5 h-6 px-[9px] rounded-full',
                onDevice ? 'bg-goldbg' : 'bg-accbg',
              )}
            >
              <Icon name={onDevice ? 'smartphone' : 'cloud'} size={13} color={onDevice ? '#FFC24D' : '#00E28A'} />
              <Text className={cn('text-ls', onDevice ? 'text-gold' : 'text-acc')}>
                {onDevice ? 'ON THIS DEVICE' : 'STREAMING'}
              </Text>
            </View>
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
            {error && (
              <View className="flex-row items-center gap-2 ml-2 flex-1 min-w-0">
                <Text className="text-red text-bs flex-1 truncate">{error}</Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => usePlayerStore.getState().retry()}
                  accessibilityLabel="Retry"
                >
                  Retry
                </Button>
              </View>
            )}
          </View>

          {/* Waveform Seek Rail */}
          <View className="gap-1 mt-1">
            <View className="w-full h-[34px] justify-center">
              <Waveform
                trackId={currentTrack.id}
                progress={progress}
                mode={isGold ? 'offline' : 'online'}
                peaks={wave?.peaks}
                real={wave?.real}
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
              icon={<Icon name="shuffle" size={21} color={shuffle ? (isGold ? '#FFC24D' : '#00E28A') : '#9A9AA8'} />}
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
                <Icon
                  name={repeat === 'one' ? 'repeat-one' : 'repeat'}
                  size={21}
                  color={repeat !== 'off' ? (isGold ? '#FFC24D' : '#00E28A') : '#9A9AA8'}
                />
              }
              size={44}
              onPress={cycleRepeat}
              accessibilityLabel={repeat === 'off' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat one'}
            />
          </View>

          {/* Bottom Utility Row */}
          <View className="flex-row items-center justify-between mt-2">
            <IconButton
              icon={<Icon name="lyrics" size={21} color={lyricsUnavailable ? '#5A5A66' : '#9A9AA8'} />}
              size={44}
              onPress={() => navigation.navigate('Lyrics')}
              accessibilityLabel={lyricsUnavailable ? 'Lyrics not available' : 'Lyrics'}
              disabled={lyricsUnavailable}
            />
            <IconButton
              icon={<Icon name="equalizer" size={21} color="#9A9AA8" />}
              size={44}
              onPress={() => navigation.navigate('Equalizer')}
              accessibilityLabel="Equalizer"
            />
            <IconButton
              icon={<Icon name="queue" size={21} color="#9A9AA8" />}
              size={44}
              onPress={() => navigation.navigate('Queue')}
              accessibilityLabel="Queue"
            />
          </View>
        </View>

        {/* Up next: the queue entries after this one; hidden when nothing comes next. */}
        {upNext.length > 0 && (
          <View className="gap-1 mt-4 pt-3 border-t border-ln">
            <View className="flex-row items-center justify-between">
              <Text className="text-ov font-semibold text-t3 uppercase">Up next</Text>
              <Pressable
                onPress={() => navigation.navigate('Queue')}
                accessibilityRole="button"
                accessibilityLabel="Open queue"
              >
                <Text className="text-t2 text-ll">Open queue</Text>
              </Pressable>
            </View>
            <View className="gap-0.5 mt-1">
              {upNext.map((track, i) => (
                <Pressable
                  key={`${track.id}:${i}`}
                  onPress={() => playAt(index + 1 + i)}
                  className="flex-row items-center gap-3 py-1.5 rounded-md active:bg-s2"
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${track.title} by ${track.artist}`}
                >
                  <Artwork uri={artworkUrl(track, 64)} size={40} className="rounded-sm" />
                  <View className="flex-1 min-w-0 gap-0.5">
                    <Text numberOfLines={1} className="text-tm font-medium text-t1">
                      {track.title}
                    </Text>
                    <Text numberOfLines={1} className="text-t2 text-bs">
                      {track.artist}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};
