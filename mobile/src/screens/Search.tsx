import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Keyboard, Alert } from 'react-native';
import { Text } from '../components/ui/Text';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Field } from '../components/ui/Field';
import { Chip } from '../components/ui/Chip';
import { Badge } from '../components/ui/Badge';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { SongRow } from '../components/music/SongRow';
import { Artwork } from '../components/music/Artwork';
import { StateView } from '../components/ui/StateView';
import { LoadMore } from '../components/ui/LoadMore';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useLibraryStore } from '../store/library';
import { usePhoneTracks } from '../store/localMusic';
import { useRecentSearchesStore } from '../store/recentSearches';
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import { usePagedList } from '../hooks/usePagedList';
import type { SearchItem, Track } from '../data/types';
import Icon from '../components/ui/Icon';
import { DEFAULT_GENRES, GenreCard, genreQuery, type Genre } from '../components/music/GenreCard';
import { groupLocalByAlbum, groupLocalByArtist, searchLocalTracks } from '../lib/localSearch';
import { AiSearchPicks } from '../components/ai/AiSearchPicks';

const ONLINE_FILTERS = ['all', 'songs', 'albums', 'artists', 'playlists', 'genres'] as const;
const OFFLINE_FILTERS = ['all', 'songs', 'albums', 'artists', 'playlists', 'folders'] as const;

type Filter = string;

// What the server can search. Other chips (genres, folders) have no server search of their own.
const SEARCH_TYPES = ['all', 'songs', 'albums', 'artists', 'playlists'] as const;
type SearchType = (typeof SEARCH_TYPES)[number];

const toSearchType = (filter: Filter): SearchType => {
  return SEARCH_TYPES.find((t) => t === filter) ?? 'all';
};

type TrackHit = Extract<SearchItem, { kind: 'track' }>;
type AlbumHit = Extract<SearchItem, { kind: 'album' }>;
type ArtistHit = Extract<SearchItem, { kind: 'artist' }>;

/**
 * A playlist hit can arrive album-shaped (a title with the artist as the owner or channel) or as
 * a plain playlist carrying a name; read whichever is there.
 */
const playlistTitle = (item: SearchItem): string => ('title' in item ? item.title : item.name);
const playlistOwner = (item: SearchItem): string =>
  'artist' in item && typeof item.artist === 'string' ? item.artist : '';

/** The first of the candidates that is there; the album list wins over a raw first result. */
const pickTopResult = (...candidates: (SearchItem | undefined)[]): SearchItem | null =>
  candidates.find((item) => item !== undefined) ?? null;

const chunk = <T,>(list: T[], size: number): T[][] => {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += size) rows.push(list.slice(i, i + size));
  return rows;
};

const useDebounced = <T,>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
};

