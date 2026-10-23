import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { api } from '../data/api';
import { useAsync, usePagedTracks, type LibrarySort } from '../data/hooks';
import { useAuthStore } from '../data/auth';
import { useModeStore } from '../store/mode';
import { useLibraryStore } from '../store/library';
import { useDownloadsStore } from '../store/downloads';
import { usePhoneTracks } from '../store/localMusic';
import { usePlayerStore } from '../store/player';
import { playShuffled } from '../lib/playShuffled';
import { showSnackbar, songsSubtitle } from '../store/snackbar';
import { songCount } from '../lib/format';
import type { Track } from '../data/types';

export type TrackListKind = 'all' | 'liked' | 'mostPlayed';

export interface UseTrackListOptions {
  kind: TrackListKind;
  enabled?: boolean;
}

const FROM: Record<TrackListKind, { kind: string; name: string }> = {
  all: { kind: 'Library', name: 'Your songs' },
  liked: { kind: 'Library', name: 'Liked songs' },
  mostPlayed: { kind: 'Library', name: 'Most played' },
};

export const useTrackList = ({ kind, enabled = true }: UseTrackListOptions) => {
  const mode = useModeStore((state) => state.mode);
  const online = mode === 'online';
  const userId = useAuthStore((state) => state.user?.id);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const favouriteIds = useLibraryStore((state) => state.favouriteIds);
  const downloads = useDownloadsStore((state) => state.items);
  const isDownloaded = useCallback((id: string) => downloads[id]?.status === 'done', [downloads]);

  const [sort, setSort] = useState<LibrarySort>('addedAt');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [onPhoneOnly, setOnPhoneOnly] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);

  // Reset selection on tab/kind change
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds({});
  }, [kind]);

  // Back button exits selection mode
  useEffect(() => {
    if (!selectionMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectionMode(false);
      setSelectedIds({});
      return true;
    });
    return () => sub.remove();
  }, [selectionMode]);

  // Paged query for 'all' (Songs tab) or 'liked'
  const pagedQuery = usePagedTracks(kind === 'liked' ? 'liked' : 'all', sort, [userId], {
    enabled: online && !!userId && kind !== 'mostPlayed' && enabled,
    refetchOnFocus: true,
  });

  // Async query for 'mostPlayed'
  const mostPlayed = useAsync(() => api.mostPlayed(50), [userId], {
    enabled: online && !!userId && kind === 'mostPlayed' && enabled,
    refetchOnFocus: true,
  });

  // Seed favouriteIds for tracks returned by liked query while tracking locally unliked IDs
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
    if (kind === 'liked' && pagedQuery?.items && pagedQuery.items.length > 0) {
      useLibraryStore.setState((state) => {
        let changed = false;
        const next = { ...state.favouriteIds };
        for (const t of pagedQuery.items) {
          if (!next[t.id] && !unlikedRef.current.has(t.id)) {
            next[t.id] = true;
            changed = true;
          }
        }
        return changed ? { favouriteIds: next } : state;
      });
    }
  }, [kind, pagedQuery?.items]);

  const phoneTracks = usePhoneTracks();

  const serverTracks: Track[] = useMemo(() => {
    if (kind === 'mostPlayed') {
      return (mostPlayed.data?.items ?? []).filter((t) => t.source === 'server');
    }
    const raw = (pagedQuery?.items ?? []).filter((t) => t.source === 'server');
    if (kind === 'liked') {
      return raw.filter((t) => !!favouriteIds[t.id]);
    }
    return raw;
  }, [kind, pagedQuery?.items, mostPlayed.data, favouriteIds]);

  const displayTracks: Track[] = useMemo(() => {
    if (!online) {
      if (kind === 'all') return phoneTracks;
      if (kind === 'liked') return phoneTracks.filter((t) => favouriteIds[t.id]);
      return serverTracks.filter((t) => isDownloaded(t.id));
    }
    return onPhoneOnly ? serverTracks.filter((t) => isDownloaded(t.id)) : serverTracks;
  }, [online, kind, phoneTracks, favouriteIds, serverTracks, onPhoneOnly, isDownloaded]);

  const from = FROM[kind];

  const emptyText = !online
    ? kind === 'all'
      ? 'No music on this phone yet. Songs you download show up here.'
      : kind === 'liked'
        ? 'None of your liked songs are downloaded to this phone.'
        : 'None of your most played songs are downloaded to this phone.'
    : kind === 'liked'
      ? 'Songs you like show up here. Tap the heart on any song.'
      : kind === 'mostPlayed'
        ? 'Songs you play most show up here once you have listened for a while.'
        : 'Songs you favourite show up here. Long-press any song and choose "Add to favourites".';

  const onPlayAll = async () => {
    let tracks = displayTracks;
    if (online && pagedQuery?.hasMore) {
      let all = await pagedQuery.loadAll();
      if (kind === 'liked') {
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
      if (kind === 'liked') {
        all = all.filter((t) => !!favouriteIds[t.id]);
      }
      tracks = onPhoneOnly ? all.filter((t) => isDownloaded(t.id)) : all;
    }
    playShuffled(tracks, from);
  };

  const countText = (() => {
    if (online && !onPhoneOnly && (kind === 'all' || kind === 'liked')) {
      if (pagedQuery?.total != null && pagedQuery.items.length === displayTracks.length) {
        return songCount(pagedQuery.total);
      }
    }
    return songCount(displayTracks.length);
  })();

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
    showSnackbar({
      title: 'Added to queue',
      subtitle: songsSubtitle(selectedList),
      icon: 'list',
    });
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
      [{ text: 'OK' }],
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

  const trackLoading =
    kind === 'mostPlayed'
      ? online && mostPlayed.loading && !mostPlayed.data
      : online && (pagedQuery?.loading ?? false) && !pagedQuery?.items.length;
  const trackError =
    kind === 'mostPlayed' ? (online ? mostPlayed.error : null) : online ? (pagedQuery?.error ?? null) : null;
  const trackRefetch = kind === 'mostPlayed' ? mostPlayed.refetch : (pagedQuery?.refetch ?? (() => {}));

  return {
    kind,
    online,
    sort,
    setSort,
    sortOpen,
    setSortOpen,
    viewMode,
    setViewMode,
    onPhoneOnly,
    setOnPhoneOnly,
    selectionMode,
    setSelectionMode,
    selectedIds,
    selectedCount,
    selectedList,
    toggleSelectTrack,
    onSelectAll,
    onCancelSelection,
    playlistPickerOpen,
    setPlaylistPickerOpen,
    displayTracks,
    from,
    countText,
    emptyText,
    onPlayAll,
    onShuffle,
    onAddToQueue,
    onAddToPlaylist,
    onDownloadSelected,
    onRemoveFromLiked,
    trackLoading,
    trackError,
    trackRefetch,
    pagedQuery,
    favouriteIds,
  };
};

export type TrackListState = ReturnType<typeof useTrackList>;
