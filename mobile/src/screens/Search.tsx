import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Field } from '../components/ui/Field';
import { Chip } from '../components/ui/Chip';
import { SongRow } from '../components/music/SongRow';
import { Artwork } from '../components/music/Artwork';
import { StateView } from '../components/ui/StateView';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import type { SearchItem, Track } from '../data/types';
import { songCount } from '../lib/format';
import Icon from '../components/ui/Icon';

const FILTERS = ['all', 'songs', 'albums', 'artists', 'playlists'] as const;
type Filter = (typeof FILTERS)[number];

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const mode = useModeStore((state) => state.mode);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const q = useDebounced(query.trim(), 350);
  const online = mode === 'online';
  const results = useAsync(() => api.search(q, filter), [q, filter], { enabled: online && q.length > 0 });
  const items = q ? results.data?.items ?? [] : [];
  const tracks = items.filter((i): i is SearchItem & Track & { kind: 'track' } => i.kind === 'track');

  const renderItem = ({ item, index }: { item: SearchItem; index: number }) => {
    if (item.kind === 'track') {
      return (
        <SongRow
          track={item}
          onPress={() => playTrack(item, tracks)}
          isActive={currentTrack?.id === item.id}
          index={index}
        />
      );
    }
    const isArtist = item.kind === 'artist';
    const title = item.kind === 'artist' || item.kind === 'playlist' ? item.name : item.title;
    const subtitle =
      item.kind === 'album' ? `Album · ${item.artist}` :
      item.kind === 'artist' ? 'Artist' :
      `Playlist${item.trackCount ? ` · ${songCount(item.trackCount)}` : ''}`;
    const screen = item.kind === 'album' ? 'Album' : item.kind === 'artist' ? 'Artist' : 'Playlist';
    return (
      <Pressable
        onPress={() => navigation.navigate(screen, { id: item.id })}
        className="flex-row items-center px-4 py-2 min-h-[56px] gap-3"
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${subtitle}`}
      >
        <Artwork uri={artworkUrl(item, 140)} size={44} className={isArtist ? 'rounded-full' : undefined} />
        <View className="flex-1">
          <Text className="text-t1 text-tm font-medium" numberOfLines={1}>{title}</Text>
          <Text className="text-t2 text-bs" numberOfLines={1}>{subtitle}</Text>
        </View>
        <Icon name="chevron-right" size={16} color="#5A5A66" />
      </Pressable>
    );
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
             autoCorrect={false}
             returnKeyType="search"
             accessibilityLabel="Search music"
           />
        </View>

        <View className="my-4">
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
             {FILTERS.map((f) => (
               <Chip
                 key={f}
                 label={f.charAt(0).toUpperCase() + f.slice(1)}
                 onPress={() => setFilter(f)}
                 active={filter === f}
               />
             ))}
           </ScrollView>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}:${item.id}`}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 128 }}
          ListEmptyComponent={
            !online ? (
              <StateView empty="Search needs the Sonare server — switch back to Online." />
            ) : !q ? (
              <StateView empty="Search for songs, albums, artists and playlists." />
            ) : (
              <StateView loading={results.loading} error={results.error} onRetry={results.refetch} empty={`No results for "${q}"`} />
            )
          }
        />
      </View>
    </Screen>
  );
}
