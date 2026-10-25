import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Pressable, ScrollView } from 'react-native';
import { useGrid } from '../hooks/useGrid';
import { Text } from '../components/ui/Text';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Artwork } from '../components/music/Artwork';
import { artworkUrl } from '../data/config';
import { StateView } from '../components/ui/StateView';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { api } from '../data/api';
import { useAsync } from '../data/hooks';
import { useAuthStore } from '../data/auth';
import { GuestPrompt } from '../components/ui/GuestPrompt';
import { songCount } from '../lib/format';
import { cn } from '../lib/cn';
import { SegmentedControl } from '../components/ui/Segmented';
import { useNavigation } from '@react-navigation/native';
import { usePhoneTracks } from '../store/localMusic';
import { TrackListView } from '../components/music/TrackListView';
import { DownloadsView } from '../components/music/DownloadsView';
import { useTrackList } from '../hooks/useTrackList';
import type { Track } from '../data/types';

type Tab = 'songs' | 'albums' | 'artists' | 'downloads';

const TABS: { id: Tab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'downloads', label: 'Downloads' },
];

// ---- Offline album/artist grouping ----

interface OfflineAlbum {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
  tracks: Track[];
}

interface OfflineArtist {
  id: string;
  name: string;
  thumbnail?: string;
  tracks: Track[];
}

