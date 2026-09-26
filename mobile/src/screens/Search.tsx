import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import type { SearchItem, Track } from '../data/types';
import { songCount } from '../lib/format';
import Icon from '../components/ui/Icon';

const ONLINE_FILTERS = ['all', 'songs', 'albums', 'artists', 'playlists', 'genres'] as const;
const OFFLINE_FILTERS = ['all', 'songs', 'albums', 'artists', 'playlists', 'folders'] as const;

type Filter = string;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const q = useDebounced(query.trim(), 350);
  const online = mode === 'online';
  const results = useAsync(
    () => api.search(q, filter as any),
    [q, filter],
    { enabled: online && q.length > 0 }
  );

  const items = q ? results.data?.items ?? [] : [];
  const tracks = items.filter((i): i is SearchItem & Track & { kind: 'track' } => i.kind === 'track');
  const albums = items.filter((i): i is SearchItem & { kind: 'album' } => i.kind === 'album');
  const artists = items.filter((i): i is SearchItem & { kind: 'artist' } => i.kind === 'artist');

  const topResult = albums[0] || items[0] || null;

  return (
    <Screen scrollable={false}>
      {/* Search Header */}
      <Header
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
            onChangeText={setQuery}
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
            className="overflow-visible -mx-5 px-5"
            contentContainerStyle={{ gap: 8 }}
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

        {online ? (
          /* ONLINE SEARCH RESULTS (M03) */
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {q.length > 0 && (
              <View className="flex-row items-center gap-2">
                <Icon name="cloud" size={14} color="#7E7E8C" />
                <Text className="text-t3 text-bs">
                  Searching Sonare library · {items.length ? `${items.length} results` : 'searching...'}
                </Text>
              </View>
            )}

            {!q ? (
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
                        if (topResult.kind === 'album') navigation.navigate('Album', { id: topResult.id });
                        else if (topResult.kind === 'artist') navigation.navigate('Artist', { id: topResult.id });
                        else if (topResult.kind === 'track') playTrack(topResult, tracks);
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
                          {'title' in topResult ? topResult.title : topResult.name}
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
                            icon={<Icon name={'source' in topResult && topResult.source === 'local' ? 'smartphone' : 'cloud'} size={10} color={'source' in topResult && topResult.source === 'local' ? '#FFC24D' : '#00E28A'} />}
                          />
                          {'trackCount' in topResult && topResult.trackCount ? (
                            <Badge label={`${topResult.trackCount} tracks`} variant="neutral" />
                          ) : null}
                        </View>
                      </View>
                      <View className="w-[52px] h-[52px] rounded-full items-center justify-center bg-acc shadow-glow-acc flex-none">
                        <Icon name="play" size={22} color="#000000" />
                      </View>
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
                      {tracks.slice(0, 5).map((item, index) => (
                        <SongRow
                          key={item.id}
                          track={item}
                          index={index}
                          isActive={currentTrack?.id === item.id}
                          onPress={() => playTrack(item, tracks)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Artists section */}
                {artists.length > 0 && (
                  <View className="gap-2.5">
                    <Text className="text-h2 font-semibold text-t1">Artists</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible -mx-5 px-5" contentContainerStyle={{ gap: 16 }}>
                      {artists.map((item, idx) => (
                        <Pressable
                          key={item.id}
                          onPress={() => navigation.navigate('Artist', { id: item.id })}
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
              </>
            )}
          </ScrollView>
        ) : (
          /* OFFLINE SEARCH RESULTS (M04) */
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Offline info strip */}
            <View className="flex-row items-center gap-2.5 p-2.5 px-3.5 bg-goldbg border border-[rgba(255,194,77,0.22)] rounded-md">
              <Icon name="smartphone" size={16} color="#FFC24D" />
              <Text className="text-t2 text-bs flex-1">
                Local results only. Online search is off while you're in Offline Mode.
              </Text>
            </View>

            <StateView empty="Search for songs, albums, artists on this device." />

            {/* Separated 'Not on this device' block */}
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
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setMode('online')}
                >
                  Go online
                </Button>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}
