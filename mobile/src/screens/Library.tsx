import React, { useState } from 'react';
import { View, FlatList, Text, RefreshControl, Pressable } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Chip } from '../components/ui/Chip';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { SongRow } from '../components/music/SongRow';
import { StateView } from '../components/ui/StateView';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { api } from '../data/api';
import { useAsync } from '../data/hooks';
import { useAuthStore } from '../data/auth';
import { GuestPrompt } from '../components/ui/GuestPrompt';
import Icon from '../components/ui/Icon';
import { cn } from '../lib/cn';
import { SegmentedControl } from '../components/ui/Segmented';
import { useNavigation } from '@react-navigation/native';
import type { Track } from '../data/types';

type Tab = 'songs' | 'albums' | 'artists' | 'genres' | 'folders';
type Sort = 'addedAt' | 'playCount' | 'title';

const TABS: { id: Tab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'genres', label: 'Genres' },
  { id: 'folders', label: 'Folders' },
];

export function LibraryScreen() {
  const navigation = useNavigation<any>();
  const setMode = useModeStore((state) => state.setMode);
  const mode = useModeStore((state) => state.mode);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const favouriteCount = useLibraryStore((state) => Object.keys(state.favouriteIds).length);
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const [sort, setSort] = useState<Sort>('addedAt');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const userId = useAuthStore((state) => state.user?.id);

  const online = mode === 'online';
  const library = useAsync(() => api.libraryTracks(sort), [sort, favouriteCount, userId], {
    enabled: online && !!userId,
    refetchOnFocus: true,
  });

  const serverTracks = (library.data?.items ?? []).filter(t => t.source === 'server');
  const displayTracks = online ? serverTracks : [];

  const onPlayAll = () => {
    if (displayTracks.length > 0) {
      playTrack(displayTracks[0], displayTracks);
    }
  };

  const onShuffle = () => {
    if (displayTracks.length > 0) {
      const shuffled = [...displayTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
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
                  onPress={() => {
                    if (tab.id === 'folders') {
                      navigation.navigate('Folders');
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className="h-[40px] px-3.5 justify-center relative"
                >
                  <Text className={cn('text-bm font-medium', isActive ? 'text-t1' : 'text-t3')}>
                    {tab.label}
                  </Text>
                  {isActive && (
                    <View className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-acc rounded-t-xs" />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Sort chip and view toggle controls */}
          <View className="flex-row items-center justify-between px-5 py-3">
            <Chip
              size="sm"
              label={sort === 'addedAt' ? 'Recently added' : sort === 'playCount' ? 'Most played' : 'A-Z'}
              icon={<Icon name="shuffle" size={13} color="#9A9AA8" />}
              onPress={() => {
                const nextSort: Sort = sort === 'addedAt' ? 'playCount' : sort === 'playCount' ? 'title' : 'addedAt';
                setSort(nextSort);
              }}
            />
            <View className="flex-row items-center gap-1">
              <IconButton
                icon={<Icon name="equalizer" size={16} color="#9A9AA8" />}
                size={32}
                onPress={() => {}}
                accessibilityLabel="Filter"
              />
              <IconButton
                icon={<Icon name="playlist" size={16} color={viewMode === 'list' ? '#00E28A' : '#9A9AA8'} />}
                size={32}
                variant={viewMode === 'list' ? 'active' : 'default'}
                onPress={() => setViewMode('list')}
                accessibilityLabel="List view"
              />
              <IconButton
                icon={<Icon name="library" size={16} color={viewMode === 'grid' ? '#00E28A' : '#9A9AA8'} />}
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
                {library.data?.meta?.total ? `${library.data.meta.total} songs` : `${displayTracks.length} songs`}
              </Text>
            </View>
          )}

          {/* Track List */}
          <FlatList
            data={displayTracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <SongRow
                track={item}
                onPress={() => playTrack(item, displayTracks)}
                isActive={currentTrack?.id === item.id}
                index={index}
                showArtwork
              />
            )}
            refreshControl={
              online ? (
                <RefreshControl refreshing={false} onRefresh={library.refetch} tintColor="#00E28A" colors={['#00E28A']} />
              ) : undefined
            }
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
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 140 }}
          />
        </View>
      )}
    </Screen>
  );
}