const groupByAlbum = (tracks: Track[]): OfflineAlbum[] => {
  const map = new Map<string, OfflineAlbum>();
  for (const t of tracks) {
    const key = t.album || 'Unknown album';
    if (!map.has(key)) {
      map.set(key, { id: key, title: key, artist: t.artist, thumbnail: t.thumbnail, tracks: [] });
    }
    map.get(key)!.tracks.push(t);
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
};

const groupByArtist = (tracks: Track[]): OfflineArtist[] => {
  const map = new Map<string, OfflineArtist>();
  for (const t of tracks) {
    const key = t.artist || 'Unknown artist';
    if (!map.has(key)) {
      map.set(key, { id: key, name: key, thumbnail: t.thumbnail, tracks: [] });
    }
    map.get(key)!.tracks.push(t);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const LibraryScreen = () => {
  const grid = useGrid(150, 12);
  const artistGrid = useGrid(96, 8);

  const navigation = useNavigation<any>();
  const setMode = useModeStore((state) => state.setMode);
  const mode = useModeStore((state) => state.mode);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const favouriteCount = useLibraryStore((state) => Object.keys(state.favouriteIds).length);
  const playlistCount = useLibraryStore((state) => state.playlists.length);
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const userId = useAuthStore((state) => state.user?.id);
  const online = mode === 'online';

  const songsState = useTrackList({
    kind: 'all',
    enabled: activeTab === 'songs',
  });

  // Switching tabs leaves selection mode (only then: not when selection mode turns on).
  const onCancelSelection = songsState.onCancelSelection;
  useEffect(() => {
    onCancelSelection();
  }, [activeTab, onCancelSelection]);

  const albums = useAsync(() => api.libraryAlbums(), [userId], {
    enabled: online && !!userId && activeTab === 'albums',
    refetchOnFocus: true,
  });

  const artists = useAsync(() => api.libraryArtists(), [userId, favouriteCount, playlistCount], {
    enabled: online && !!userId && activeTab === 'artists',
    refetchOnFocus: true,
  });

  const phoneTracks = usePhoneTracks();
  const offlineAlbums = useMemo(() => groupByAlbum(phoneTracks), [phoneTracks]);
  const offlineArtists = useMemo(() => groupByArtist(phoneTracks), [phoneTracks]);

  return (
    <Screen scrollable={false}>
      {songsState.selectionMode ? (
        <Header
          left={
            <Text className="text-h1 font-semibold text-t1" numberOfLines={1}>
              {`${songsState.selectedCount} selected`}
            </Text>
          }
          right={
            <View className="flex-row items-center gap-2">
              <Button variant="ghost" size="sm" onPress={songsState.onSelectAll} accessibilityLabel="Select all">
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={songsState.onCancelSelection}
                accessibilityLabel="Cancel selection"
              >
                Cancel
              </Button>
            </View>
          }
        />
      ) : (
        <Header
          left={
            <Text className="text-h1 font-semibold text-t1" numberOfLines={1}>
              Library
            </Text>
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
      )}

      {online && !userId ? (
        <GuestPrompt
          icon="heart"
          title="Your library lives in your account"
          body="Create a free account and every song you favourite is saved here, on this phone and your other devices."
        />
      ) : (
        <View className="flex-1">
          {/* Sub-tabs row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="border-b border-ln flex-grow-0"
            contentContainerStyle={{ paddingHorizontal: 14 }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  className="h-[40px] px-3.5 justify-center relative"
                >
                  <Text className={cn('text-bm font-medium', isActive ? 'text-t1' : 'text-t3')}>{tab.label}</Text>
                  {isActive && <View className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-acc rounded-t-xs" />}
                </Pressable>
              );
            })}
          </ScrollView>

          {activeTab === 'songs' ? (
            <TrackListView state={songsState} />
          ) : activeTab === 'downloads' ? (
            <DownloadsView />
          ) : !online ? (
            activeTab === 'albums' ? (
              offlineAlbums.length === 0 ? (
                <StateView empty="No music on this phone yet. Songs you download show up here." />
              ) : (
                <FlatList
                  key={`offline-albums-${grid.columns}`}
                  data={offlineAlbums}
                  keyExtractor={(a) => a.id}
                  numColumns={grid.columns}
                  columnWrapperStyle={{ gap: 12 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => playTrack(item.tracks[0], item.tracks, { kind: 'Library', name: item.title })}
                      className="p-1 mb-3"
                      style={grid.cell}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title} by ${item.artist}`}
                    >
                      <Artwork uri={artworkUrl(item, 300)} size={160} className="rounded-xl" />
                      <Text className="text-tm font-medium mt-2 text-t1" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text className="text-bs text-t2" numberOfLines={1}>
                        {songCount(item.tracks.length)}
                      </Text>
                    </Pressable>
                  )}
                  contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: 140 }}
                />
              )
            ) : offlineArtists.length === 0 ? (
              <StateView empty="No music on this phone yet. Songs you download show up here." />
            ) : (
              <FlatList
                key={`offline-artists-${artistGrid.columns}`}
                data={offlineArtists}
                keyExtractor={(a) => a.id}
                numColumns={artistGrid.columns}
                columnWrapperStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => playTrack(item.tracks[0], item.tracks, { kind: 'Library', name: item.name })}
                    className="items-center gap-1.5 mb-4"
                    style={artistGrid.cell}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                  >
                    <Artwork uri={artworkUrl(item, 140)} size={96} rings className="rounded-full" />
                    <Text className="text-tm font-medium text-t1 text-center" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-bs text-t3 text-center" numberOfLines={1}>
                      {songCount(item.tracks.length)}
                    </Text>
                  </Pressable>
                )}
                contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: 140 }}
              />
            )
          ) : activeTab === 'albums' ? (
            <FlatList
              key={`albums-${grid.columns}`}
              data={albums.data?.items ?? []}
              keyExtractor={(a) => a.id}
              numColumns={grid.columns}
              columnWrapperStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => navigation.navigate('Album', { id: item.id })}
                  className="p-1 mb-3"
                  style={grid.cell}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} by ${item.artist}`}
                >
                  <Artwork uri={artworkUrl(item, 300)} size={160} className="rounded-xl" />
                  <Text className="text-tm font-medium mt-2 text-t1" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="text-bs text-t2" numberOfLines={1}>
                    {item.artist}
                  </Text>
                </Pressable>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={albums.refetch}
                  tintColor="#00E28A"
                  colors={['#00E28A']}
                />
              }
              ListEmptyComponent={
                <StateView
                  loading={albums.loading && !albums.data}
                  error={albums.error}
                  onRetry={albums.refetch}
                  empty="Albums you save (the heart on an album) show up here."
                />
              }
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: 140 }}
            />
          ) : (
            <FlatList
              key={`artists-${artistGrid.columns}`}
              data={artists.data?.items ?? []}
              keyExtractor={(a) => a.id}
              numColumns={artistGrid.columns}
              columnWrapperStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => navigation.navigate('Artist', { id: item.id })}
                  className="items-center gap-1.5 mb-4"
                  style={artistGrid.cell}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                >
                  <Artwork uri={artworkUrl(item, 140)} size={96} rings className="rounded-full" />
                  <Text className="text-tm font-medium text-t1 text-center" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-bs text-t3 text-center" numberOfLines={1}>
                    {item.following ? 'Following' : item.songCount ? songCount(item.songCount) : 'Artist'}
                  </Text>
                </Pressable>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={artists.refetch}
                  tintColor="#00E28A"
                  colors={['#00E28A']}
                />
              }
              ListEmptyComponent={
                <StateView
                  loading={artists.loading && !artists.data}
                  error={artists.error}
                  onRetry={artists.refetch}
                  empty="Follow artists, like songs or add them to a playlist, and their artists show up here."
                />
              }
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: 140 }}
            />
          )}
        </View>
      )}
    </Screen>
  );
};
