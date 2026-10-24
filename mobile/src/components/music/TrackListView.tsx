import React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import Icon from '../ui/Icon';
import { Artwork } from './Artwork';
import { SongRow } from './SongRow';
import { OptionSheet } from '../ui/OptionSheet';
import { Sheet } from '../ui/Sheet';
import { PlaylistPicker } from './TrackMenuHost';
import { StateView } from '../ui/StateView';
import { artworkUrl } from '../../data/config';
import { usePlayerStore } from '../../store/player';
import { cn } from '../../lib/cn';
import type { TrackListState } from '../../hooks/useTrackList';
import type { LibrarySort } from '../../data/hooks';

export const SORTS: { value: LibrarySort; label: string }[] = [
  { value: 'addedAt', label: 'Recently added' },
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' },
  { value: 'durationMs', label: 'Duration' },
  { value: 'playCount', label: 'Most played' },
];

const TAB_BAR_HEIGHT = 64;
const MINI_PLAYER_HEIGHT = 64;
const BASE_BOTTOM_PADDING = 140;
const SELECTION_BAR_HEIGHT = 56;

interface TrackListViewProps {
  state: TrackListState;
}

export const TrackListView = ({ state }: TrackListViewProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const cell = (columns: number, gap: number) => ({ width: (screenWidth - 24 - gap * (columns - 1)) / columns });
  const insets = useSafeAreaInsets();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return (
    <View className="flex-1">
      {/* Sort chip and view toggle controls */}
      <View className="flex-row items-center justify-between px-5 py-3">
        {state.kind !== 'mostPlayed' ? (
          <Pressable
            onPress={() => state.setSortOpen(true)}
            className="flex-row items-center gap-1.5 h-[30px] px-3 rounded-full bg-s2 border border-ln2"
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${SORTS.find((o) => o.value === state.sort)?.label}`}
          >
            <Icon name="sort" size={13} color="#9A9AA8" />
            <Text className="text-bs font-medium text-t1">{SORTS.find((o) => o.value === state.sort)?.label}</Text>
            <Icon name="chevron-down" size={13} color="#9A9AA8" />
          </Pressable>
        ) : (
          <Text className="text-bs text-t3">Your top tracks this year</Text>
        )}
        <View className="flex-row items-center gap-1">
          <IconButton
            icon={<Icon name="check" size={16} color={state.selectionMode ? '#00E28A' : '#9A9AA8'} />}
            size={32}
            variant={state.selectionMode ? 'active' : 'default'}
            onPress={() => {
              if (state.selectionMode) {
                state.onCancelSelection();
              } else {
                state.setSelectionMode(true);
              }
            }}
            accessibilityLabel="Select"
          />
          {state.online && (
            <IconButton
              icon={<Icon name="filter" size={16} color={state.onPhoneOnly ? '#FFC24D' : '#9A9AA8'} />}
              size={32}
              variant={state.onPhoneOnly ? 'active' : 'default'}
              onPress={() => state.setOnPhoneOnly((v) => !v)}
              accessibilityLabel={state.onPhoneOnly ? 'Show all songs' : 'Show only songs on this phone'}
            />
          )}
          <IconButton
            icon={<Icon name="list" size={16} color={state.viewMode === 'list' ? '#00E28A' : '#9A9AA8'} />}
            size={32}
            variant={state.viewMode === 'list' ? 'active' : 'default'}
            onPress={() => state.setViewMode('list')}
            accessibilityLabel="List view"
          />
          <IconButton
            icon={<Icon name="grid" size={16} color={state.viewMode === 'grid' ? '#00E28A' : '#9A9AA8'} />}
            size={32}
            variant={state.viewMode === 'grid' ? 'active' : 'default'}
            onPress={() => state.setViewMode('grid')}
            accessibilityLabel="Grid view"
          />
        </View>
      </View>

      {/* Play all + Shuffle action bar (hidden in selection mode) */}
      {!state.selectionMode && state.displayTracks.length > 0 && (
        <View className="flex-row items-center gap-2.5 px-5 pb-2.5">
          <Button
            variant="accent"
            size="sm"
            onPress={state.onPlayAll}
            icon={<Icon name="play" size={15} color="#000000" />}
          >
            Play all
          </Button>
          <Button
            variant="outline"
            size="sm"
            onPress={state.onShuffle}
            icon={<Icon name="shuffle" size={15} color="#FFFFFF" />}
          >
            Shuffle
          </Button>
          <Text className="text-bs text-t3 flex-1 text-right font-normal">{state.countText}</Text>
        </View>
      )}

      {/* Track list */}
      <FlatList
        key={`${state.kind}-${state.selectionMode ? 'select' : state.viewMode}`}
        data={state.displayTracks}
        keyExtractor={(item) => item.id}
        numColumns={state.selectionMode ? 1 : state.viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={!state.selectionMode && state.viewMode === 'grid' ? { gap: 12 } : undefined}
        renderItem={({ item, index }) =>
          !state.selectionMode && state.viewMode === 'grid' ? (
            <Pressable
              onPress={() => playTrack(item, state.displayTracks, state.from)}
              className="p-1 mb-3"
              style={cell(2, 12)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${item.title} by ${item.artist}`}
            >
              <Artwork uri={artworkUrl(item, 300)} size={160} className="rounded-xl" />
              <Text
                className={cn('text-tm font-medium mt-2', currentTrack?.id === item.id ? 'text-acc' : 'text-t1')}
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
              onPress={() => playTrack(item, state.displayTracks, state.from)}
              isActive={currentTrack?.id === item.id}
              index={index}
              showArtwork
              showPlayCount={state.kind === 'mostPlayed'}
              selected={!!state.selectedIds[item.id]}
              onToggleSelect={state.selectionMode ? () => state.toggleSelectTrack(item.id) : undefined}
            />
          )
        }
        refreshControl={
          state.online ? (
            <RefreshControl
              refreshing={false}
              onRefresh={state.trackRefetch}
              tintColor="#00E28A"
              colors={['#00E28A']}
            />
          ) : undefined
        }
        onEndReached={() => {
          if (state.online && state.pagedQuery?.hasMore && !state.pagedQuery.loadingMore) {
            state.pagedQuery.loadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          state.pagedQuery?.loadingMore ? (
            <ActivityIndicator color="#00E28A" size="small" style={{ marginVertical: 12 }} />
          ) : state.pagedQuery?.loadMoreError ? (
            <Pressable
              onPress={state.pagedQuery.loadMore}
              accessibilityRole="button"
              accessibilityLabel="Load more error · Retry"
            >
              <Text className="text-bs text-t3 text-center py-3">Couldn't load more · Retry</Text>
            </Pressable>
          ) : undefined
        }
        ListEmptyComponent={
          <StateView
            loading={state.trackLoading}
            error={state.trackError}
            onRetry={state.trackRefetch}
            empty={state.emptyText}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: state.selectionMode ? BASE_BOTTOM_PADDING + SELECTION_BAR_HEIGHT : BASE_BOTTOM_PADDING,
        }}
      />

      <OptionSheet
        visible={state.sortOpen}
        onClose={() => state.setSortOpen(false)}
        gold={!state.online}
        title="Sort songs"
        value={state.sort}
        onSelect={state.setSort}
        options={SORTS}
      />

      {/* Playlist picker sheet for multi-selected tracks */}
      <Sheet visible={state.playlistPickerOpen} onClose={() => state.setPlaylistPickerOpen(false)}>
        <View className="px-6 pb-6">
          <PlaylistPicker
            tracks={state.selectedList}
            onClose={() => {
              state.setPlaylistPickerOpen(false);
              state.onCancelSelection();
            }}
          />
        </View>
      </Sheet>

      {/* Selection Mode Bottom Action Bar */}
      {state.selectionMode && (
        <View
          className="absolute inset-x-0 bg-s1 border-t border-ln flex-row items-center justify-around px-3 py-2 z-50"
          style={{ bottom: (currentTrack ? MINI_PLAYER_HEIGHT : 0) + TAB_BAR_HEIGHT + insets.bottom }}
        >
          <Button
            variant="outline"
            size="sm"
            onPress={state.onAddToQueue}
            disabled={state.selectedCount === 0}
            icon={<Icon name="queue" size={15} color={state.selectedCount === 0 ? '#555560' : '#FFFFFF'} />}
            accessibilityLabel="Add to queue"
          >
            Queue
          </Button>

          <Button
            variant="outline"
            size="sm"
            onPress={state.onAddToPlaylist}
            disabled={state.selectedCount === 0}
            icon={<Icon name="playlist-add" size={15} color={state.selectedCount === 0 ? '#555560' : '#FFFFFF'} />}
            accessibilityLabel="Add to playlist"
          >
            Playlist
          </Button>

          {state.online && (
            <Button
              variant="outline"
              size="sm"
              onPress={state.onDownloadSelected}
              disabled={state.selectedCount === 0}
              icon={<Icon name="download" size={15} color={state.selectedCount === 0 ? '#555560' : '#FFFFFF'} />}
              accessibilityLabel="Download"
            >
              Download
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onPress={state.onRemoveFromLiked}
            disabled={state.selectedList.filter((t) => !!state.favouriteIds[t.id]).length === 0}
            icon={
              <Icon
                name="heart"
                size={15}
                color={
                  state.selectedList.filter((t) => !!state.favouriteIds[t.id]).length === 0 ? '#555560' : '#FF4D6A'
                }
              />
            }
            accessibilityLabel="Remove from favourites"
          >
            Unlike
          </Button>
        </View>
      )}
    </View>
  );
};
