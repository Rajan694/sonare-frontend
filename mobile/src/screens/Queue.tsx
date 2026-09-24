import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { SongRow } from '../components/music/SongRow';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { api } from '../data/api';
import { requireAccount } from '../data/accountGate';
import { AnimatedView } from '../lib/motion';
import { songCount } from '../lib/format';
import Icon from '../components/ui/Icon';

export function QueueScreen() {
  const navigation = useNavigation<any>();
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
        <Header title="Queue" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-t3 text-bm">Queue is empty</Text>
        </View>
      </Screen>
    );
  }

  const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
  const upcomingQueue = queue.slice(currentIndex + 1);

  return (
    <Screen scrollable={false} className="bg-s0">
      <Header
        title="Queue"
        left={<IconButton icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Close queue" />}
        right={<IconButton icon={<Icon name="more" size={20} color="#FFFFFF" />} onPress={() => {}} accessibilityLabel="Queue options" />}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="py-2 mb-4 flex-row justify-between items-center">
          <View className="flex-row items-center gap-1.5 px-2 bg-accbg rounded-full h-6">
            <View className="w-1.5 h-1.5 bg-acc rounded-full" />
            <Text className="text-acc text-ls font-bold">ONLINE QUEUE</Text>
          </View>
          <Text className="text-t3 text-bs flex-1 ml-2">{songCount(upcomingQueue.length + 1)}{saved ? ` · ${saved}` : ''}</Text>
          <View className="flex-row">
             <IconButton icon={<Icon name="shuffle" size={20} color={shuffle ? '#00E28A' : '#FFFFFF'} />} onPress={toggleShuffle} accessibilityLabel="Shuffle queue" variant={shuffle ? 'active' : 'default'} />
             <IconButton icon={<Icon name="repeat" size={20} color={repeat !== 'off' ? '#00E28A' : '#FFFFFF'} />} onPress={cycleRepeat} accessibilityLabel={`Repeat: ${repeat}`} variant={repeat !== 'off' ? 'active' : 'default'} />
          </View>
        </View>

        <Text className="text-t3 text-ov mb-2">Now playing</Text>
        <View className="-mx-2 bg-s2/50 rounded-lg">
          <SongRow
            track={currentTrack}
            onPress={() => {}}
            isActive
            showArtwork
          />
        </View>

        <View className="flex-row justify-between items-center mt-5 mb-2">
          <Text className="text-t3 text-ov">Next in queue</Text>
          <Pressable onPress={() => setQueue([currentTrack])} accessibilityRole="button">
             <Text className="text-acc text-ll">Clear queue</Text>
          </Pressable>
        </View>

        <View className="-mx-2 overflow-hidden">
          {upcomingQueue.map((item, index) => (
            <AnimatedView key={item.id} delay={Math.min(index, 12) * 30}>
              <SongRow
                track={item}
                onPress={() => setCurrentTrack(item)}
                showArtwork
                extraAction={{ label: 'Remove from queue', onPress: () => setQueue(queue.filter(t => t.id !== item.id)) }}
              />
            </AnimatedView>
          ))}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-s1/95 border-t border-ln2 flex-row gap-2">
        <Button variant="outline" className="flex-1" onPress={saveAsPlaylist}>Save as playlist</Button>
        <Button variant="outline" className="flex-1" onPress={() => navigation.navigate('Tabs', { screen: 'Search' })}>Add songs</Button>
      </View>
    </Screen>
  );
}
