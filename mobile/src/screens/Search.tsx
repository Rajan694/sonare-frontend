import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Field } from '../components/ui/Field';
import { Chip } from '../components/ui/Chip';
import { SongRow } from '../components/music/SongRow';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { mockTracks } from '../data/mock';
import Icon from '../components/ui/Icon';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'songs' | 'albums' | 'artists' | 'playlists' | 'genres'>('all');
  const mode = useModeStore((state) => state.mode);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const displayTracks = mode === 'offline' 
    ? mockTracks.filter(t => t.source === 'local')
    : mockTracks;

  const filteredTracks = query
    ? displayTracks.filter(t => 
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.artist.toLowerCase().includes(query.toLowerCase())
      )
    : displayTracks;

  const handlePlayTrack = (track: typeof mockTracks[0]) => {
    setCurrentTrack(track);
    setQueue(filteredTracks);
    setIsPlaying(true);
  };

  return (
    <Screen scrollable={false}>
      <Header title="Search" />
      
      <View className="flex-1 pt-4">
        <View className="px-4">
           <Field
             icon={<Icon name="search" size={16} color="#7E7E8C" />}
             placeholder="Songs, albums, artists..."
             value={query}
             onChangeText={setQuery}
             accessibilityLabel="Search music"
           />
        </View>

        <View className="my-4">
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
             {(['all', 'songs', 'albums', 'artists', 'playlists', 'genres'] as const).map((f) => (
               <Chip
                 key={f}
                 label={f.charAt(0).toUpperCase() + f.slice(1)}
                 onPress={() => setFilter(f)}
                 active={filter === f}
               />
             ))}
           </ScrollView>
        </View>

        <View className="flex-1 px-4">
        {query ? (
          <FlatList
            data={filteredTracks}
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
            ListEmptyComponent={
              <View className="py-12 items-center">
                <Text className="text-t3 text-bm">No results found</Text>
              </View>
            }
          />
        ) : (
          <View className="py-12 items-center">
            <Text className="text-t3 text-bm">
              {mode === 'offline' ? 'Search your local library' : 'Search music'}
            </Text>
          </View>
        )}
        </View>
      </View>
    </Screen>
  );
}
