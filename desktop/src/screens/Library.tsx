import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CAPS } from '../lib/caps';
import { useLocalLibrary, resolveLocalRefs } from '../storage/local';
import { useModeStore } from '../store/modeContext';
import { usePlayerStore } from '../store/playerContext';
import { useLibrarySongs, useMostPlayed, useLibraryAlbums, useLibraryArtists, useAuth } from '../api/hooks';
import { useFavouriteLookup, unlikeMany } from '../api/favourites';
import SongRow, { SongTableHeader } from '../components/music/SongRow';
import { Card } from '../components/ui/Card';
import Artwork, { trackArtwork } from '../components/music/Artwork';
import Button, { IconButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import Icon from '../components/ui/Icon';
import { Select } from '../components/ui/Select';
import LoadMore from '../components/ui/LoadMore';
import { addToPlaylistDialog, confirmDialog } from '../store/dialogs';
import { showToast } from '../store/toasts';
import { downloads as downloadsStorage } from '../storage/downloads';
import { DownloadsView } from '../components/downloads/DownloadsView';
import { staggerContainer, transition } from '../lib/motion';
import { cn } from '../lib/cn';
import { useVirtualRows } from '../lib/useVirtualRows';
import { useLayout } from '../lib/layout';
import type { Track } from '../types';

// Folders live in Settings > Connection mode (/settings?section=connection), opened from the Songs tab's Folders button.
// Genres live in Search ("Browse categories"); the Library no longer has a Genres tab.
// Phone and tablet tabs: Songs, Albums, Artists, Downloads (when CAPS.downloads is enabled).
const TABS_WITH_DOWNLOADS = ['Songs', 'Albums', 'Artists', 'Downloads'] as const;
const TABS_WITHOUT_DOWNLOADS = ['Songs', 'Albums', 'Artists'] as const;
export const TABS = CAPS.downloads ? TABS_WITH_DOWNLOADS : TABS_WITHOUT_DOWNLOADS;
export type Tab = (typeof TABS)[number];

const SOURCE_FILTERS: { value: 'all' | 'local' | 'server'; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'local', label: 'On device' },
  { value: 'server', label: 'Server' },
];

type SortKey = 'addedAt' | 'title' | 'artist' | 'album' | 'durationMs' | 'playCount';
const SORTS: { key: SortKey; label: string; desc: boolean }[] = [
  { key: 'addedAt', label: 'Recently added', desc: true },
  { key: 'title', label: 'Title', desc: false },
  { key: 'artist', label: 'Artist', desc: false },
  { key: 'album', label: 'Album', desc: false },
  { key: 'durationMs', label: 'Duration', desc: false },
  { key: 'playCount', label: 'Most played', desc: true },
];

/** Compare two tracks by key. Missing values sort last regardless of direction. */
export const compareBy =
  (key: SortKey, desc: boolean = false) =>
  (a: Track, b: Track): number => {
    const va = a[key];
    const vb = b[key];
    const aMissing = va === undefined || va === null || va === '';
    const bMissing = vb === undefined || vb === null || vb === '';
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    const res =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
    return desc ? -res : res;
  };

/** Client-side sort for device-local files using compareBy. */
export const sortTracks = (list: Track[], key: SortKey, desc: boolean): Track[] => {
  return [...list].sort(compareBy(key, desc));
};

/**
 * Merge server songs with local device files.
 * - Drops local files already represented in the server list.
 * - When serverHasMore is true, drops local files that sort after the last loaded server song.
 * - Interleaves the remaining local files with server songs using the same comparator.
 */
