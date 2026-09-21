import React from 'react';
import { View, FlatList, Text } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Chip } from '../components/ui/Chip';
import { SongRow } from '../components/music/SongRow';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { mockTracks } from '../data/mock';

import { SegmentedControl } from '../components/ui/Segmented';
import { useNavigation } from '@react-navigation/native';

export function LibraryScreen() {
  const navigation = useNavigation<any>();
  const setMode = useModeStore((state) => state.setMode);
  const mode = useModeStore((state) => state.mode);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const displayTracks = mode === 'offline' 
    ? mockTracks.filter(t => t.source === 'local')
    : mockTracks;

  const handlePlayTrack = (track: typeof mockTracks[0]) => {
    setCurrentTrack(track);
    setQueue(displayTracks);
    setIsPlaying(true);
  };

  return (
    <Screen scrollable={false}>
      <Header 
        left={
          <View className="pl-1">
             <Text className="text-h1 font-semibold text-t1 text-center" numberOfLines={1}>
                Library
             </Text>
          </View>
        }
        right={
          <SegmentedControl
            options={[
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
            ]}
            value={mode}
            onChange={(value) => {
              if (value === 'offline' && mode === 'online') {
                navigation.navigate('ModeSwitch');
              } else {
                setMode(value as 'online' | 'offline');
              }
            }}
            variant="cloud-device"
          />
        }
      />
      
      <View className="flex-1">
        <View className="flex-row gap-2 px-4 py-4">
          <Chip label="Recently Added" active />
          <Chip label="Most Played" />
          <Chip label="A-Z" />
        </View>

        <FlatList
          data={displayTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SongRow
              track={item}
              onPress={() => handlePlayTrack(item)}
              isPlaying={currentTrack?.id === item.id}
              index={index}
              showIndex
            />
          )}
          contentContainerStyle={{ paddingBottom: 128 }}
        />
      </View>
    </Screen>
  );
}
