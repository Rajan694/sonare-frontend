import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/ui/Text';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Artwork } from '../components/music/Artwork';
import { Ambient } from '../components/music/Ambient';
import { SourceGlyph } from '../components/music/SourceGlyph';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { api } from '../data/api';
import { requireAccount } from '../data/accountGate';
import { AnimatedView, springs } from '../lib/motion';
import { formatDuration, songCount } from '../lib/format';
import { artworkUrl } from '../data/config';
import { cn } from '../lib/cn';
import type { Track } from '../data/types';
import Icon from '../components/ui/Icon';

export const QueueScreen = () => {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const queue = usePlayerStore((state) => state.queue);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState<string | null>(null);

  const saveAsPlaylist = () =>
    requireAccount('Create a free account to save your queue as a playlist.', async () => {
      const name = `Queue · ${new Date().toLocaleDateString()}`;
      // Read the queue at run time: after a sign-in detour this runs later than the tap.
      const tracks = usePlayerStore.getState().queue;
      try {
        const playlist = await useLibraryStore.getState().createPlaylist(name);
        await api.addToPlaylist(
          playlist.id,
          tracks.map((t) => t.id),
        );
        await useLibraryStore.getState().reloadPlaylists();
        setSaved(`Saved as "${name}"`);
      } catch (e: any) {
        setSaved(e?.message || 'Could not save the queue');
      }
    });

  if (!currentTrack) {
    return (
      <Screen>
        <Header
          title="Queue"
          left={
            <IconButton
              icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Close queue"
            />
          }
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-t3 text-bm">Queue is empty</Text>
        </View>
      </Screen>
    );
  }

  const isGold = mode === 'offline' || currentTrack.source === 'local';
  const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
  const upcomingQueue = queue.slice(currentIndex + 1);
  const serverCount = queue.filter((t) => t.source === 'server').length;

  const accent = isGold ? '#FFC24D' : '#00E28A';
  const progress = durationMs ? Math.min(1, positionMs / durationMs) : 0;
  const footerHeight = 72 + insets.bottom;

  /** Moves the upcoming track at `from` (an index into the whole queue) by `by` rows. */
  const move = (from: number, by: number) => {
    const to = Math.max(currentIndex + 1, Math.min(queue.length - 1, from + by));
    if (to === from) return;
    const next = [...queue];
    const [track] = next.splice(from, 1);
    next.splice(to, 0, track);
    setQueue(next);
  };

  return (
    <Screen scrollable={false} className="bg-bg">
      <Ambient uri={artworkUrl(currentTrack, 64)} />
      <Header
        title={<Text className="text-ll font-semibold text-t1">Queue</Text>}
        left={
          <IconButton
            icon={<Icon name="chevron-down" size={22} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close queue"
          />
        }
        right={
          <IconButton
            icon={<Icon name="more" size={20} color="#FFFFFF" />}
            onPress={saveAsPlaylist}
            accessibilityLabel="Save queue as a playlist"
          />
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: footerHeight + 24 }}
      >
        {/* Mode pill, counts, shuffle / repeat */}
        <View className="pb-3 flex-row justify-between items-center">
          <View
            className={cn(
              'flex-row items-center gap-1.5 px-2.5 rounded-full h-[26px]',
              isGold ? 'bg-goldbg' : 'bg-accbg',
            )}
          >
            <Icon name={isGold ? 'smartphone' : 'cloud'} size={13} color={accent} />
            <Text className={cn('text-ls font-semibold uppercase', isGold ? 'text-gold' : 'text-acc')}>
              {isGold ? 'OFFLINE QUEUE' : 'ONLINE QUEUE'}
            </Text>
          </View>
          <Text className="text-t3 text-bs flex-1 ml-2.5" numberOfLines={1}>
            {songCount(queue.length)}
            {serverCount > 0 ? ` · ${serverCount} from server` : ''}
            {saved ? ` · ${saved}` : ''}
          </Text>
          <View className="flex-row items-center gap-1">
            <IconButton
              icon={<Icon name="shuffle" size={18} color={shuffle ? accent : '#9A9AA8'} />}
              size={32}
              onPress={toggleShuffle}
              accessibilityLabel="Shuffle queue"
            />
            <IconButton
              icon={
                <Icon
                  name={repeat === 'one' ? 'repeat-one' : 'repeat'}
                  size={18}
                  color={repeat !== 'off' ? accent : '#9A9AA8'}
                />
              }
              size={32}
              onPress={cycleRepeat}
              accessibilityLabel={`Repeat: ${repeat}`}
            />
          </View>
        </View>

        {/* Now playing (design M12): the current song with its progress and a pause button */}
        <Text className="text-t3 text-ov uppercase mb-2">Now playing</Text>
        <View className="-mx-2 flex-row items-center gap-3 p-2 bg-s2 border border-ln2 rounded-md mb-6">
          <Artwork uri={artworkUrl(currentTrack, 140)} size={48} className="rounded-sm" />
          <View className="flex-1 gap-1.5 min-w-0">
            <View className="flex-row items-center gap-1.5 min-w-0">
              <Text className={cn('text-tm shrink', isGold ? 'text-gold' : 'text-acc')} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <SourceGlyph source={currentTrack.source} />
            </View>
            <View className="flex-row items-center gap-2.5">
              <View className="flex-1 h-1 bg-ln2 rounded-full justify-center">
                <View
                  className={cn('h-full rounded-full', isGold ? 'bg-gold' : 'bg-acc')}
                  style={{ width: `${progress * 100}%` }}
                />
                <View className="absolute w-3 h-3 -ml-1.5 rounded-full bg-t1" style={{ left: `${progress * 100}%` }} />
              </View>
              <Text className="text-mono-s font-mono text-t3">
                -{formatDuration(Math.max(0, (durationMs || currentTrack.durationMs || 0) - positionMs))}
              </Text>
            </View>
          </View>
          <IconButton
            icon={<Icon name={isPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />}
            size={40}
            onPress={() => setIsPlaying(!isPlaying)}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          />
        </View>

        {/* Next in queue */}
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-t3 text-ov uppercase">Next in queue</Text>
          {upcomingQueue.length > 0 && (
            <Pressable onPress={() => setQueue([currentTrack])} accessibilityRole="button" hitSlop={8}>
              <Text className={cn('text-ll', isGold ? 'text-gold' : 'text-acc')}>Clear queue</Text>
            </Pressable>
          )}
        </View>

        {upcomingQueue.length === 0 ? (
          <Text className="text-t3 text-bs py-4">End of queue</Text>
        ) : (
          <View className="-mx-2">
            {upcomingQueue.map((item, i) => {
              const index = currentIndex + 1 + i;
              return (
                <AnimatedView key={`${item.id}-${index}`} delay={Math.min(i, 12) * 30}>
                  <QueueRow
                    track={item}
                    onPress={() => setCurrentTrack(item)}
                    onRemove={() => setQueue(queue.filter((_, j) => j !== index))}
                    onMove={(by) => move(index, by)}
                  />
                </AnimatedView>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer actions, clear of the system navigation bar */}
      <View
        className="absolute bottom-0 left-0 right-0 px-5 pt-4 bg-s1 border-t border-ln flex-row gap-2.5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          variant="outline"
          className="flex-1"
          icon={<Icon name="plus" size={16} color="#FFFFFF" />}
          onPress={saveAsPlaylist}
        >
          Save as playlist
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          icon={<Icon name="playlist-add" size={16} color="#FFFFFF" />}
          onPress={() => navigation.navigate('Tabs', { screen: 'Search' })}
        >
          Add songs
        </Button>
      </View>
    </Screen>
  );
};

const ROW_HEIGHT = 60;

/** A queued song: tap to play it, × to drop it, drag the handle to move it up or down. */
const QueueRow = ({
  track,
  onPress,
  onRemove,
  onMove,
}: {
  track: Track;
  onPress: () => void;
  onRemove: () => void;
  onMove: (by: number) => void;
}) => {
  const dragY = useSharedValue(0);
  // The end event carries no translation, so the last update's is kept here.
  const lastY = useRef(0);
  const [dragging, setDragging] = useState(false);
  const pan = usePanGesture({
    runOnJS: true,
    disableReanimated: true,
    minDistance: 0,
    onBegin: () => {
      lastY.current = 0;
      setDragging(true);
    },
    onUpdate: (e) => {
      lastY.current = e.translationY;
      dragY.value = e.translationY;
    },
    onFinalize: () => {
      setDragging(false);
      dragY.value = withSpring(0, springs.slide);
      onMove(Math.round(lastY.current / ROW_HEIGHT));
    },
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  return (
    <Animated.View style={[style, dragging && { zIndex: 10 }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${track.title} by ${track.artist}`}
        className={cn('flex-row items-center gap-3 px-2 rounded-md', dragging && 'bg-s2 border border-ln2')}
        style={{ height: ROW_HEIGHT }}
      >
        <Artwork uri={artworkUrl(track, 140)} size={44} className="rounded-sm" />
        <View className="flex-1 gap-0.5 min-w-0">
          <View className="flex-row items-center gap-1.5 min-w-0">
            <Text className="text-tm text-t1 shrink" numberOfLines={1}>
              {track.title}
            </Text>
            <SourceGlyph source={track.source} />
          </View>
          <Text className="text-bs text-t2" numberOfLines={1}>
            {track.album ? `${track.artist} · ${track.album}` : track.artist}
          </Text>
        </View>
        <IconButton
          icon={<Icon name="close" size={16} color="#7E7E8C" />}
          size={32}
          onPress={onRemove}
          accessibilityLabel={`Remove ${track.title} from the queue`}
        />
        <GestureDetector gesture={pan}>
          <View
            className="w-8 h-11 items-center justify-center"
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`Reorder ${track.title}`}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => onMove(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          >
            <Icon name="drag" size={16} color="#5A5A66" />
          </View>
        </GestureDetector>
      </Pressable>
    </Animated.View>
  );
};