export const mergeSongs = (
  server: Track[],
  localFiles: Track[],
  key: SortKey,
  desc: boolean,
  serverHasMore: boolean,
): Track[] => {
  const serverIds = new Set(server.map((t) => t.id));
  let localOnly = localFiles.filter((t) => !serverIds.has(t.id));

  const cmp = compareBy(key, desc);

  if (serverHasMore) {
    const lastServer = server.at(-1);
    if (lastServer) {
      localOnly = localOnly.filter((t) => cmp(t, lastServer) <= 0);
    }
  }

  localOnly = sortTracks(localOnly, key, desc);

  const merged: Track[] = [];
  let si = 0;
  let li = 0;
  while (si < server.length || li < localOnly.length) {
    const s = server[si];
    const l = localOnly[li];
    if (!s) {
      merged.push(l);
      li++;
      continue;
    }
    if (!l) {
      merged.push(s);
      si++;
      continue;
    }
    if (cmp(l, s) <= 0) {
      merged.push(l);
      li++;
    } else {
      merged.push(s);
      si++;
    }
  }
  return merged;
};

const Library = () => {
  const { mode } = useModeStore();
  const { currentTrack, playTrack, playShuffled, enqueue } = usePlayerStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const slug = (t: string) => t.toLowerCase().replace(' ', '-');
  const viewParam = params.get('view');

  const isFavouritesView = viewParam === 'favourites';
  const isMostPlayedView = viewParam === 'most-played';
  const isPinnedPage = isFavouritesView || isMostPlayedView;

  // ?view=genres or ?view=folders falls back to Songs; ?view=albums/artists/downloads activates matching tab.
  const matchedTab = viewParam ? TABS.find((t) => slug(t) === viewParam) : undefined;
  const activeTab: Tab = matchedTab ?? 'Songs';
  const setActiveTab = (t: Tab) => setParams(t === 'Songs' ? {} : { view: slug(t) }, { replace: true });
  // The full sidebar links every view (?view=); phones and tablets have no sidebar, so they get tabs.
  // Pinned views (Favourites, Most played) render without the tab row.
  const layout = useLayout();
  const showTabs = (layout === 'phone' || layout === 'tablet') && !isPinnedPage;
  const showBack = (layout === 'phone' || layout === 'tablet') && isPinnedPage;

  const handleBack = () => {
    if (typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
    } else {
      navigate('/playlists');
    }
  };

  // A view opened by link may be off to the side of the tabs row: bring its tab into sight.
  const activeTabRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeTab, showTabs]);
  // The song list scrolls here; only the rows in view are drawn (lib/useVirtualRows.ts).
  const listRef = useRef<HTMLDivElement>(null);

  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'server'>('all');
  const [downloadedOnly, setDownloadedOnly] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const isOffline = mode === 'offline';
  const { user } = useAuth();
  const isFav = useFavouriteLookup();

  // Whether the current view is account-only and the user is a guest
  const isAccountOnly = isFavouritesView || isMostPlayedView || activeTab === 'Albums' || activeTab === 'Artists';
  const guestTab = !isOffline && !user && isAccountOnly;

  // Liked chip / view toggles filter=liked
  const isLikedView = isFavouritesView;
  const serverFilter: 'all' | 'liked' = isLikedView ? 'liked' : 'all';

  const librarySongs = useLibrarySongs({ filter: serverFilter, sort, enabled: !isOffline });
  const { data: mostPlayedData, loading: mostLoading } = useMostPlayed();
  const { data: albumsData, loading: albumsLoading } = useLibraryAlbums();
  const { data: artistsData, loading: artistsLoading } = useLibraryArtists();

  const local = useLocalLibrary();

  const downloadServerIdByLocalId = useMemo(() => {
    const map = new Map<string, string>();
    for (const [srvId, locId] of local.downloads) {
      map.set(locId, srvId);
    }
    return map;
  }, [local.downloads]);

  const isTrackLiked = useCallback(
    (t: Track, defaultLiked = false): boolean => {
      const srvLiked = t.favourite || defaultLiked;
      if (isFav(t.id, srvLiked)) return true;
      const srvId = downloadServerIdByLocalId.get(t.id);
      if (srvId && isFav(srvId, srvLiked)) return true;
      return false;
    },
    [isFav, downloadServerIdByLocalId],
  );

  // "On device" source filter and "Downloaded only" call loadAll() first (they'd lie on a partial list)
  useEffect(() => {
    if ((sourceFilter === 'local' || downloadedOnly) && librarySongs.hasMore && !isOffline) {
      void librarySongs.loadAll();
    }
  }, [sourceFilter, downloadedOnly, librarySongs.hasMore, isOffline, librarySongs.loadAll]);

  const effectiveSortKey: SortKey = sort?.key ?? 'addedAt';
  const naturalDesc = effectiveSortKey === 'addedAt' || effectiveSortKey === 'playCount';
  const effectiveDesc: boolean = sort ? sort.desc : naturalDesc;

  // Songs resolved from server + device
  let tracks: Track[] = [];
  let loading = false;

  const isSongsTab = !isPinnedPage && activeTab === 'Songs';

  if (isMostPlayedView) {
    tracks = resolveLocalRefs(mostPlayedData?.items || [], local);
    loading = mostLoading;
  } else if (isFavouritesView || isSongsTab) {
    if (isOffline) {
      // Offline: show only device files (no server)
      tracks = isLikedView ? local.tracks.filter((t) => isTrackLiked(t, false)) : local.tracks;
      if (sort) tracks = sortTracks(tracks, sort.key, sort.desc);
      loading = false;
    } else {
      const serverItems = resolveLocalRefs(librarySongs.items, local);

      if (isLikedView) {
        // Liked: only what the server returns (which may include local: refs)
        // Hide rows that are no longer liked using the favourites overlay
        tracks = serverItems.filter((t) => isTrackLiked(t, true));
      } else {
        // Songs (all): merge device files with server tracks.
        tracks = mergeSongs(serverItems, local.tracks, effectiveSortKey, effectiveDesc, librarySongs.hasMore);
      }

      loading = librarySongs.loading && librarySongs.items.length === 0 && local.tracks.length === 0;
    }
  }

  if (isOffline && !isSongsTab && activeTab !== 'Downloads') {
    tracks = tracks.filter((t) => t.source === 'local' || local.downloads.has(t.id));
    loading = false;
  }

  if (sourceFilter === 'local') {
    tracks = tracks.filter((t) => t.source === 'local' || local.downloads.has(t.id));
  } else if (sourceFilter === 'server') {
    tracks = tracks.filter((t) => t.source === 'server' && !local.downloads.has(t.id));
  }

  if (downloadedOnly) {
    tracks = tracks.filter((t) => t.source === 'local' || local.downloads.has(t.id));
  }

  const isTrackTab = activeTab === 'Songs' || isFavouritesView || isMostPlayedView;
  const from = { kind: 'Library', name: isLikedView ? 'Liked Songs' : isMostPlayedView ? 'Most played' : activeTab };
  // Songs rows are ~58px (measured once drawn); the container is remounted (and its scroll reset) by the key below.
  const virtual = useVirtualRows({
    count: tracks.length,
    rowHeight: 58,
    gap: 2,
    scrollRef: listRef,
    deps: [activeTab, viewParam, mode, view, sourceFilter, downloadedOnly],
  });

  const sortBy = (key: SortKey) => {
    const preset = SORTS.find((s) => s.key === key)!;
    setSort((prev) => (prev?.key === key ? { key, desc: !prev.desc } : { key, desc: preset.desc }));
  };

  const headerCell = (key: SortKey, label: React.ReactNode, className?: string) => {
    const on = sort?.key === key;
    return (
      <button
        className={cn(
          'flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer text-label-s hover:text-t1',
          on ? 'text-t1' : 'text-t3',
          className,
        )}
        onClick={() => sortBy(key)}
        aria-label={`Sort by ${SORTS.find((s) => s.key === key)!.label}`}
      >
        {label}
        {on && <Icon name={sort!.desc ? 'chevron-down' : 'chevron-up'} size={12} />}
      </button>
    );
  };

  const groupLocal = (key: 'album' | 'artist') => {
    const groups = new Map<string, Track[]>();
    for (const t of local.tracks) {
      const name = (key === 'album' ? t.album : t.artist) || (key === 'album' ? 'Unknown album' : 'Unknown artist');
      groups.set(name, [...(groups.get(name) ?? []), t]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  const handlePlayAll = async () => {
    if (sourceFilter === 'local' || downloadedOnly) {
      // Filtered to device only: use already-filtered tracks (already complete)
      if (tracks.length > 0) playTrack(tracks[0], tracks, from);
    } else if (activeTab === 'Songs' && !isPinnedPage && librarySongs.hasMore) {
      const all = await librarySongs.loadAll();
      const resolved = resolveLocalRefs(all, local);
      const full = mergeSongs(resolved, local.tracks, effectiveSortKey, effectiveDesc, false);
      if (full.length > 0) playTrack(full[0], full, from);
    } else if (isFavouritesView && librarySongs.hasMore) {
      const all = await librarySongs.loadAll();
      const resolved = resolveLocalRefs(all, local).filter((t) => isTrackLiked(t, true));
      if (resolved.length > 0) playTrack(resolved[0], resolved, from);
    } else {
      if (tracks.length > 0) playTrack(tracks[0], tracks, from);
    }
  };

  const handleShuffle = async () => {
    if (sourceFilter === 'local' || downloadedOnly) {
      if (tracks.length > 0) playShuffled(tracks, from);
    } else if (activeTab === 'Songs' && !isPinnedPage && librarySongs.hasMore) {
      const all = await librarySongs.loadAll();
      const resolved = resolveLocalRefs(all, local);
      const full = mergeSongs(resolved, local.tracks, effectiveSortKey, effectiveDesc, false);
      if (full.length > 0) playShuffled(full, from);
    } else if (isFavouritesView && librarySongs.hasMore) {
      const all = await librarySongs.loadAll();
      const resolved = resolveLocalRefs(all, local).filter((t) => isTrackLiked(t, true));
      if (resolved.length > 0) playShuffled(resolved, from);
    } else {
      if (tracks.length > 0) playShuffled(tracks, from);
    }
  };

  // Multi-select state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastToggledIndex, setLastToggledIndex] = useState<number | null>(null);

  const exitSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
    setLastToggledIndex(null);
  }, []);

  // Leave selection mode when tab or sort changes
  useEffect(() => {
    exitSelection();
  }, [activeTab, sort, exitSelection]);

  // Esc leaves selection mode
  useEffect(() => {
    if (!isSelecting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSelecting, exitSelection]);

  const selectedTracks = useMemo(() => tracks.filter((t) => selectedIds.has(t.id)), [tracks, selectedIds]);
  const likedSelected = useMemo(
    () => selectedTracks.filter((t) => isTrackLiked(t, isLikedView)),
    [selectedTracks, isTrackLiked, isLikedView],
  );
  const downloadable = useMemo(
    () => selectedTracks.filter((t) => t.source !== 'local' && !local.downloads.has(t.id)),
    [selectedTracks, local.downloads],
  );

  const handleToggleSelect = useCallback(
    (id: string, index: number, e: React.MouseEvent) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (e.shiftKey && lastToggledIndex !== null) {
          const start = Math.min(lastToggledIndex, index);
          const end = Math.max(lastToggledIndex, index);
          for (let i = start; i <= end; i++) {
            if (tracks[i]) next.add(tracks[i].id);
          }
        } else {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }
        return next;
      });
      setLastToggledIndex(index);
    },
    [lastToggledIndex, tracks],
  );

  const allLoadedSelected = tracks.length > 0 && tracks.every((t) => selectedIds.has(t.id));
  const someLoadedSelected = tracks.some((t) => selectedIds.has(t.id));

  const handleToggleSelectAll = useCallback(() => {
    if (allLoadedSelected) {
      setSelectedIds(new Set());
      setLastToggledIndex(null);
    } else {
      setSelectedIds(new Set(tracks.map((t) => t.id)));
    }
  }, [allLoadedSelected, tracks]);

  const handleEnqueue = useCallback(() => {
    enqueue(selectedTracks);
    exitSelection();
  }, [enqueue, selectedTracks, exitSelection]);

  const handleAddToPlaylist = useCallback(() => {
    void addToPlaylistDialog(selectedTracks);
    exitSelection();
  }, [selectedTracks, exitSelection]);

  const handleDownload = useCallback(async () => {
    if (downloadable.length > 0) {
      await downloadsStorage.enqueue(downloadable);
      showToast({
        title: 'Added to downloads',
        description:
          downloadable.length === 1
            ? downloadable[0].title
            : `${downloadable.length} ${downloadable.length === 1 ? 'song' : 'songs'}`,
        icon: 'download',
        variant: 'gold',
      });
    }
    exitSelection();
  }, [downloadable, exitSelection]);

  const handleRemoveLiked = useCallback(async () => {
    if (likedSelected.length === 0) return;
    if (likedSelected.length > 1) {
      const ok = await confirmDialog({
        title: 'Remove from Liked?',
        description: `Remove ${likedSelected.length} songs from your Liked Songs?`,
        confirmLabel: 'Remove',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await unlikeMany(likedSelected.map((t) => t.id));
      exitSelection();
    } catch {
      // unlikeMany rolls back
    }
  }, [likedSelected, exitSelection]);

  // Subtitle: prefer meta.total from the server, fall back to counted tracks
  const localOnlyCount = local.tracks.filter((t) => !librarySongs.items.some((s) => s.id === t.id)).length;
  const songsTotal = librarySongs.total !== null ? librarySongs.total + localOnlyCount : tracks.length;
  const countSubtitle = isOffline
    ? `${tracks.length.toLocaleString()} songs on this device`
    : isLikedView
      ? `${(librarySongs.total ?? tracks.length).toLocaleString()} liked ${(librarySongs.total ?? tracks.length) === 1 ? 'song' : 'songs'}`
      : isMostPlayedView
        ? `${tracks.length.toLocaleString()} ${tracks.length === 1 ? 'song' : 'songs'}`
        : `${songsTotal.toLocaleString()} ${songsTotal === 1 ? 'song' : 'songs'} in your library`;

  const TAB_SUBTITLES: Partial<Record<Tab, string>> = {
    Albums: 'Albums in your library',
    Artists: 'Artists in your library',
    Downloads: 'Songs downloaded on this device',
  };

  const heading = isLikedView ? 'Liked Songs' : isMostPlayedView ? 'Most played' : (activeTab as string);

  return (
    <div className="@container relative flex flex-col gap-6 overflow-hidden h-full">
      {/* Header section */}
      <div className="flex flex-col gap-4 px-4 @[480px]:px-8 pt-5 @[480px]:pt-7 flex-none">
        {/* Title row */}
        <div className="flex flex-col @[480px]:flex-row @[480px]:items-center @[480px]:justify-between gap-4">
          <div className="flex items-center gap-2">
            {showBack && (
              <IconButton
                icon="arrow-left"
                label="Back"
                size={40}
                onClick={handleBack}
                className="-ml-2 text-t1 flex-none"
              />
            )}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-display-m text-t1 font-semibold truncate">{heading}</span>
              <span className="text-body-m text-t2 truncate">
                {isTrackTab ? countSubtitle : TAB_SUBTITLES[activeTab]}
              </span>
            </div>
          </div>
          {/* Action buttons (Shuffle / Play all) */}
          <div className="flex items-center gap-2.5">
            {CAPS.localLibrary && activeTab === 'Songs' && !isPinnedPage && (
              <Link to="/settings?section=connection" className="btn btn-out">
                <Icon name="folder" size={15} />
                <span>Folders</span>
              </Link>
            )}
            {isTrackTab && (
              <>
                <Button
                  variant={isSelecting ? 'acc' : 'out'}
                  onClick={() => {
                    if (isSelecting) {
                      exitSelection();
                    } else {
                      setIsSelecting(true);
                      setView('list');
                    }
                  }}
                >
                  {isSelecting ? 'Cancel' : 'Select'}
                </Button>
                <Button variant="out" icon="shuffle" onClick={handleShuffle} disabled={tracks.length === 0}>
                  Shuffle
                </Button>
                <Button
                  variant={isOffline ? 'gold' : 'acc'}
                  icon="play"
                  onClick={handlePlayAll}
                  disabled={tracks.length === 0}
                >
                  Play all
                </Button>
              </>
            )}
          </div>
        </div>

        {showTabs && (
          <div className="tabs overflow-x-auto no-scrollbar flex items-center">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={cn('tab flex-none', activeTab === tab && 'on')}
                onClick={() => setActiveTab(tab)}
                ref={activeTab === tab ? activeTabRef : undefined}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Filter chips & list/grid toggle row */}
        {isTrackTab && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <Select
                size="sm"
                icon="sort"
                ariaLabel="Sort order"
                value={sort?.key ?? 'addedAt'}
                options={SORTS.map((s) => ({ value: s.key, label: s.label }))}
                onChange={(key) => {
                  const preset = SORTS.find((s) => s.key === key);
                  setSort(preset ? { key: preset.key, desc: preset.desc } : null);
                }}
              />

              {/* Liked chip: on Songs and Liked Songs view */}
              {(activeTab === 'Songs' || isLikedView) && !isOffline && (
                <button
                  className={cn('chip chip-sm inline-flex items-center gap-1.5 flex-none', isLikedView && 'chip-on')}
                  // Liked Songs is a page of its own (no tabs, a Back button), so going there is a
                  // step back can undo; leaving it from its own chip goes back to Songs.
                  onClick={() => (isLikedView ? setParams({}, { replace: true }) : setParams({ view: 'favourites' }))}
                  aria-pressed={isLikedView}
                >
                  <Icon name="heart" size={13} />
                  <span>Liked</span>
                </button>
              )}

              {/* On Songs + Favourites show source filter; Most played is server-only */}
              {(activeTab === 'Songs' || isLikedView) && (
                <Select
                  size="sm"
                  ariaLabel="Filter source"
                  value={sourceFilter}
                  options={SOURCE_FILTERS}
                  onChange={setSourceFilter}
                />
              )}

              {CAPS.offlineDownloads && (
                <button
                  className={cn('chip chip-sm inline-flex items-center gap-1.5 flex-none', downloadedOnly && 'chip-on')}
                  onClick={() => setDownloadedOnly((prev) => !prev)}
                >
                  <Icon name="smartphone" size={13} />
                  <span>Downloaded only</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <IconButton
                icon="list"
                label="List view"
                size={28}
                active={view === 'list'}
                onClick={() => setView('list')}
              />
              <IconButton
                icon="layout-grid"
                label="Grid view"
                size={28}
                active={view === 'grid'}
                onClick={() => setView('grid')}
              />
            </div>
          </div>
        )}

        {/* Table header */}
        {isTrackTab && view === 'list' && (
          <SongTableHeader showPlays>
            {isSelecting ? (
              <span className="flex items-center justify-end">
                <input
                  type="checkbox"
                  checked={allLoadedSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someLoadedSelected && !allLoadedSelected;
                  }}
                  onChange={handleToggleSelectAll}
                  aria-label="Select all"
                  className="w-4 h-4 rounded border-ln cursor-pointer accent-acc"
                />
              </span>
            ) : (
              <span className="text-right">#</span>
            )}
            <span />
            {headerCell('title', 'TITLE')}
            <span className="hidden @[720px]:inline">{headerCell('album', 'ALBUM')}</span>
            <span>SOURCE</span>
            <span className="hidden @[720px]:inline text-right">PLAYS</span>
            <span className="text-right flex items-center justify-end">
              {headerCell('durationMs', <Icon name="clock" size={13} />, 'justify-end')}
            </span>
            <span />
          </SongTableHeader>
        )}
      </div>

      {/* Main content list/grid / downloads view */}
      {activeTab === 'Downloads' ? (
        <DownloadsView embedded />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + viewParam + mode + view + sourceFilter + downloadedOnly}
            ref={listRef}
            className="flex flex-col gap-0.5 px-4 @[480px]:px-8 pb-[80px] overflow-auto"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {loading ? (
              <div className="flex flex-col gap-2 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="srow h-14 bg-s2/30 rounded" />
                ))}
              </div>
            ) : guestTab ? (
              <EmptyState
                icon="heart"
                title="This lives in your account"
                description="Create a free account to keep favourites, play history, albums and artists — on every device."
                action={
                  <span className="flex gap-2">
                    <Link to="/signin" state={{ mode: 'signup' }} className="no-underline">
                      <Button variant="acc">Create account</Button>
                    </Link>
                    <Link to="/signin" state={{ mode: 'signin' }} className="no-underline">
                      <Button variant="out">Sign in</Button>
                    </Link>
                  </span>
                }
              />
            ) : isOffline && (activeTab === 'Albums' || activeTab === 'Artists') ? (
              local.tracks.length === 0 ? (
                <EmptyState
                  icon="folder"
                  title="Nothing on this device"
                  description="Add a music folder or download songs while online"
                />
              ) : (
                <div className="flex gap-4 flex-wrap">
                  {groupLocal(activeTab === 'Albums' ? 'album' : 'artist').map(([name, group], i) => (
                    <Card
                      key={name}
                      title={name}
                      subtitle={`${group.length} ${group.length === 1 ? 'song' : 'songs'}`}
                      artVariant={`a${(i % 12) + 1}` as any}
                      thumbnail={group.find((t) => t.thumbnail)?.thumbnail}
                      onPlay={() => playTrack(group[0], group, from)}
                    />
                  ))}
                </div>
              )
            ) : activeTab === 'Albums' ? (
              <div className="flex gap-4 flex-wrap">
                {albumsLoading ? (
                  <div className="flex gap-4 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="acard w-[160px] h-[210px] bg-s2/40 rounded-md" />
                    ))}
                  </div>
                ) : (albumsData?.items || []).length === 0 ? (
                  <EmptyState
                    icon="disc"
                    title="No saved albums"
                    description="Favourite an album to see it in your library"
                  />
                ) : (
                  albumsData?.items.map((album, i) => (
                    <Card
                      key={album.id}
                      title={album.title}
                      subtitle={album.artist}
                      artVariant={`a${(i % 12) + 1}` as any}
                      thumbnail={album.thumbnail || `/api/v1/albums/${album.id}/artwork?size=140`}
                      to={`/album/${album.id}`}
                    />
                  ))
                )}
              </div>
            ) : activeTab === 'Artists' ? (
              <div className="flex gap-4 flex-wrap">
                {artistsLoading ? (
                  <div className="flex gap-4 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-[160px] h-[160px] bg-s2/40 rounded-full" />
                    ))}
                  </div>
                ) : (artistsData?.items || []).length === 0 ? (
                  <EmptyState
                    icon="mic"
                    title="No artists yet"
                    description="Follow artists, like songs or add them to a playlist to see their artists here"
                  />
                ) : (
                  artistsData?.items.map((artist, i) => (
                    <Link
                      key={artist.id}
                      to={`/artist/${artist.id}`}
                      className="acard w-[160px] no-underline text-inherit flex flex-col items-center text-center p-3 surf2 rounded-lg"
                    >
                      <Artwork
                        src={artist.thumbnail || `/api/v1/artists/${artist.id}/artwork?size=140`}
                        alt={artist.name}
                        variant={`a${(i % 12) + 1}` as any}
                        size={110}
                        radius="circ"
                      />
                      <span className="text-label-l text-t1 truncate mt-2 w-full">{artist.name}</span>
                      <span className="text-label-s text-t3 truncate">
                        {artist.following
                          ? 'Following'
                          : artist.songCount
                            ? `${artist.songCount} ${artist.songCount === 1 ? 'song' : 'songs'} in your library`
                            : 'Artist'}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            ) : tracks.length === 0 && !librarySongs.loading ? (
              <EmptyState
                icon="music"
                title="No songs found"
                description={
                  activeTab === 'Songs' && !isLikedView
                    ? 'Songs you like or add to a playlist show up here.'
                    : isLikedView
                      ? 'Heart a song to add it to your Liked Songs.'
                      : 'Add songs or go online to browse catalog'
                }
              />
            ) : (
              <>
                {view === 'grid' ? (
                  <div className="flex gap-4 flex-wrap">
                    {tracks.map((track, i) => (
                      <Card
                        key={track.id}
                        title={track.title}
                        subtitle={track.artist}
                        artVariant={`a${(i % 12) + 1}` as any}
                        thumbnail={trackArtwork(track, 140)}
                        to={track.albumId ? `/album/${track.albumId}` : undefined}
                        onPlay={() => playTrack(track, tracks, from)}
                      />
                    ))}
                  </div>
                ) : (
                  <div data-virtual-rows className="flex flex-col gap-0.5 shrink-0" style={virtual.style}>
                    {tracks.slice(virtual.start, virtual.end).map((track, i) => {
                      const absoluteIndex = virtual.start + i;
                      return (
                        <SongRow
                          key={track.id}
                          track={track}
                          index={absoluteIndex + 1}
                          isActive={currentTrack?.id === track.id}
                          onClick={() => playTrack(track, tracks, from)}
                          showPlays
                          showPlaysSubtitle={isMostPlayedView}
                          selected={isSelecting ? selectedIds.has(track.id) : undefined}
                          onToggleSelect={
                            isSelecting ? (e) => handleToggleSelect(track.id, absoluteIndex, e) : undefined
                          }
                        />
                      );
                    })}
                  </div>
                )}
                {/* Load more: only for server-paged views when not filtered to device-only */}
                {(activeTab === 'Songs' || isLikedView) &&
                  !isOffline &&
                  sourceFilter !== 'local' &&
                  !downloadedOnly &&
                  librarySongs.hasMore && (
                    <LoadMore
                      loading={librarySongs.loadingMore}
                      error={librarySongs.moreError}
                      onClick={librarySongs.loadMore}
                    />
                  )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Floating selection action bar */}
      <AnimatePresence>
        {isSelecting && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={transition.fast}
            className="absolute bottom-[16px] left-1/2 -translate-x-1/2 z-40 bg-s1/95 backdrop-blur-md border border-ln rounded-full shadow-2xl px-[16px] py-[8px] flex items-center gap-[8px] max-w-[calc(100%-32px)] overflow-x-auto"
            role="toolbar"
            aria-label="Selection actions"
          >
            <span className="text-body-s font-semibold text-t1 whitespace-nowrap pl-[8px] pr-[4px] flex-none">
              {selectedIds.size} selected
            </span>
            <div className="h-[16px] w-[1px] bg-ln flex-none" />
            <Button
              variant="out"
              size="sm"
              icon="list"
              onClick={handleEnqueue}
              aria-label="Add to queue"
              data-tip="Add to queue"
              className="flex-none whitespace-nowrap px-[8px] @[720px]:px-[14px]"
            >
              <span className="hidden @[720px]:inline">Add to queue</span>
            </Button>
            <Button
              variant="out"
              size="sm"
              icon="plus"
              onClick={handleAddToPlaylist}
              aria-label="Add to playlist…"
              data-tip="Add to playlist…"
              className="flex-none whitespace-nowrap px-[8px] @[720px]:px-[14px]"
            >
              <span className="hidden @[720px]:inline">Add to playlist…</span>
            </Button>
            {CAPS.downloads && !isOffline && (
              <Button
                variant="out"
                size="sm"
                icon="download"
                onClick={handleDownload}
                disabled={downloadable.length === 0}
                aria-label="Download"
                data-tip="Download"
                className="flex-none whitespace-nowrap px-[8px] @[720px]:px-[14px]"
              >
                <span className="hidden @[720px]:inline">Download</span>
              </Button>
            )}
            <Button
              variant="out"
              size="sm"
              icon="heart"
              onClick={handleRemoveLiked}
              disabled={likedSelected.length === 0}
              aria-label="Remove from Liked"
              data-tip="Remove from Liked"
              className="flex-none whitespace-nowrap px-[8px] @[720px]:px-[14px]"
            >
              <span className="hidden @[720px]:inline">Remove from Liked</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon="close"
              onClick={exitSelection}
              aria-label="Cancel"
              data-tip="Cancel"
              className="flex-none whitespace-nowrap px-[8px] @[720px]:px-[14px]"
            >
              <span className="hidden @[720px]:inline">Cancel</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default Library;
