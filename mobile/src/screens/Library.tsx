import React, { useState } from 'react';
import { View, FlatList, Text, RefreshControl } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Chip } from '../components/ui/Chip';
import { SongRow } from '../components/music/SongRow';
import { StateView } from '../components/ui/StateView';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { api } from '../data/api';
import { useAsync } from '../data/hooks';
import { useAuthStore } from '../data/auth';
import { GuestPrompt } from '../components/ui/GuestPrompt';

import { SegmentedControl } from '../components/ui/Segmented';
import { useNavigation } from '@react-navigation/native';

type Sort = 'addedAt' | 'playCount' | 'title';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'addedAt', label: 'Recently Added' },
  { value: 'playCount', label: 'Most Played' },
  { value: 'title', label: 'A-Z' },
];

/** Your library is the songs you've saved: every favourite, in the order you pick. */
export function LibraryScreen() {
  const navigation = useNavigation<any>();
  const setMode = useModeStore((state) => state.setMode);
  const mode = useModeStore((state) => state.mode);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  // Re-read the list when a heart is toggled anywhere in the app.
  const favouriteCount = useLibraryStore((state) => Object.keys(state.favouriteIds).length);
  const [sort, setSort] = useState<Sort>('addedAt');
  const userId = useAuthStore((state) => state.user?.id);

  const online = mode === 'online';
  const library = useAsync(() => api.libraryTracks(sort), [sort, favouriteCount, userId], {
    enabled: online && !!userId,
    refetchOnFocus: true,
  });
  const tracks = (library.data?.items ?? []).filter(t => t.source === 'server');

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
                navigation.navigate('ModeSwitch', { targetMode: 'offline' });
              } else {
                setMode(value as 'online' | 'offline');
              }
            }}
            variant="cloud-device"
          />
        }
      />

      {online && !userId ? (
        <GuestPrompt
          icon="heart"
          title="Your library lives in your account"
          body="Create a free account and every song you favourite is saved here, on this phone and your other devices."
        />
      ) : (
      <View className="flex-1">
        <View className="flex-row gap-2 px-4 py-4">
          {SORTS.map(s => (
            <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
          ))}
        </View>

        <FlatList
          data={online ? tracks : []}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SongRow
              track={item}
              onPress={() => playTrack(item, tracks)}
              isActive={currentTrack?.id === item.id}
              index={index}
              showIndex
            />
          )}
          refreshControl={<RefreshControl refreshing={false} onRefresh={library.refetch} tintColor="#00E28A" colors={['#00E28A']} />}
          ListEmptyComponent={
            <StateView
              loading={online && library.loading && !library.data}
              error={library.error}
              onRetry={library.refetch}
              empty={online
                ? 'Songs you favourite show up here. Long-press any song and choose "Add to favourites".'
                : 'No music on this device yet.'}
            />
          }
          contentContainerStyle={{ paddingBottom: 128 }}
        />
      </View>
      )}
    </Screen>
  );
}