/** One album or playlist result row: artwork, title, and how to read it. */
const ResultRow = ({
  uri,
  title,
  subtitle,
  accessibilityLabel,
  round,
  onPress,
}: {
  uri?: string;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  round?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center gap-3 px-2.5 py-2 rounded-md active:bg-s2"
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <Artwork uri={uri} size={44} rings={round} className={round ? 'rounded-full' : 'rounded-sm'} />
    <View className="flex-1 min-w-0 gap-0.5">
      <Text numberOfLines={1} className="text-tm font-medium text-t1">
        {title}
      </Text>
      <Text numberOfLines={1} className="text-t2 text-bs">
        {subtitle}
      </Text>
    </View>
  </Pressable>
);

const RecentSearches = ({
  searches,
  onPick,
  onRemove,
  onClear,
}: {
  searches: string[];
  onPick: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}) => (
  <View className="gap-0.5">
    <View className="flex-row items-baseline justify-between mb-1">
      <Text className="text-h2 font-semibold text-t1">Recent searches</Text>
      <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear recent searches">
        <Text className="text-t2 text-ll">Clear</Text>
      </Pressable>
    </View>
    {searches.map((entry) => (
      <View key={entry} className="flex-row items-center gap-1">
        <Pressable
          onPress={() => onPick(entry)}
          className="flex-1 flex-row items-center gap-3 h-11 rounded-md active:bg-s2"
          accessibilityRole="button"
          accessibilityLabel={`Search for ${entry}`}
        >
          <Icon name="history" size={16} color="#7E7E8C" />
          <Text className="flex-1 text-bm text-t2" numberOfLines={1}>
            {entry}
          </Text>
        </Pressable>
        <IconButton
          icon={<Icon name="close" size={14} color="#9A9AA8" />}
          size={32}
          onPress={() => onRemove(entry)}
          accessibilityLabel={`Remove ${entry}`}
        />
      </View>
    ))}
  </View>
);

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const recent = useRecentSearchesStore((state) => state.searches);

  // A genre opened elsewhere (Library → Genres) arrives as `q`.
  const route = useRoute<any>();
  const linkedQuery: string | undefined = route.params?.q;
  // An own playlist's "Add songs" opens this screen "adding to" it.
  const addTo: string | undefined = route.params?.addTo;
  const addToName: string | undefined = route.params?.addToName;
  useEffect(() => {
    if (!linkedQuery) return;
    setQuery(linkedQuery);
    setFilter('all');
    navigation.setParams({ q: undefined });
  }, [linkedQuery, navigation]);

  const q = useDebounced(query.trim(), 350);
  const typed = query.trim();
  // Online means Online Mode *and* a network: either one being down searches the phone instead.
  const net = useNetInfo();
  const connected = !!net.isConnected && net.isInternetReachable !== false;
  const modeOnline = mode === 'online';
  const online = modeOnline && connected;
  // "Add to playlist" mode: only where the playlist can be written to.
  const addMode = !!addTo && online;

  // The songs already added to the playlist from here; the + turns into a check.
  const [added, setAdded] = useState<Set<string>>(new Set());

  const addTrack = async (track: Track) => {
    if (!addTo) return;
    setAdded((prev) => new Set(prev).add(track.id));
    try {
      await api.addToPlaylist(addTo, [track]);
      useLibraryStore
        .getState()
        .reloadPlaylists()
        .catch(() => {});
    } catch (e: any) {
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
      Alert.alert("Couldn't add the song", e?.message || 'Check your connection and try again.');
    }
  };

  // Leaves add mode and opens the playlist with its new songs. Not goBack: this is a tab's
  // first screen, and going back from it lands on Home, not on the playlist.
  const doneAdding = () => {
    const playlistId = addTo;
    setAdded(new Set());
    navigation.setParams({ addTo: undefined, addToName: undefined });
    if (playlistId) navigation.navigate('Playlist', { id: playlistId });
  };

  const addButton = (track: Track) => {
    const isAdded = added.has(track.id);
    return (
      <IconButton
        icon={<Icon name={isAdded ? 'check' : 'plus'} size={18} color={isAdded ? '#00E28A' : '#9A9AA8'} />}
        size={32}
        onPress={() => addTrack(track)}
        disabled={isAdded}
        accessibilityLabel={isAdded ? `${track.title} added` : `Add ${track.title} to playlist`}
      />
    );
  };

  const showGenres = online && (!q || filter === 'genres');
  const genres = useAsync(() => api.genres(), [], { enabled: showGenres });
  const openGenre = (g: Genre) => {
    setQuery(genreQuery(g));
    setFilter('all');
  };
  const results = usePagedList<SearchItem>((cursor) => api.search(q, toSearchType(filter), cursor), [q, filter], {
    // Waits for the debounce to catch up, so switching chips mid-typing doesn't search a stale query.
    enabled: online && q.length > 0 && q === typed && filter !== 'genres',
  });

  // Autocomplete while typing, asked for once typing pauses; closed by picking one, submitting
  // or leaving the field. The previous list stays up while the next one loads.
  const [suggesting, setSuggesting] = useState(false);
  const sq = useDebounced(typed, 250);
  const suggestionsOn = online && suggesting && sq.length > 0 && sq.length <= 200;
  const suggested = useAsync(() => api.suggestions(sq), [sq], { enabled: suggestionsOn });
  const suggestions = suggestionsOn && typed ? (suggested.data ?? []).slice(0, 8) : [];

  const addRecent = useRecentSearchesStore((state) => state.add);
  const removeRecent = useRecentSearchesStore((state) => state.remove);
  const clearRecent = useRecentSearchesStore((state) => state.clear);
  // Every way a search is committed remembers the query for the Recent searches list.
  const remember = () => {
    if (typed) addRecent(typed);
  };
  const runSearch = (value: string) => {
    setQuery(value);
    setSuggesting(false);
    addRecent(value);
    Keyboard.dismiss();
  };
  const pickSuggestion = (s: string) => runSearch(s);

  const items = q ? results.items : [];
  const tracks = items.filter((i): i is TrackHit => i.kind === 'track');
  const artists = items.filter((i): i is ArtistHit => i.kind === 'artist');
  // The Albums and Playlists chips ask the server for that type, so a playlist hit that comes back
  // album-shaped still lands in the playlists list; on the All tab each kind goes to its section.
  const albumItems: AlbumHit[] = filter === 'playlists' ? [] : items.filter((i): i is AlbumHit => i.kind === 'album');
  const playlistItems: SearchItem[] = filter === 'playlists' ? items : items.filter((i) => i.kind === 'playlist');

  const firstAlbum: SearchItem | undefined = albumItems[0];
  const firstItem: SearchItem | undefined = items[0];
  const topResult = pickTopResult(firstAlbum, firstItem);
  // The All tab previews five songs; a chip shows every song loaded so far.
  const listedTracks = filter === 'all' ? tracks.slice(0, 5) : tracks;

  // The songs on the phone (downloads and music folders), searched with the same query while offline.
  const deviceTracks = usePhoneTracks();
  const localMatches = useMemo(() => (online ? [] : searchLocalTracks(deviceTracks, q)), [online, deviceTracks, q]);
  const localAlbumGroups = useMemo(() => groupLocalByAlbum(localMatches), [localMatches]);
  const localArtistGroups = useMemo(() => groupLocalByArtist(localMatches), [localMatches]);
  const playLocal = (track: Track, queue: Track[]) => playTrack(track, queue, { kind: 'Search', name: q });

  return (
    <Screen scrollable={false}>
      {/* Search Header */}
      <Header
        titleAlign="start"
        title={online ? 'Search' : 'Search device'}
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            size={40}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back"
          />
        }
        right={
          online ? (
            <View className="flex-row items-center gap-1.5 h-[26px] px-2.5 rounded-full bg-accbg">
              <View className="w-1.5 h-1.5 rounded-full bg-acc" />
              <Text className="text-ls font-semibold text-acc">ONLINE</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 h-[26px] px-2.5 rounded-full bg-goldbg">
              <View className="w-1.5 h-1.5 rounded-full bg-gold" />
              <Text className="text-ls font-semibold text-gold">OFFLINE</Text>
            </View>
          )
        }
      />

      <View className="flex-1 pt-2">
        {/* Search Field */}
        <View className="px-5">
          <Field
            icon={<Icon name="search" size={18} color="#7E7E8C" />}
            placeholder={online ? 'Search all music' : 'Search music on this device'}
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setSuggesting(true);
            }}
            onSubmitEditing={() => {
              setSuggesting(false);
              remember();
            }}
            onBlur={() => setSuggesting(false)}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={online ? 'Search all music' : 'Search music on this device'}
            clearButton={query.length > 0}
            onClear={() => setQuery('')}
          />
        </View>

        {/* Scope Chips */}
        <View className="my-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
          >
            {(online ? ONLINE_FILTERS : OFFLINE_FILTERS).map((f) => (
              <Chip
                key={f}
                label={f.charAt(0).toUpperCase() + f.slice(1)}
                onPress={() => setFilter(f)}
                active={filter === f}
                variant={online ? 'default' : 'gold'}
              />
            ))}
          </ScrollView>
        </View>

        {suggestions.length > 0 ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Search suggestions"
          >
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => pickSuggestion(s)}
                className="flex-row items-center gap-3 h-12 px-2 rounded-md active:bg-s2"
                accessibilityRole="button"
                accessibilityLabel={s}
              >
                <Icon name="search" size={16} color="#7E7E8C" />
                <Text className="flex-1 text-bm text-t2" numberOfLines={1}>
                  {s.toLowerCase().startsWith(typed.toLowerCase()) ? (
                    <>
                      {s.slice(0, typed.length)}
                      <Text className="text-bm font-semibold text-t1">{s.slice(typed.length)}</Text>
                    </>
                  ) : (
                    s
                  )}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : online ? (
          /* ONLINE SEARCH RESULTS (M03) */
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 140,
              gap: 16,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {addMode && (
              <View className="bg-s1 border border-ln rounded-md p-3.5 flex-row items-center gap-3">
                <View className="flex-1 gap-0.5 min-w-0">
                  <Text className="text-acc text-ll" numberOfLines={1}>
                    Adding to {addToName ?? 'playlist'}
                  </Text>
                  <Text className="text-t3 text-bs">
                    {added.size > 0
                      ? `${added.size} added — search for more`
                      : 'Search for songs and press + to add them'}
                  </Text>
                </View>
                <Button variant="accent" size="sm" onPress={doneAdding}>
                  Done
                </Button>
              </View>
            )}

            {!q && recent.length > 0 && (
              <RecentSearches searches={recent} onPick={runSearch} onRemove={removeRecent} onClear={clearRecent} />
            )}

            {q.length > 0 && !showGenres && (
              <View className="flex-row items-center gap-2">
                <Icon name="cloud" size={14} color="#7E7E8C" />
                <Text className="text-t3 text-bs">
                  Searching Sonare library · {items.length ? `${items.length} results` : 'searching...'}
                </Text>
              </View>
            )}

            {/* On demand: the AI turns the query into a few searches (components/ai) */}
            {online && q.length > 0 && !showGenres && (filter === 'all' || filter === 'songs') && (
              <AiSearchPicks key={q} query={q} />
            )}

            {showGenres ? (
              <View className="gap-3">
                <Text className="text-h2 font-semibold text-t1">Browse categories</Text>
                {chunk(genres.data ?? DEFAULT_GENRES, 2).map((row, r) => (
                  <View key={r} className="flex-row gap-2.5">
                    {row.map((g, i) => (
                      <GenreCard key={g.id} genre={g} index={r * 2 + i} onPress={() => openGenre(g)} />
                    ))}
                    {row.length === 1 && <View className="flex-1" />}
                  </View>
                ))}
              </View>
            ) : !q ? (
              <StateView empty="Search for songs, albums, artists and playlists." />
            ) : results.loading && items.length === 0 ? (
              <StateView loading empty="Searching..." />
            ) : items.length === 0 ? (
              <StateView error={results.error} onRetry={results.refetch} empty={`No results for "${q}"`} />
            ) : (
              <>
                {/* Top result card */}
                {topResult && (
                  <View className="gap-2.5">
                    <Text className="text-ov font-semibold text-t3 uppercase">Top result</Text>
                    <Pressable
                      onPress={() => {
                        remember();
                        if (topResult.kind === 'album') navigation.navigate('Album', { id: topResult.id });
                        else if (topResult.kind === 'artist') navigation.navigate('Artist', { id: topResult.id });
                        else if (topResult.kind === 'track')
                          playTrack(topResult, tracks, { kind: 'Search', name: `“${q}”` });
                        else if (topResult.kind === 'playlist') navigation.navigate('Playlist', { id: topResult.id });
                      }}
                      className="bg-s1 border border-ln rounded-lg p-3 flex-row items-center gap-3.5"
                      accessibilityRole="button"
                    >
                      <Artwork
                        uri={artworkUrl(topResult, 140)}
                        size={76}
                        rings
                        className={topResult.kind === 'artist' ? 'rounded-full' : 'rounded-sm'}
                      />
                      <View className="flex-1 gap-1 justify-center min-w-0">
                        <Text className="text-tl font-semibold text-t1 truncate" numberOfLines={1}>
                          {playlistTitle(topResult)}
                        </Text>
                        <Text className="text-t2 text-bs truncate" numberOfLines={1}>
                          {topResult.kind === 'album'
                            ? `Album · ${topResult.artist}${topResult.year ? ` · ${topResult.year}` : ''}`
                            : topResult.kind === 'artist'
                              ? 'Artist'
                              : topResult.kind === 'track'
                                ? `${topResult.artist} · ${topResult.album || 'Single'}`
                                : 'Playlist'}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <Badge
                            label={'source' in topResult && topResult.source === 'local' ? 'On device' : 'Server'}
                            variant={'source' in topResult && topResult.source === 'local' ? 'local' : 'cloud'}
                            icon={
                              <Icon
                                name={'source' in topResult && topResult.source === 'local' ? 'smartphone' : 'cloud'}
                                size={10}
                                color={'source' in topResult && topResult.source === 'local' ? '#FFC24D' : '#00E28A'}
                              />
                            }
                          />
                          {'trackCount' in topResult && topResult.trackCount ? (
                            <Badge label={`${topResult.trackCount} tracks`} variant="neutral" />
                          ) : null}
                        </View>
                      </View>
                      <View className="w-[52px] h-[52px] rounded-full items-center justify-center bg-acc shadow-glow-acc flex-none">
                        <Icon name="play" size={22} color="#000000" />
                      </View>
                      {addMode && topResult.kind === 'track' && addButton(topResult)}
                    </Pressable>
                  </View>
                )}

                {/* Songs section */}
                {tracks.length > 0 && (
                  <View className="gap-2.5">
                    <View className="flex-row items-baseline justify-between">
                      <Text className="text-h2 font-semibold text-t1">Songs</Text>
                      <Pressable onPress={() => setFilter('songs')} className="flex-row items-center gap-0.5">
                        <Text className="text-t2 text-ll">All</Text>
                        <Icon name="chevron-right" size={14} color="#9A9AA8" />
                      </Pressable>
                    </View>
                    <View className="-mx-2.5 gap-0.5">
                      {listedTracks.map((item, index) => (
                        <SongRow
                          key={item.id}
                          track={item}
                          index={index}
                          isActive={currentTrack?.id === item.id}
                          onPress={() => {
                            remember();
                            playTrack(item, tracks, { kind: 'Search', name: `“${q}”` });
                          }}
                          trailing={addMode ? addButton(item) : undefined}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Artists section */}
                {artists.length > 0 && (
                  <View className="gap-2.5">
                    <Text className="text-h2 font-semibold text-t1">Artists</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="-mx-5"
                      contentContainerStyle={{ gap: 16, paddingHorizontal: 20 }}
                    >
                      {artists.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            remember();
                            navigation.navigate('Artist', { id: item.id });
                          }}
                          className="w-[84px] items-center gap-1.5"
                          accessibilityRole="button"
                          accessibilityLabel={item.name}
                        >
                          <Artwork uri={artworkUrl(item, 140)} size={84} rings className="rounded-full" />
                          <Text className="text-tm font-medium text-t1 text-center truncate w-full" numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text className="text-bs text-t3 text-center">
                            {item.albumCount} {item.albumCount === 1 ? 'album' : 'albums'}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Albums section */}
                {albumItems.length > 0 && (
                  <View className="gap-1">
                    <Text className="text-h2 font-semibold text-t1">Albums</Text>
                    <View className="-mx-2.5 gap-0.5">
                      {albumItems.map((item) => (
                        <ResultRow
                          key={item.id}
                          uri={artworkUrl(item, 64)}
                          title={item.title}
                          subtitle={`Album · ${item.artist}`}
                          accessibilityLabel={`Album ${item.title} by ${item.artist}`}
                          onPress={() => {
                            remember();
                            navigation.navigate('Album', { id: item.id });
                          }}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Playlists section */}
                {playlistItems.length > 0 && (
                  <View className="gap-1">
                    <Text className="text-h2 font-semibold text-t1">Playlists</Text>
                    <View className="-mx-2.5 gap-0.5">
                      {playlistItems.map((item) => {
                        const owner = playlistOwner(item);
                        return (
                          <ResultRow
                            key={item.id}
                            uri={artworkUrl(item, 64)}
                            title={playlistTitle(item)}
                            subtitle={owner ? `Playlist · ${owner}` : 'Playlist'}
                            accessibilityLabel={`Playlist ${playlistTitle(item)}`}
                            onPress={() => {
                              remember();
                              navigation.navigate('Playlist', { id: item.id });
                            }}
                          />
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Offline search has no pages; a chip's list can ask for the next one. */}
                {filter !== 'all' && results.hasMore && (
                  <LoadMore loading={results.loadingMore} failed={!!results.loadMoreError} onPress={results.loadMore} />
                )}
              </>
            )}
          </ScrollView>
        ) : (
          /* OFFLINE SEARCH RESULTS (M04) */
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 140,
              gap: 16,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Offline info strip */}
            <View className="flex-row items-center gap-2.5 p-2.5 px-3.5 bg-goldbg border border-[rgba(255,194,77,0.22)] rounded-md">
              <Icon name="smartphone" size={16} color="#FFC24D" />
              <Text className="text-t2 text-bs flex-1">
                {modeOnline
                  ? 'No network. Showing the songs on this phone.'
                  : "Local results only. Online search is off while you're in Offline Mode."}
              </Text>
            </View>

            {!q ? (
              recent.length > 0 ? (
                <RecentSearches searches={recent} onPick={runSearch} onRemove={removeRecent} onClear={clearRecent} />
              ) : (
                <StateView empty="Search for songs, albums, artists on this device." />
              )
            ) : localMatches.length === 0 ? (
              <StateView empty={`Nothing on this phone matches "${q}"`} />
            ) : filter === 'albums' ? (
              <View className="-mx-2.5 gap-0.5">
                {localAlbumGroups.map((group) => (
                  <ResultRow
                    key={group.id}
                    uri={artworkUrl(group.tracks[0], 64)}
                    title={group.title}
                    subtitle={`Album · ${group.artist}`}
                    accessibilityLabel={`Play album ${group.title}`}
                    onPress={() => playLocal(group.tracks[0], group.tracks)}
                  />
                ))}
              </View>
            ) : filter === 'artists' ? (
              <View className="-mx-2.5 gap-0.5">
                {localArtistGroups.map((group) => (
                  <ResultRow
                    key={group.id}
                    uri={artworkUrl(group.tracks[0], 64)}
                    title={group.name}
                    subtitle={`${group.tracks.length} ${group.tracks.length === 1 ? 'song' : 'songs'}`}
                    accessibilityLabel={`Play ${group.name}`}
                    round
                    onPress={() => playLocal(group.tracks[0], group.tracks)}
                  />
                ))}
              </View>
            ) : filter === 'playlists' || filter === 'folders' ? (
              <StateView empty={`Nothing on this phone matches "${q}"`} />
            ) : (
              <View className="-mx-2.5 gap-0.5">
                {localMatches.map((track, index) => (
                  <SongRow
                    key={`${track.id}:${index}`}
                    track={track}
                    index={index}
                    isActive={currentTrack?.id === track.id}
                    onPress={() => playLocal(track, localMatches)}
                  />
                ))}
              </View>
            )}

            {/* Separated 'Not on this device' block */}
            {!modeOnline && (
              <View className="gap-2.5 pt-2">
                <Text className="text-ov font-semibold text-t3 uppercase">Not on this device</Text>
                <View className="bg-s1 border border-ln rounded-lg p-3.5 flex-row items-center gap-3 opacity-75">
                  <View className="w-9 h-9 rounded-sm bg-s3 items-center justify-center flex-none">
                    <Icon name="cloud" size={18} color="#9A9AA8" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-tm font-medium text-t2">Online search</Text>
                    <Text className="text-bs text-t3">Go online to search the full Sonare catalog.</Text>
                  </View>
                  <Button variant="outline" size="sm" onPress={() => setMode('online')}>
                    Go online
                  </Button>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
};
