import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CAPS } from '../lib/caps';
import { useModeStore } from '../store/modeContext';
import { usePlayerStore } from '../store/playerContext';
import { useAsync, useDebounce, useGenres, usePlaylist, useSearch, notifyPlaylistsChanged } from '../api/hooks';
import { api } from '../api/api';
import { showToast } from '../store/toasts';
import { useLocalLibrary } from '../storage/local';
import SongRow, { SongTableHeader } from '../components/music/SongRow';
import Artwork from '../components/music/Artwork';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import DownloadButton from '../components/music/DownloadButton';
import { DEFAULT_GENRES, GenreCard, genreQuery, genreVariant } from '../components/music/GenreCard';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { fadeRise, transition } from '../lib/motion';
import { cn } from '../lib/cn';
import { useAppDispatch, useAppSelector } from '../store';
import {
  addRecent,
  clearRecent,
  loadMoreSearch,
  removeRecent,
  runSearch,
  searchKey,
  setQuery,
  setType,
  type SearchType,
} from '../store/searchSlice';
import LoadMore from '../components/ui/LoadMore';
import type { Track, Album, Artist, Playlist } from '../types';
import { AiSearchPicks } from '../components/ai/AiSearchPicks';
import { parseYouTubeLink } from '../../../shared/catalog/ids';

type ChipFilter = 'all' | SearchType;

const CHIPS: { id: ChipFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'playlists', label: 'Playlists' },
];

const SeeAll = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    className="text-label-l text-t3 bg-transparent border-0 cursor-pointer hover:text-t1 inline-flex items-center gap-1"
    aria-label={`See all ${label}`}
    onClick={onClick}
  >
    <span>See all</span>
    <Icon name="chevron-right" size={14} />
  </button>
);

// A search hit for a playlist comes back album-shaped (`title`, with `artist` as the owner or
// channel); a plain playlist fixture carries a `name`. Read whichever is there.
const playlistTitle = (pl: Playlist | Album): string =>
  'name' in pl && pl.name ? pl.name : 'title' in pl ? pl.title : 'Playlist';
const playlistSubtitle = (pl: Playlist | Album): string => {
  const owner =
    ('owner' in pl && typeof pl.owner === 'string' && pl.owner) ||
    ('artist' in pl && typeof pl.artist === 'string' && pl.artist) ||
    null;
  const count =
    'trackCount' in pl && pl.trackCount != null ? `${pl.trackCount} ${pl.trackCount === 1 ? 'song' : 'songs'}` : null;
  if (owner && count) return `${owner} · ${count}`;
  if (count) return count;
  if (owner) return `Playlist · ${owner}`;
  return 'Playlist';
};

