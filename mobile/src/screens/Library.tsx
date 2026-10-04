import React, { useState } from 'react';
import { View, FlatList, RefreshControl, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '../components/ui/Text';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { SongRow } from '../components/music/SongRow';
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
import Icon, { type IconName } from '../components/ui/Icon';
import { OptionSheet } from '../components/ui/OptionSheet';
import { DEFAULT_GENRES, GenreCard, genreQuery } from '../components/music/GenreCard';
import { songCount } from '../lib/format';
import { cn } from '../lib/cn';
import { SegmentedControl } from '../components/ui/Segmented';
import { useNavigation } from '@react-navigation/native';
import { downloadedTracks, useDownloadsStore } from '../store/downloads';

type Tab = 'songs' | 'albums' | 'artists' | 'genres';
type Sort = 'addedAt' | 'playCount' | 'title';

// Folders are in Settings → Music folders; a Library tab for them only opened that screen.
const TABS: { id: Tab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'genres', label: 'Genres' },
];

const SORTS: { value: Sort; label: string; icon: IconName }[] = [
  { value: 'addedAt', label: 'Recently added', icon: 'clock' },
  { value: 'playCount', label: 'Most played', icon: 'visualizer' },
  { value: 'title', label: 'A-Z', icon: 'sort' },
];

const LIBRARY_FROM = { kind: 'Library', name: 'Your songs' };

