import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { SongRow } from '../components/music/SongRow';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { usePlayerStore } from '../store/player';
import { AnimatedView } from '../lib/motion';

export function QueueScreen() {
  const navigation = useNavigation<any>();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const queue = usePlayerStore((state) => state.queue);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);

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
        left={<IconButton icon={<Text className="text-t1 text-h2">↓</Text>} onPress={() => navigation.goBack()} accessibilityLabel="Close queue" />}
        right={<IconButton icon={<Text className="text-t1 text-h2">⋮</Text>} onPress={() => {}} accessibilityLabel="Queue options" />}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="py-2 mb-4 flex-row justify-between items-center">
          <View className="flex-row items-center gap-1.5 px-2 bg-accbg rounded-full h-6">
            <View className="w-1.5 h-1.5 bg-acc rounded-full" />
            <Text className="text-acc text-ls font-bold">ONLINE QUEUE</Text>
          </View>
          <Text className="text-t3 text-bs flex-1 ml-2">{upcomingQueue.length + 1} songs · 2 from server</Text>
          <View className="flex-row">
             <IconButton icon={<Text className="text-t1">🔀</Text>} onPress={() => {}} accessibilityLabel="Shuffle queue" />
             <IconButton icon={<Text className="text-t1">🔁</Text>} onPress={() => {}} accessibilityLabel="Repeat" />
          </View>
        </View>

        <Text className="text-t3 text-ov mb-2">Now playing</Text>
        <View className="-mx-2 bg-s2/50 rounded-lg">
          <SongRow
            track={currentTrack}
            onPress={() => {}}
            isPlaying
            showArtwork
          />
        </View>

        <View className="flex-row justify-between items-center mt-5 mb-2">
          <Text className="text-t3 text-ov">Next in queue</Text>
          <Pressable onPress={() => {}}>
             <Text className="text-acc text-ll">Clear queue</Text>
          </Pressable>
        </View>

        <View className="-mx-2 overflow-hidden">
          {upcomingQueue.map((item, index) => (
            <AnimatedView key={item.id} delay={index * 30}>
              <View className="flex-row items-center pr-2">
                <View className="flex-1">
                  <SongRow
                    track={item}
                    onPress={() => setCurrentTrack(item)}
                    showArtwork
                  />
                </View>
                <IconButton
                  icon={<Text className="text-t3 text-lg">≡</Text>}
                  onPress={() => {}}
                  accessibilityLabel="Reorder track"
                />
              </View>
            </AnimatedView>
          ))}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-s1/95 border-t border-ln2 flex-row gap-2">
        <Button variant="outline" className="flex-1" onPress={() => {}}>Save as playlist</Button>
        <Button variant="outline" className="flex-1" onPress={() => {}}>Add songs</Button>
      </View>
    </Screen>
  );
}