const Search = () => {
  const { mode, setMode } = useModeStore();
  const { currentTrack, playTrack } = usePlayerStore();
  const dispatch = useAppDispatch();
  const { query, results, resultsFor, requested, status, error, nextCursor, loadingMore, loadMoreError, recent } =
    useAppSelector((s) => s.search);
  const [params, setParams] = useSearchParams();
  const addTo = params.get('addTo');
  const [activeChip, setActiveChip] = useState<ChipFilter>('all');

  const linkedQuery = params.get('q');
  useEffect(() => {
    if (linkedQuery === null) return;
    dispatch(setQuery(linkedQuery));
    const next = new URLSearchParams(params);
    next.delete('q');
    setParams(next, { replace: true });
  }, [linkedQuery]);

  const { data: addToPlaylist } = usePlaylist(addTo ?? undefined);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const addTrack = async (track: Track) => {
    if (!addTo) return;
    setAdded((prev) => new Set(prev).add(track.id));
    try {
      await api.addTracksToPlaylist(addTo, [track]);
      notifyPlaylistsChanged();
    } catch {
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
      showToast({ title: 'Could not add to playlist', description: track.title, icon: 'info' });
    }
  };

  const isOnline = mode === 'online';
  const hasQuery = query.trim().length > 0;
  const allActive = activeChip === 'all';

  const parsedLink = useMemo(() => parseYouTubeLink(query), [query]);

  // Map activeChip to searchSlice SearchType (when All, fetch songs as primary)
  const querySearchType: SearchType = activeChip === 'all' ? 'songs' : activeChip;

  // Results load once typing pauses for half a second: each search is four requests and a
  // screen of artwork, too much to spend on half-typed words (suggestions update sooner).
  // Coming back to results already shown, they stay; arriving mid-word (typing in the header
  // field opens this screen), the first letters wait like any others.
  const typed = query.trim();
  const debouncedQuery = useDebounce(typed, 500, resultsFor === searchKey(typed, querySearchType) ? typed : '');

  const linkResult = useAsync(
    async () => {
      if (!parsedLink) return null;
      if (parsedLink.kind === 'song') {
        const track = await api.getTrack(parsedLink.id);
        return { kind: 'song' as const, track };
      } else {
        const playlist = await api.getPlaylist(parsedLink.id);
        return { kind: 'playlist' as const, playlist };
      }
    },
    [parsedLink?.kind, parsedLink?.id],
    { enabled: !!parsedLink },
  );

  useEffect(() => {
    if (isOnline && debouncedQuery && !parsedLink) {
      dispatch(runSearch({ query: debouncedQuery, type: querySearchType }));
    }
  }, [isOnline, debouncedQuery, querySearchType, parsedLink]);

  const local = useLocalLibrary();
  const key = searchKey(debouncedQuery, querySearchType);
  const current = resultsFor === key;
  const failed = requested === key && status === 'error';
  const searchLoading = isOnline && !current && !failed;
  const searchError = isOnline && failed ? error : null;
  const needle = query.trim().toLowerCase();

  const localMatches = needle
    ? local.tracks.filter((t) => [t.title, t.artist, t.album].some((v) => v?.toLowerCase().includes(needle)))
    : [];

  const { data: genres } = useGenres();

  // All shows each kind from its own search, like the Android app. The extra searches only
  // run while All is the active chip.
  const extrasOn = isOnline && allActive && hasQuery && !parsedLink;
  const linkItem = linkResult.data;
  const artistsSearch = useSearch(debouncedQuery, 'artists', undefined, extrasOn);
  const albumsSearch = useSearch(debouncedQuery, 'albums', undefined, extrasOn);
  const playlistsSearch = useSearch(debouncedQuery, 'playlists', undefined, extrasOn);

  // Hits are told apart by the fields their own search returns. A playlist hit is album-shaped
  // (a `title` with `artist` as the owner/channel), so it is the album tests that let it through.
  const artistHits = (artistsSearch.data?.items ?? []).filter((item): item is Artist => 'albumCount' in item);
  const albumHits = (albumsSearch.data?.items ?? []).filter(
    (item): item is Album => 'trackCount' in item && 'title' in item,
  );
  const playlistHits = (playlistsSearch.data?.items ?? []).filter(
    (item): item is Playlist => !('durationMs' in item) && !('albumCount' in item),
  );
  const extrasLoading = allActive && (artistsSearch.loading || albumsSearch.loading || playlistsSearch.loading);

  const serverItems = isOnline && current ? results : [];
  // Merge items
  const combinedTracks = isOnline
    ? [
        ...localMatches,
        ...serverItems.filter(
          (item): item is Track => 'durationMs' in item && !localMatches.some((l) => l.id === item.id),
        ),
      ]
    : localMatches;

  const totalResultsCount = isOnline
    ? combinedTracks.length + (activeChip !== 'all' && activeChip !== 'songs' ? serverItems.length : 0)
    : localMatches.length;

  const from = { kind: 'Search', name: `“${query.trim()}”` };

  const handlePlay = (track: Track) => {
    playTrack(track, combinedTracks.length > 0 ? combinedTracks : [track], from);
  };

  // A section's "See all" opens the full results for that kind.
  const seeAll = (type: SearchType) => {
    setActiveChip(type);
    dispatch(setType(type));
  };

  // A recent query fills the field and searches again; the field is what drives the search.
  const runRecent = (entry: string) => dispatch(setQuery(entry));

  const canLoadMore = isOnline && current && !!nextCursor;
  const loadMore = () => dispatch(loadMoreSearch({ query: debouncedQuery, type: querySearchType }));

  // Find top result (prefer first match: album, song, or artist)
  const topSong = combinedTracks[0];

  // Nothing matched: no songs and, on All, none of the three extra searches either.
  const nothingFound =
    combinedTracks.length === 0 &&
    (!isOnline
      ? true
      : allActive
        ? artistHits.length === 0 && albumHits.length === 0 && playlistHits.length === 0
        : serverItems.length === 0);

  return (
    <div className="@container flex flex-col overflow-hidden h-full">
      {addTo && (
        <div className="onstrip mx-8 mt-6 gap-3 flex-none">
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-acc">Adding to {addToPlaylist?.name ?? 'playlist'}</span>
            <span className="text-label-s text-t3">
              {added.size > 0 ? `${added.size} added — search for more` : 'Search for songs and press + to add them'}
            </span>
          </span>
          <Link to={`/playlist/${addTo}`} className="btn btn-acc btn-sm no-underline">
            Done
          </Link>
        </div>
      )}

      {/* Chips bar & Count indicator */}
      {hasQuery && !parsedLink && (
        <div className="flex items-center justify-between px-8 pt-6 pb-2 flex-none flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {CHIPS.map((chip) => (
              <button
                key={chip.id}
                className={cn('chip', activeChip === chip.id && 'chip-on')}
                onClick={() => {
                  setActiveChip(chip.id);
                  if (chip.id !== 'all') {
                    dispatch(setType(chip.id));
                  }
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-body-s text-t3">
            {isOnline ? (
              <>
                <Icon name="cloud" size={15} />
                <span>Server + device · {totalResultsCount.toLocaleString()} results</span>
              </>
            ) : (
              <>
                <Icon name="smartphone" size={15} />
                <span className="text-gold">This device only · {totalResultsCount.toLocaleString()} matches</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Offline banner if offline */}
      {!isOnline && hasQuery && !parsedLink && CAPS.offlineMode && (
        <div className="mx-8 mt-4 offstrip flex-none">
          <Icon name="wifi-off" size={16} />
          <span className="text-body-m text-gold grow">Online search is unavailable in Offline Mode.</span>
          <button className="btn btn-sm btn-out" onClick={() => setMode('online')}>
            <Icon name="cloud" size={14} />
            <span>Search online instead</span>
          </button>
        </div>
      )}

      {/* Main content body */}
      <div className={cn('flex flex-col grow overflow-auto px-8 pb-8', (!hasQuery || parsedLink) && 'pt-6')}>
        <AnimatePresence mode="wait">
          {hasQuery ? (
            <motion.div
              key={parsedLink ? parsedLink.id : debouncedQuery + activeChip + mode}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition.normal}
              className="flex flex-col gap-6 pt-3"
              // Searches run as you type, so a query is remembered once one of its results is
              // used (played, opened, added), not on every pause in typing.
              onClickCapture={(e) => {
                if ((e.target as HTMLElement).closest('a, button') && !parsedLink) dispatch(addRecent(debouncedQuery));
              }}
            >
              {parsedLink ? (
                linkResult.loading ? (
                  <div className="flex flex-col gap-2 animate-pulse pt-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="srow h-14 bg-s2/30 rounded" />
                    ))}
                  </div>
                ) : linkResult.error || !linkItem ? (
                  <EmptyState
                    icon="info"
                    title="Couldn't open this link"
                    description="This song or playlist might be private, deleted, or unavailable."
                    action={
                      <Button variant="out" size="sm" icon="sync" onClick={linkResult.refetch}>
                        Try again
                      </Button>
                    }
                  />
                ) : linkItem.kind === 'song' ? (
                  <div className="flex flex-col gap-2 pt-2">
                    <SongTableHeader />
                    <SongRow
                      track={linkItem.track}
                      index={1}
                      isActive={currentTrack?.id === linkItem.track.id}
                      onClick={() => handlePlay(linkItem.track)}
                      onAdd={addTo ? () => void addTrack(linkItem.track) : undefined}
                      added={added.has(linkItem.track.id)}
                    />
                  </div>
                ) : (
                  <div className="flex gap-4 flex-wrap pt-2">
                    <Card
                      title={playlistTitle(linkItem.playlist)}
                      subtitle={
                        linkItem.playlist.owner
                          ? `Playlist · ${linkItem.playlist.owner}`
                          : playlistSubtitle(linkItem.playlist)
                      }
                      artVariant="a1"
                      thumbnail={
                        linkItem.playlist.thumbnail || `/api/v1/albums/${linkItem.playlist.id}/artwork?size=140`
                      }
                      to={`/playlist/${linkItem.playlist.id}`}
                    />
                  </div>
                )
              ) : (
                <>
                  {/* On demand: the AI turns the query into a few searches (components/ai) */}
                  {isOnline && (allActive || activeChip === 'songs') && (
                    <AiSearchPicks
                      query={debouncedQuery}
                      currentTrackId={currentTrack?.id}
                      onPlay={(track, queue) => playTrack(track, queue, { kind: 'Search', name: 'AI picks' })}
                    />
                  )}
                  {searchLoading || extrasLoading ? (
                    <div className="flex flex-col gap-2 animate-pulse pt-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="srow h-14 bg-s2/30 rounded" />
                      ))}
                    </div>
                  ) : searchError ? (
                    <div className="flex flex-col items-center gap-3 p-4 text-center">
                      <span className="text-red">Search error: {searchError}</span>
                      <Button
                        variant="out"
                        size="sm"
                        icon="sync"
                        onClick={() => dispatch(runSearch({ query: debouncedQuery, type: querySearchType }))}
                      >
                        Try again
                      </Button>
                    </div>
                  ) : nothingFound ? (
                    <EmptyState
                      icon="search"
                      title="No results found"
                      description={
                        isOnline ? `No results found matching "${query}"` : `Nothing on this device matches "${query}"`
                      }
                    />
                  ) : activeChip === 'all' ? (
                    <div className="flex flex-col gap-8">
                      {/* Top result and Songs, both from the songs search */}
                      {(topSong || combinedTracks.length > 0) && (
                        <div className="grid grid-cols-1 @4xl:grid-cols-[360px_minmax(0,1fr)] gap-7 items-start">
                          {topSong && (
                            <div className="flex flex-col gap-3">
                              <span className="text-overline text-t3 uppercase font-semibold">Top result</span>
                              <div className="surf flex flex-col gap-4 p-5 rounded-xl">
                                <Artwork
                                  src={topSong.thumbnail || `/api/v1/albums/${topSong.albumId}/artwork?size=240`}
                                  alt={topSong.title}
                                  variant="a2"
                                  size={168}
                                  radius="md"
                                  className="shadow-xl"
                                />
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-heading-m text-t1 font-semibold">{topSong.title}</span>
                                  <span className="text-body-m text-t2">
                                    Song · {topSong.artist} {topSong.album ? `· ${topSong.album}` : ''}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    {topSong.source === 'local' || local.downloads.has(topSong.id) ? (
                                      <span className="badge bg-local inline-flex items-center gap-1">
                                        <Icon name="smartphone" size={9} />
                                        <span>On device</span>
                                      </span>
                                    ) : (
                                      <span className="badge bg-cloud inline-flex items-center gap-1">
                                        <Icon name="cloud" size={9} />
                                        <span>Server</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2.5 mt-2">
                                  <button
                                    className="playbtn playbtn-48"
                                    aria-label={`Play ${topSong.title}`}
                                    onClick={() => handlePlay(topSong)}
                                  >
                                    <Icon name="play" size={21} />
                                  </button>
                                  <DownloadButton tracks={[topSong]} offline={!isOnline} />
                                </div>
                              </div>
                            </div>
                          )}

                          {combinedTracks.length > 0 && (
                            <div className="@container flex flex-col gap-3 min-w-0">
                              <div className="flex items-baseline justify-between">
                                <span className="text-overline text-t3 uppercase font-semibold">Songs</span>
                                <SeeAll label="songs" onClick={() => seeAll('songs')} />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                {combinedTracks.slice(0, 4).map((track, i) => (
                                  <SongRow
                                    key={track.id}
                                    track={track}
                                    index={i + 1}
                                    isActive={currentTrack?.id === track.id}
                                    onClick={() => handlePlay(track)}
                                    onAdd={addTo ? () => void addTrack(track) : undefined}
                                    added={added.has(track.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {artistHits.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-overline text-t3 uppercase font-semibold">Artists</span>
                            <SeeAll label="artists" onClick={() => seeAll('artists')} />
                          </div>
                          <div className="flex items-center gap-6 overflow-x-auto pb-2">
                            {artistHits.map((artist, i) => (
                              <Link
                                key={artist.id}
                                to={`/artist/${artist.id}`}
                                className="flex flex-col items-center gap-2 w-[92px] flex-none text-center no-underline text-inherit"
                              >
                                <Artwork
                                  src={artist.thumbnail || `/api/v1/artists/${artist.id}/artwork?size=140`}
                                  alt={artist.name}
                                  variant={`a${((i % 12) + 1) as 1}`}
                                  size={92}
                                  radius="circ"
                                />
                                <span className="text-label-m text-t1 truncate w-full">{artist.name}</span>
                                <span className="text-label-s text-t3">Artist</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {albumHits.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-overline text-t3 uppercase font-semibold">Albums</span>
                            <SeeAll label="albums" onClick={() => seeAll('albums')} />
                          </div>
                          <div className="flex gap-4 flex-wrap">
                            {albumHits.map((album, i) => (
                              <Card
                                key={album.id}
                                title={album.title}
                                subtitle={`Album · ${album.artist}`}
                                artVariant={`a${(i % 12) + 1}` as any}
                                thumbnail={album.thumbnail || `/api/v1/albums/${album.id}/artwork?size=140`}
                                to={`/album/${album.id}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {playlistHits.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-overline text-t3 uppercase font-semibold">Playlists</span>
                            <SeeAll label="playlists" onClick={() => seeAll('playlists')} />
                          </div>
                          <div className="flex gap-4 flex-wrap">
                            {playlistHits.map((pl, i) => (
                              <Card
                                key={pl.id}
                                title={playlistTitle(pl)}
                                subtitle={playlistSubtitle(pl)}
                                artVariant={`a${(i % 12) + 1}` as any}
                                thumbnail={pl.thumbnail || `/api/v1/albums/${pl.id}/artwork?size=140`}
                                to={`/playlist/${pl.id}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Offline Notice at the bottom (matching D04 Not on this device) */}
                      {!isOnline && (
                        <div className="surf flex flex-col @[600px]:flex-row @[600px]:items-center justify-between gap-4 p-5 rounded-xl border border-ln">
                          <div className="flex items-center gap-3.5">
                            <span className="icobox flex-none">
                              <Icon name="cloud" size={18} />
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-body-l text-t1 font-medium">Not on this device</span>
                              <span className="text-body-s text-t3">
                                Go online to search and stream the full catalog.
                              </span>
                            </div>
                          </div>
                          <Button variant="acc" size="sm" icon="cloud" onClick={() => setMode('online')}>
                            Go online
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : activeChip === 'songs' ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <SongTableHeader />
                        {combinedTracks.map((track, i) => (
                          <SongRow
                            key={track.id}
                            track={track}
                            index={i + 1}
                            isActive={currentTrack?.id === track.id}
                            onClick={() => handlePlay(track)}
                            onAdd={addTo ? () => void addTrack(track) : undefined}
                            added={added.has(track.id)}
                          />
                        ))}
                      </div>
                      {canLoadMore && <LoadMore loading={loadingMore} error={loadMoreError} onClick={loadMore} />}
                    </>
                  ) : activeChip === 'albums' ? (
                    <>
                      <div className="flex gap-4 flex-wrap pt-2">
                        {serverItems
                          .filter((item): item is Album => 'trackCount' in item)
                          .map((album, i) => (
                            <Card
                              key={album.id}
                              title={album.title}
                              subtitle={`Album · ${album.artist}`}
                              artVariant={`a${(i % 12) + 1}` as any}
                              thumbnail={album.thumbnail || `/api/v1/albums/${album.id}/artwork?size=140`}
                              to={`/album/${album.id}`}
                            />
                          ))}
                      </div>
                      {canLoadMore && <LoadMore loading={loadingMore} error={loadMoreError} onClick={loadMore} />}
                    </>
                  ) : activeChip === 'artists' ? (
                    <>
                      <div className="flex gap-4 flex-wrap pt-2">
                        {serverItems
                          .filter((item): item is Artist => 'albumCount' in item || 'following' in item)
                          .map((artist, i) => (
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
                              <span className="text-label-s text-t3 truncate">Artist</span>
                            </Link>
                          ))}
                      </div>
                      {canLoadMore && <LoadMore loading={loadingMore} error={loadMoreError} onClick={loadMore} />}
                    </>
                  ) : (
                    <>
                      <div className="flex gap-4 flex-wrap pt-2">
                        {serverItems
                          .filter((item): item is Playlist => !('durationMs' in item) && !('albumCount' in item))
                          .map((pl, i) => (
                            <Card
                              key={pl.id}
                              title={playlistTitle(pl)}
                              subtitle={playlistSubtitle(pl)}
                              artVariant={`a${(i % 12) + 1}` as any}
                              thumbnail={pl.thumbnail || `/api/v1/albums/${pl.id}/artwork?size=140`}
                              to={`/playlist/${pl.id}`}
                            />
                          ))}
                      </div>
                      {canLoadMore && <LoadMore loading={loadingMore} error={loadMoreError} onClick={loadMore} />}
                    </>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-6">
              {recent.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-title-l text-t1 font-semibold">Recent searches</span>
                    <button
                      className="text-label-l text-t3 bg-transparent border-0 cursor-pointer hover:text-t1"
                      onClick={() => dispatch(clearRecent())}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {recent.map((entry) => (
                      <div key={entry} className="flex items-center gap-1">
                        <button
                          className="flex items-center gap-3 grow h-11 px-3 rounded-lg bg-transparent border-0 cursor-pointer text-left hover:bg-s2"
                          aria-label={`Search for ${entry}`}
                          onClick={() => runRecent(entry)}
                        >
                          <Icon name="clock" size={15} className="text-t3 flex-none" />
                          <span className="grow text-body-m text-t2 truncate">{entry}</span>
                        </button>
                        <button
                          className="ib ib-28 flex-none"
                          aria-label={`Remove ${entry} from recent searches`}
                          data-tip="Remove"
                          onClick={() => dispatch(removeRecent(entry))}
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <span className="text-title-l text-t1 font-semibold">Browse categories</span>
              <div className="grid grid-cols-2 @md:grid-cols-4 gap-3">
                {(genres ?? DEFAULT_GENRES).map((g, i) => (
                  <GenreCard
                    key={g.id}
                    id={g.id}
                    name={g.name}
                    variant={genreVariant(i)}
                    onClick={() => dispatch(setQuery(genreQuery(g)))}
                  />
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default Search;