export function LibraryScreen() {
  const { width: screenWidth } = useWindowDimensions();
  // Grid cells get an exact width: flex-1 would stretch the items of a short last row.
  const cell = (columns: number, gap: number) => ({ width: (screenWidth - 24 - gap * (columns - 1)) / columns });
  const navigation = useNavigation<any>();
  const setMode = useModeStore((state) => state.setMode);
  const mode = useModeStore((state) => state.mode);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const favouriteCount = useLibraryStore((state) => Object.keys(state.favouriteIds).length);
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const [sort, setSort] = useState<Sort>('addedAt');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  /** Filter (M05 funnel): only songs saved on this phone. */
  const [onPhoneOnly, setOnPhoneOnly] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const userId = useAuthStore((state) => state.user?.id);
  const playlistCount = useLibraryStore((state) => state.playlists.length);

  const online = mode === 'online';
  const library = useAsync(() => api.libraryTracks(sort), [sort, favouriteCount, userId], {
    enabled: online && !!userId && activeTab === 'songs',
    refetchOnFocus: true,
  });
  const albums = useAsync(() => api.libraryAlbums(), [userId], {
    enabled: online && !!userId && activeTab === 'albums',
    refetchOnFocus: true,
  });
  // Liked and playlisted songs bring their artists along, so refetch when those change.
  const artists = useAsync(() => api.libraryArtists(), [userId, favouriteCount, playlistCount], {
    enabled: online && !!userId && activeTab === 'artists',
    refetchOnFocus: true,
  });
  const genres = useAsync(() => api.genres(), [], { enabled: online && activeTab === 'genres' });

  const downloads = useDownloadsStore((state) => state.items);
  const serverTracks = (library.data?.items ?? []).filter((t) => t.source === 'server');
  // Offline, the library is what's been downloaded to this phone.
  const offlineTracks = React.useMemo(() => downloadedTracks(downloads), [downloads]);
  const displayTracks = !online
    ? offlineTracks
    : onPhoneOnly
      ? serverTracks.filter((t) => downloads[t.id]?.status === 'done')
      : serverTracks;

  const onPlayAll = () => {
    if (displayTracks.length > 0) {
      playTrack(displayTracks[0], displayTracks, LIBRARY_FROM);
    }
  };

  const onShuffle = () => {
    if (displayTracks.length > 0) {
      const shuffled = [...displayTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled, LIBRARY_FROM);
    }
  };

  return (
    <Screen scrollable={false}>
      {/* Header with Title and Mode segmented control */}
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

      {online && !userId ? (
        <GuestPrompt
          icon="heart"
          title="Your library lives in your account"
          body="Create a free account and every song you favourite is saved here, on this phone and your other devices."
        />
      ) : (
        <View className="flex-1">
          {/* Sub-tabs row */}
          <View className="flex-row border-b border-ln px-3.5">
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
          </View>

          {activeTab === 'songs' ? (
            <>
              {/* Sort chip and view toggle controls */}
              <View className="flex-row items-center justify-between px-5 py-3">
                <Pressable
                  onPress={() => setSortOpen(true)}
                  className="flex-row items-center gap-1.5 h-[30px] px-3 rounded-full bg-s2 border border-ln2"
                  accessibilityRole="button"
                  accessibilityLabel={`Sort: ${SORTS.find((o) => o.value === sort)?.label}`}
                >
                  <Icon name="sort" size={13} color="#9A9AA8" />
                  <Text className="text-bs font-medium text-t1">{SORTS.find((o) => o.value === sort)?.label}</Text>
                  <Icon name="chevron-down" size={13} color="#9A9AA8" />
                </Pressable>
                <View className="flex-row items-center gap-1">
                  <IconButton
                    icon={<Icon name="download" size={16} color="#9A9AA8" />}
                    size={32}
                    onPress={() => navigation.navigate('Downloads')}
                    accessibilityLabel="Downloads"
                  />
                  {online && (
                    <IconButton
                      icon={<Icon name="filter" size={16} color={onPhoneOnly ? '#FFC24D' : '#9A9AA8'} />}
                      size={32}
                      variant={onPhoneOnly ? 'active' : 'default'}
                      onPress={() => setOnPhoneOnly((v) => !v)}
                      accessibilityLabel={onPhoneOnly ? 'Show all songs' : 'Show only songs on this phone'}
                    />
                  )}
                  <IconButton
                    icon={<Icon name="list" size={16} color={viewMode === 'list' ? '#00E28A' : '#9A9AA8'} />}
                    size={32}
                    variant={viewMode === 'list' ? 'active' : 'default'}
                    onPress={() => setViewMode('list')}
                    accessibilityLabel="List view"
                  />
                  <IconButton
                    icon={<Icon name="grid" size={16} color={viewMode === 'grid' ? '#00E28A' : '#9A9AA8'} />}
                    size={32}
                    variant={viewMode === 'grid' ? 'active' : 'default'}
                    onPress={() => setViewMode('grid')}
                    accessibilityLabel="Grid view"
                  />
                </View>
              </View>

              {/* Play all + Shuffle action bar */}
              {displayTracks.length > 0 && (
                <View className="flex-row items-center gap-2.5 px-5 pb-2.5">
                  <Button
                    variant="accent"
                    size="sm"
                    onPress={onPlayAll}
                    icon={<Icon name="play" size={15} color="#000000" />}
                  >
                    Play all
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={onShuffle}
                    icon={<Icon name="shuffle" size={15} color="#FFFFFF" />}
                  >
                    Shuffle
                  </Button>
                  <Text className="text-bs text-t3 flex-1 text-right font-normal">
                    {online && !onPhoneOnly && library.data?.meta?.total
                      ? `${library.data.meta.total} songs`
                      : `${displayTracks.length} songs`}
                  </Text>
                </View>
              )}

              {/* Track List */}
              <FlatList
                key={viewMode}
                data={displayTracks}
                keyExtractor={(item) => item.id}
                numColumns={viewMode === 'grid' ? 2 : 1}
                columnWrapperStyle={viewMode === 'grid' ? { gap: 12 } : undefined}
                renderItem={({ item, index }) =>
                  viewMode === 'grid' ? (
                    <Pressable
                      onPress={() => playTrack(item, displayTracks, LIBRARY_FROM)}
                      className="p-1 mb-3"
                      style={cell(2, 12)}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${item.title} by ${item.artist}`}
                    >
                      <Artwork uri={artworkUrl(item, 300)} size={160} className="rounded-xl" />
                      <Text
                        className={cn(
                          'text-tm font-medium mt-2',
                          currentTrack?.id === item.id ? 'text-acc' : 'text-t1',
                        )}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text className="text-bs text-t2" numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </Pressable>
                  ) : (
                    <SongRow
                      track={item}
                      onPress={() => playTrack(item, displayTracks, LIBRARY_FROM)}
                      isActive={currentTrack?.id === item.id}
                      index={index}
                      showArtwork
                    />
                  )
                }
                refreshControl={
                  online ? (
                    <RefreshControl
                      refreshing={false}
                      onRefresh={library.refetch}
                      tintColor="#00E28A"
                      colors={['#00E28A']}
                    />
                  ) : undefined
                }
                ListEmptyComponent={
                  <StateView
                    loading={online && library.loading && !library.data}
                    error={library.error}
                    onRetry={library.refetch}
                    empty={
                      online
                        ? 'Songs you favourite show up here. Long-press any song and choose "Add to favourites".'
                        : 'No music on this phone yet. Songs you download show up here.'
                    }
                  />
                }
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingBottom: 140,
                }}
              />
            </>
          ) : activeTab === 'genres' ? (
            <FlatList
              data={genres.data ?? DEFAULT_GENRES}
              keyExtractor={(g) => g.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              renderItem={({ item, index }) => (
                <GenreCard
                  genre={item}
                  index={index}
                  onPress={() =>
                    navigation.navigate('Search', { screen: 'SearchRoot', params: { q: genreQuery(item) } })
                  }
                />
              )}
              ItemSeparatorComponent={() => <View className="h-2.5" />}
              ListHeaderComponent={
                <Text className="text-bs text-t3 mb-3">
                  {online ? 'Browse by mood and language' : 'Go online to browse these'}
                </Text>
              }
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 140 }}
            />
          ) : !online ? (
            <StateView
              empty={
                activeTab === 'albums'
                  ? 'Saved albums come from your account. Go online to see them.'
                  : 'Your artists come from your account. Go online to see them.'
              }
            />
          ) : activeTab === 'albums' ? (
            <FlatList
              key="albums"
              data={albums.data?.items ?? []}
              keyExtractor={(a) => a.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => navigation.navigate('Album', { id: item.id })}
                  className="p-1 mb-3"
                  style={cell(2, 12)}
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
              key="artists"
              data={artists.data?.items ?? []}
              keyExtractor={(a) => a.id}
              numColumns={3}
              columnWrapperStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => navigation.navigate('Artist', { id: item.id })}
                  className="items-center gap-1.5 mb-4"
                  style={cell(3, 8)}
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
      <OptionSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        gold={!online}
        title="Sort songs"
        value={sort}
        onSelect={setSort}
        options={SORTS}
      />
    </Screen>
  );
}
