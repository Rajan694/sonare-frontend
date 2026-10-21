import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Pressable,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { usePagedTracks, type LibrarySort } from '../data/hooks';
import { useAuthStore } from '../data/auth';
import { GuestPrompt } from '../components/ui/GuestPrompt';
import Icon, { type IconName } from '../components/ui/Icon';
import { OptionSheet } from '../components/ui/OptionSheet';
import { Sheet } from '../components/ui/Sheet';
import { PlaylistPicker } from '../components/music/TrackMenuHost';
import { songCount } from '../lib/format';
import { cn } from '../lib/cn';
import { SegmentedControl } from '../components/ui/Segmented';
import { useNavigation } from '@react-navigation/native';
import { useDownloadsStore } from '../store/downloads';
import { usePhoneTracks } from '../store/localMusic';
import { playShuffled } from '../lib/playShuffled';
import { offerMusicAccess } from '../lib/musicAccess';
import type { Track } from '../data/types';

// Genres tab removed: Search keeps Browse categories and its Genres chip.
type Tab = 'songs' | 'liked' | 'mostPlayed' | 'albums' | 'artists';
type TrackTab = 'songs' | 'liked' | 'mostPlayed';

const isTrackTab = (tab: Tab): tab is TrackTab => tab === 'songs' || tab === 'liked' || tab === 'mostPlayed';

const TABS: { id: Tab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'liked', label: 'Favourites' },
  { id: 'mostPlayed', label: 'Most played' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
];

const FROM: Record<TrackTab, { kind: string; name: string }> = {
  songs: { kind: 'Library', name: 'Your songs' },
  liked: { kind: 'Library', name: 'Liked songs' },
  mostPlayed: { kind: 'Library', name: 'Most played' },
};

const SORTS: { value: LibrarySort; label: string; icon: IconName }[] = [
  { value: 'addedAt', label: 'Recently added', icon: 'clock' },
  { value: 'title', label: 'Title', icon: 'sort' },
  { value: 'artist', label: 'Artist', icon: 'user' },
  { value: 'album', label: 'Album', icon: 'disc' },
  { value: 'durationMs', label: 'Duration', icon: 'timer' },
  { value: 'playCount', label: 'Most played', icon: 'visualizer' },
];

