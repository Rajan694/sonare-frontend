import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { SongRow } from '../components/music/SongRow';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { api } from '../data/api';
import { requireAccount } from '../data/accountGate';
import { AnimatedView } from '../lib/motion';
import { songCount } from '../lib/format';
import Icon from '../components/ui/Icon';

export function QueueScreen() {
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
  const [saved, setSaved] = useState<string | null>(null);

  const saveAsPlaylist = () =>
    requireAccount('Create a free account to save your queue as a playlist.', async () => {
      const name = `Queue · ${new Date().toLocaleDateString()}`;
      // Read the queue at run time: after a sign-in detour this runs later than the tap.
      const tracks = usePlayerStore.getState().queue;
      try {
        const playlist = await useLibraryStore.getState().createPlaylist(name);
        await api.addToPlaylist(playlist.id, tracks.map(t => t.id));
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
          left={<IconButton icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Close queue" />}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-t3 text-bm">Queue is empty</Text>
        </View>
      </Screen>
    );
  }

  const isGold = mode === 'offline' || currentTrack.source === 'local';
  const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
  const upcomingQueue = queue.slice(currentIndex + 1);
  const serverCount = queue.filter(t => t.source === 'server').length;

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header
        title={<Text className="text-ll font-semibold text-t1">Queue</Text>}
        left={<IconButton icon={<Icon name="chevron-down" size={22} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Close queue" />}
        right={<IconButton icon={<Icon name="more" size={20} color="#FFFFFF" />} onPress={() => {}} accessibilityLabel="Queue options" />}
      />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Top Status & Mode Strip */}
        <View className="py-2.5 mb-2 flex-row justify-between items-center">
          <View className={`flex-row items-center gap-1.5 px-2.5 ${isGold ? 'bg-goldbg' : 'bg-accbg'} rounded-full h-[26px]`}>
            <View className={`w-1.5 h-1.5 ${isGold ? 'bg-gold' : 'bg-acc'} rounded-full`} />
            <Text className={`${isGold ? 'text-gold' : 'text-acc'} text-ls font-semibold uppercase`}>
              {isGold ? 'OFFLINE QUEUE' : 'ONLINE QUEUE'}
            </Text>
          </View>
          <Text className="text-t3 text-bs flex-1 ml-2.5 truncate">
            {songCount(queue.length)}
            {serverCount > 0 ? ` · ${serverCount} from server` : ''}
            {saved ? ` · ${saved}` : ''}
          </Text>
          <View className="flex-row items-center gap-1">
            <IconButton
              icon={<Icon name="shuffle" size={18} color={shuffle ? (isGold ? '#FFC24D' : '#00E28A') : '#9A9AA8'} />}
              size={32}
              onPress={toggleShuffle}
              accessibilityLabel="Shuffle queue"
            />
            <IconButton
              icon={<Icon name="repeat" size={18} color={repeat !== 'off' ? (isGold ? '#FFC24D' : '#00E28A') : '#9A9AA8'} />}
              size={32}
              onPress={cycleRepeat}
              accessibilityLabel={`Repeat: ${repeat}`}
            />
          </View>
        </View>

        {/* Now Playing Section */}
        <Text className="text-t3 text-ov font-semibold uppercase mb-2 ml-0.5">Now playing</Text>
        <View className="-mx-2.5 bg-s2 border border-ln2 rounded-md mb-4">
          <SongRow
            track={currentTrack}
            onPress={() => {}}
            isActive
            showArtwork
          />
        </View>

        {/* Next in queue header */}
        <View className="flex-row justify-between items-center mt-2 mb-2 px-0.5">
          <Text className="text-t3 text-ov font-semibold uppercase">Next in queue</Text>
          {upcomingQueue.length > 0 && (
            <Pressable onPress={() => setQueue([currentTrack])} accessibilityRole="button">
              <Text className={isGold ? 'text-gold text-ll font-medium' : 'text-acc text-ll font-medium'}>Clear queue</Text>
            </Pressable>
          )}
        </View>

        {/* Upcoming Queue List */}
        {upcomingQueue.length === 0 ? (
          <Text className="text-t3 text-bs py-4 px-1">End of queue</Text>
        ) : (
          <View className="-mx-2.5 gap-0.5 overflow-hidden">
            {upcomingQueue.map((item, index) => (
              <AnimatedView key={`${item.id}-${index}`} delay={Math.min(index, 12) * 30}>
                <SongRow
                  track={item}
                  onPress={() => setCurrentTrack(item)}
                  showArtwork
                  extraAction={{ label: 'Remove from queue', onPress: () => setQueue(queue.filter(t => t.id !== item.id)) }}
                />
              </AnimatedView>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Footer */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-s1 border-t border-ln2 flex-row gap-2.5">
        <Button variant="outline" size="sm" className="flex-1" icon={<Icon name="plus" size={14} color="#FFFFFF" />} onPress={saveAsPlaylist}>
          Save as playlist
        </Button>
        <Button variant="outline" size="sm" className="flex-1" icon={<Icon name="playlist" size={14} color="#FFFFFF" />} onPress={() => navigation.navigate('Tabs', { screen: 'Search' })}>
          Add songs
        </Button>
      </View>
    </Screen>
  );
}