/** Height of the bottom TabBar (excluding safe area insets). Defined in TabNavigator.tsx. */
const TAB_BAR_HEIGHT = 64;
/** Height of the MiniPlayer displayed above the TabBar when a track is active. Defined in MiniPlayer.tsx. */
const MINI_PLAYER_HEIGHT = 64;
/** Height of the selection action bar. */
const SELECTION_BAR_HEIGHT = 56;
/** Base bottom padding for scroll content so the last items clear the tab bar and mini player. */
const BASE_BOTTOM_PADDING = 140;

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
  const { width: screenWidth } = useWindowDimensions();
  // Grid cells get an exact width: flex-1 would stretch the items of a short last row.
  const cell = (columns: number, gap: number) => ({ width: (screenWidth - 24 - gap * (columns - 1)) / columns });
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const setMode = useModeStore((state) => state.setMode);
  const mode = useModeStore((state) => state.mode);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const favouriteCount = useLibraryStore((state) => Object.keys(state.favouriteIds).length);
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const [sort, setSort] = useState<LibrarySort>('addedAt');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  /** Filter: only songs saved on this phone. */
  const [onPhoneOnly, setOnPhoneOnly] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const userId = useAuthStore((state) => state.user?.id);

  // Reset selection mode on tab change
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds({});
  }, [activeTab]);

  // Android back button exits selection mode
  useEffect(() => {
    if (!selectionMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectionMode(false);
      setSelectedIds({});
      return true;
    });
    return () => sub.remove();
  }, [selectionMode]);

  const online = mode === 'online';
  const trackTab: TrackTab = isTrackTab(activeTab) ? activeTab : 'songs';

  // Songs tab — paged, with all six sorts.
  const songs = usePagedTracks('all', sort, [userId], {
    enabled: online && !!userId && activeTab === 'songs',
    refetchOnFocus: true,
  });
  // Favourites tab — same contract, filter=liked, shares the sort state.
  const liked = usePagedTracks('liked', sort, [userId], {
    enabled: online && !!userId && activeTab === 'liked',
    refetchOnFocus: true,
  });

  const albums = useAsync(() => api.libraryAlbums(), [userId], {
    enabled: online && !!userId && activeTab === 'albums',
    refetchOnFocus: true,
  });
  // Liked and playlisted songs bring their artists along, so refetch when those change.
  const playlistCount = useLibraryStore((state) => state.playlists.length);
  const artists = useAsync(() => api.libraryArtists(), [userId, favouriteCount, playlistCount], {
    enabled: online && !!userId && activeTab === 'artists',
    refetchOnFocus: true,
  });

  const mostPlayed = useAsync(() => api.mostPlayed(50), [userId], {
    enabled: online && !!userId && activeTab === 'mostPlayed',
    refetchOnFocus: true,
  });

  const favouriteIds = useLibraryStore((state) => state.favouriteIds);
  const downloads = useDownloadsStore((state) => state.items);
  const isDownloaded = useCallback((id: string) => downloads[id]?.status === 'done', [downloads]);

  // Seed favouriteIds for tracks returned by the liked query if not already present,
  // while tracking locally unliked IDs so they stay hidden without refetching.
  const unlikedRef = useRef<Set<string>>(new Set());
  const prevFavRef = useRef(favouriteIds);
  useEffect(() => {
    const prev = prevFavRef.current;
    for (const id of Object.keys(prev)) {
      if (!favouriteIds[id]) unlikedRef.current.add(id);
    }
    for (const id of Object.keys(favouriteIds)) {
      unlikedRef.current.delete(id);
    }
    prevFavRef.current = favouriteIds;
  }, [favouriteIds]);

  useEffect(() => {
    if (liked.items.length > 0) {
      useLibraryStore.setState((state) => {
        let changed = false;
        const next = { ...state.favouriteIds };
        for (const t of liked.items) {
          if (!next[t.id] && !unlikedRef.current.has(t.id)) {
            next[t.id] = true;
            changed = true;
          }
        }
        return changed ? { favouriteIds: next } : state;
      });
    }
  }, [liked.items]);

  // Offline, the library is what's on this phone: downloads and the music folders' songs.
  const phoneTracks = usePhoneTracks();

  // Paged track state for the current track tab.
  const pagedQuery = trackTab === 'songs' ? songs : trackTab === 'liked' ? liked : null;

  // Server tracks from paged query (songs/liked) or mostPlayed.
  const serverTracks: Track[] = useMemo(() => {
    if (trackTab === 'mostPlayed') {
      return (mostPlayed.data?.items ?? []).filter((t) => t.source === 'server');
    }
    const raw = (pagedQuery?.items ?? []).filter((t) => t.source === 'server');
    if (trackTab === 'liked') {
      return raw.filter((t) => !!favouriteIds[t.id]);
    }
    return raw;
  }, [trackTab, pagedQuery?.items, mostPlayed.data, favouriteIds]);

  // What the list actually shows, accounting for online/offline and the phone-only filter.
  const displayTracks: Track[] = useMemo(() => {
    if (!online) {
      if (trackTab === 'songs') return phoneTracks;
      if (trackTab === 'liked') return phoneTracks.filter((t) => favouriteIds[t.id]);
      // Most played offline: last fetched downloaded songs only.
      return serverTracks.filter((t) => isDownloaded(t.id));
    }
    return onPhoneOnly ? serverTracks.filter((t) => isDownloaded(t.id)) : serverTracks;
  }, [online, trackTab, phoneTracks, favouriteIds, serverTracks, onPhoneOnly, isDownloaded]);

  const from = FROM[trackTab];

  const emptyText = !online
    ? trackTab === 'songs'
      ? 'No music on this phone yet. Songs you download show up here.'
      : trackTab === 'liked'
        ? 'None of your liked songs are downloaded to this phone.'
        : 'None of your most played songs are downloaded to this phone.'
    : trackTab === 'liked'
      ? 'Songs you like show up here. Tap the heart on any song.'
      : trackTab === 'mostPlayed'
        ? 'Songs you play most show up here once you have listened for a while.'
        : 'Songs you favourite show up here. Long-press any song and choose "Add to favourites".';

  // Play all and Shuffle fetch the full list first, then start playback.
  const onPlayAll = async () => {
    let tracks = displayTracks;
    if (online && pagedQuery?.hasMore) {
      let all = await pagedQuery.loadAll();
      if (trackTab === 'liked') {
        all = all.filter((t) => !!favouriteIds[t.id]);
      }
      tracks = onPhoneOnly ? all.filter((t) => isDownloaded(t.id)) : all;
    }
    if (tracks.length > 0) playTrack(tracks[0], tracks, from);
  };

  const onShuffle = async () => {
    let tracks = displayTracks;
    if (online && pagedQuery?.hasMore) {
      let all = await pagedQuery.loadAll();
      if (trackTab === 'liked') {
        all = all.filter((t) => !!favouriteIds[t.id]);
      }
      tracks = onPhoneOnly ? all.filter((t) => isDownloaded(t.id)) : all;
    }
    playShuffled(tracks, from);
  };

  // Count: prefer meta.total when online and not filtered.
  const countText = (() => {
    if (online && !onPhoneOnly && (activeTab === 'songs' || activeTab === 'liked')) {
      const paged = activeTab === 'songs' ? songs : liked;
      if (paged.total != null && paged.items.length === displayTracks.length) {
        return songCount(paged.total);
      }
    }
    return songCount(displayTracks.length);
  })();

  // Multi-select helpers
  const selectedList = useMemo(() => displayTracks.filter((t) => !!selectedIds[t.id]), [displayTracks, selectedIds]);
  const selectedCount = selectedList.length;

  const toggleSelectTrack = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  const onSelectAll = useCallback(() => {
    const allSelected = displayTracks.length > 0 && displayTracks.every((t) => !!selectedIds[t.id]);
    if (allSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      for (const t of displayTracks) next[t.id] = true;
      setSelectedIds(next);
    }
  }, [displayTracks, selectedIds]);

  const onCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds({});
  }, []);

  const onAddToQueue = () => {
    if (selectedList.length === 0) return;
    usePlayerStore.getState().addToQueue(selectedList);
    onCancelSelection();
  };

  const onAddToPlaylist = () => {
    if (selectedList.length === 0) return;
    setPlaylistPickerOpen(true);
  };

  const onDownloadSelected = () => {
    if (selectedList.length === 0) return;
    const remoteTracks = selectedList.filter((t) => t.source === 'server');
    const needed = remoteTracks.filter((t) => {
      const d = downloads[t.id];
      return !d || d.status !== 'done' || d.missing;
    });

    if (needed.length === 0) {
      Alert.alert('Already downloaded', 'All selected songs are already on this phone.');
      onCancelSelection();
      return;
    }

    useDownloadsStore.getState().enqueue(needed);
    const locationLabel = useDownloadsStore.getState().location.label || 'your music folder';
    Alert.alert(
      'Added to downloads',
      `${needed.length} ${needed.length === 1 ? 'song' : 'songs'} will be saved to ${locationLabel}.`,
      [{ text: 'OK', onPress: () => offerMusicAccess('download') }],
    );
    onCancelSelection();
  };

  const onRemoveFromLiked = () => {
    const likedSelected = selectedList.filter((t) => !!favouriteIds[t.id]);
    if (likedSelected.length === 0) return;

    const doRemove = async () => {
      try {
        await useLibraryStore.getState().removeFavourites(likedSelected.map((t) => t.id));
        onCancelSelection();
      } catch {
        Alert.alert("Couldn't remove favourites", 'Check your connection and try again.');
      }
    };

    if (likedSelected.length === 1) {
      doRemove();
    } else {
      Alert.alert(
        `Remove ${likedSelected.length} songs from favourites?`,
        'They will be unliked across all your devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: doRemove,
          },
        ],
        { cancelable: true },
      );
    }
  };

  // Loading / error state for the current track tab.
  const trackLoading =
    trackTab === 'mostPlayed'
      ? online && mostPlayed.loading && !mostPlayed.data
      : online && (pagedQuery?.loading ?? false) && !pagedQuery?.items.length;
  const trackError =
    trackTab === 'mostPlayed' ? (online ? mostPlayed.error : null) : online ? (pagedQuery?.error ?? null) : null;
  const trackRefetch = trackTab === 'mostPlayed' ? mostPlayed.refetch : (pagedQuery?.refetch ?? (() => {}));

  // Offline album/artist grouping from phone tracks.
  const offlineAlbums = useMemo(() => groupByAlbum(phoneTracks), [phoneTracks]);
  const offlineArtists = useMemo(() => groupByArtist(phoneTracks), [phoneTracks]);

  return (
    <Screen scrollable={false}>
      {/* Header with Title/Selection and Mode segmented control / selection actions */}
      {selectionMode ? (
        <Header
          left={
            <Text className="text-h1 font-semibold text-t1" numberOfLines={1}>
              {`${selectedCount} selected`}
            </Text>
          }
          right={
            <View className="flex-row items-center gap-2">
              <Button variant="ghost" size="sm" onPress={onSelectAll} accessibilityLabel="Select all">
                Select all
              </Button>
              <Button variant="ghost" size="sm" onPress={onCancelSelection} accessibilityLabel="Cancel selection">
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
          {/* Sub-tabs row: scrolls sideways */}
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

          {isTrackTab(activeTab) ? (
            <>
              {/* Sort chip and view toggle controls */}
              <View className="flex-row items-center justify-between px-5 py-3">
                {activeTab !== 'mostPlayed' ? (
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
                ) : (
                  <Text className="text-bs text-t3">Your top tracks this year</Text>
                )}
                <View className="flex-row items-center gap-1">
                  <IconButton
                    icon={<Icon name="check" size={16} color={selectionMode ? '#00E28A' : '#9A9AA8'} />}
                    size={32}
                    variant={selectionMode ? 'active' : 'default'}
                    onPress={() => {
                      if (selectionMode) {
                        onCancelSelection();
                      } else {
                        setSelectionMode(true);
                      }
                    }}
                    accessibilityLabel="Select"
                  />
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

              {/* Play all + Shuffle action bar (hidden in selection mode) */}
              {!selectionMode && displayTracks.length > 0 && (
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
                  <Text className="text-bs text-t3 flex-1 text-right font-normal">{countText}</Text>
                </View>
              )}

              {/* Track list */}
              <FlatList
                key={`${activeTab}-${selectionMode ? 'select' : viewMode}`}
                data={displayTracks}
                keyExtractor={(item) => item.id}
                numColumns={selectionMode ? 1 : viewMode === 'grid' ? 2 : 1}
                columnWrapperStyle={!selectionMode && viewMode === 'grid' ? { gap: 12 } : undefined}
                renderItem={({ item, index }) =>
                  !selectionMode && viewMode === 'grid' ? (
                    <Pressable
                      onPress={() => playTrack(item, displayTracks, from)}
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
                      onPress={() => playTrack(item, displayTracks, from)}
                      isActive={currentTrack?.id === item.id}
                      index={index}
                      showArtwork
                      selected={!!selectedIds[item.id]}
                      onToggleSelect={selectionMode ? () => toggleSelectTrack(item.id) : undefined}
                    />
                  )
                }
                refreshControl={
                  online ? (
                    <RefreshControl
                      refreshing={false}
                      onRefresh={trackRefetch}
                      tintColor="#00E28A"
                      colors={['#00E28A']}
                    />
                  ) : undefined
                }
                onEndReached={() => {
                  if (online && pagedQuery?.hasMore && !pagedQuery.loadingMore) {
                    pagedQuery.loadMore();
                  }
                }}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  pagedQuery?.loadingMore ? (
                    <ActivityIndicator color="#00E28A" size="small" style={{ marginVertical: 12 }} />
                  ) : pagedQuery?.loadMoreError ? (
                    <Pressable
                      onPress={pagedQuery.loadMore}
                      accessibilityRole="button"
                      accessibilityLabel="Load more error · Retry"
                    >
                      <Text className="text-bs text-t3 text-center py-3">Couldn't load more · Retry</Text>
                    </Pressable>
                  ) : undefined
                }
                ListEmptyComponent={
                  <StateView loading={trackLoading} error={trackError} onRetry={trackRefetch} empty={emptyText} />
                }
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingBottom: selectionMode ? BASE_BOTTOM_PADDING + SELECTION_BAR_HEIGHT : BASE_BOTTOM_PADDING,
                }}
              />
            </>
          ) : !online ? (
            /* Offline Albums / Artists: group this phone's songs by album or artist tag. */
            activeTab === 'albums' ? (
              offlineAlbums.length === 0 ? (
                <StateView empty="No music on this phone yet. Songs you download show up here." />
              ) : (
                <FlatList
                  key="offline-albums"
                  data={offlineAlbums}
                  keyExtractor={(a) => a.id}
                  numColumns={2}
                  columnWrapperStyle={{ gap: 12 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => playTrack(item.tracks[0], item.tracks, { kind: 'Library', name: item.title })}
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
                        {songCount(item.tracks.length)}
                      </Text>
                    </Pressable>
                  )}
                  contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: 140 }}
                />
              )
            ) : /* Offline Artists */
            offlineArtists.length === 0 ? (
              <StateView empty="No music on this phone yet. Songs you download show up here." />
            ) : (
              <FlatList
                key="offline-artists"
                data={offlineArtists}
                keyExtractor={(a) => a.id}
                numColumns={3}
                columnWrapperStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => playTrack(item.tracks[0], item.tracks, { kind: 'Library', name: item.name })}
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
                      {songCount(item.tracks.length)}
                    </Text>
                  </Pressable>
                )}
                contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: 140 }}
              />
            )
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

      {/* Playlist picker sheet for multi-selected tracks */}
      <Sheet visible={playlistPickerOpen} onClose={() => setPlaylistPickerOpen(false)}>
        <View className="px-6 pb-6">
          <PlaylistPicker
            tracks={selectedList}
            onClose={() => {
              setPlaylistPickerOpen(false);
              onCancelSelection();
            }}
          />
        </View>
      </Sheet>

      {/* Selection Mode Bottom Action Bar */}
      {selectionMode && (
        <View
          className="absolute inset-x-0 bg-s1 border-t border-ln flex-row items-center justify-around px-3 py-2 z-50"
          style={{ bottom: (currentTrack ? MINI_PLAYER_HEIGHT : 0) + TAB_BAR_HEIGHT + insets.bottom }}
        >
          <Button
            variant="outline"
            size="sm"
            onPress={onAddToQueue}
            disabled={selectedCount === 0}
            icon={<Icon name="queue" size={15} color={selectedCount === 0 ? '#555560' : '#FFFFFF'} />}
            accessibilityLabel="Add to queue"
          >
            Queue
          </Button>

          <Button
            variant="outline"
            size="sm"
            onPress={onAddToPlaylist}
            disabled={selectedCount === 0}
            icon={<Icon name="playlist-add" size={15} color={selectedCount === 0 ? '#555560' : '#FFFFFF'} />}
            accessibilityLabel="Add to playlist"
          >
            Playlist
          </Button>

          {online && (
            <Button
              variant="outline"
              size="sm"
              onPress={onDownloadSelected}
              disabled={selectedCount === 0}
              icon={<Icon name="download" size={15} color={selectedCount === 0 ? '#555560' : '#FFFFFF'} />}
              accessibilityLabel="Download"
            >
              Download
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onPress={onRemoveFromLiked}
            disabled={selectedList.filter((t) => !!favouriteIds[t.id]).length === 0}
            icon={
              <Icon
                name="heart"
                size={15}
                color={selectedList.filter((t) => !!favouriteIds[t.id]).length === 0 ? '#555560' : '#FF4D6A'}
              />
            }
            accessibilityLabel="Remove from favourites"
          >
            Unlike
          </Button>
        </View>
      )}
    </Screen>
  );
};
