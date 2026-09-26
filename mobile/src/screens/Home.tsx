import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { SegmentedControl } from '../components/ui/Segmented';
import { SongRow } from '../components/music/SongRow';
import { IconButton } from '../components/ui/IconButton';
import { Artwork } from '../components/music/Artwork';
import { StateView } from '../components/ui/StateView';
import { Button } from '../components/ui/Button';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { useAuthStore } from '../data/auth';
import { useLibraryStore } from '../store/library';
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import type { Track } from '../data/types';
import { formatDuration } from '../lib/format';
import Animated, { FadeIn } from 'react-native-reanimated';
import { cn } from '../lib/cn';
import Icon from '../components/ui/Icon';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function greeting(now = new Date()) {
  const h = now.getHours();
  const part = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  return `${DAYS[now.getDay()]} ${part}`;
}

/** Recently played can include another device's local files; only server tracks play here. */
function playable(tracks: Track[] | undefined): Track[] {
  const seen = new Set<string>();
  return (tracks ?? []).filter(t => t.source === 'server' && !seen.has(t.id) && seen.add(t.id));
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);
  const user = useAuthStore(s => s.user);
  const signedIn = useAuthStore(s => s.status === 'signedIn');
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);

  const online = mode === 'online';
  // History and favourites belong to an account; guests just get the catalog.
  const recent = useAsync(() => api.recentlyPlayed(12), [user?.id], { enabled: online && signedIn, refetchOnFocus: true });
  // Re-read favourites when a heart is toggled anywhere (including a like made while signing in).
  const favouriteCount = useLibraryStore(s => Object.keys(s.favouriteIds).length);
  const favourites = useAsync(() => api.favourites(), [user?.id, favouriteCount], { enabled: online && signedIn, refetchOnFocus: true });
  const trending = useAsync(() => api.trending(20), [], { enabled: online });

  const recentTracks = signedIn ? playable(recent.data?.items) : [];
  const favouriteTracks = signedIn ? playable(favourites.data?.items) : [];
  const trendingTracks = trending.data?.items ?? [];
  const resume = currentTrack ?? (online ? recentTracks[0] : null);
  const progress = currentTrack && durationMs ? Math.min(1, positionMs / durationMs) : 0;

  const refresh = () => {
    if (online) {
      recent.refetch();
      favourites.refetch();
      trending.refetch();
    }
  };

  const onResume = () => {
    if (!resume) return;
    if (currentTrack?.id === resume.id) setIsPlaying(!isPlaying);
    else playTrack(resume, recentTracks);
  };

  const firstName = user?.displayName?.split(' ')[0] || (signedIn ? user?.displayName : null);

  return (
    <Screen scrollable={false}>
      <Header
        left={
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
        right={
          <View className="flex-row items-center gap-1">
            <IconButton
              icon={<Icon name="search" size={20} color="#9A9AA8" />}
              size={40}
              onPress={() => navigation.navigate('Search')}
              accessibilityLabel={online ? 'Search' : 'Search this device'}
            />
            {!online ? (
              <IconButton
                icon={<Icon name="folder" size={20} color="#9A9AA8" />}
                size={40}
                onPress={() => navigation.navigate('Folders')}
                accessibilityLabel="Music folders"
              />
            ) : (
              <IconButton
                icon={<Icon name="settings" size={20} color="#9A9AA8" />}
                size={40}
                onPress={() => navigation.navigate('Settings')}
                accessibilityLabel="Settings"
              />
            )}
            {!firstName && (
              <Pressable
                onPress={() => navigation.navigate('SignIn', { mode: 'signin' })}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                className="h-[30px] px-3 rounded-full bg-acc items-center justify-center ml-1"
              >
                <Text className="text-black text-bs font-semibold">Sign in</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel="Profile and settings"
              className={cn('w-[30px] h-[30px] rounded-full items-center justify-center ml-1', firstName ? 'bg-acc' : 'bg-s3')}
            >
              {firstName ? (
                <Text className="text-black text-bm font-semibold">{firstName.charAt(0).toUpperCase()}</Text>
              ) : (
                <Icon name="user" size={16} color="#9A9AA8" />
              )}
            </Pressable>
          </View>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#00E28A" colors={['#00E28A']} />}
      >
        <View className="px-5 pt-1 pb-6 gap-[22px]">
          {online ? (
            <>
              <View className="gap-0.5">
                <Text className="text-t3 text-bs">{greeting()}</Text>
                <Text className="text-h1 font-semibold text-t1">{firstName ? `Welcome back, ${firstName}` : 'Welcome to Sonare'}</Text>
              </View>

              {resume && (
                <Pressable
                  onPress={onResume}
                  className="bg-s1 border border-ln rounded-lg p-3 flex-row items-center gap-3.5"
                  accessibilityRole="button"
                  accessibilityLabel={`Continue listening to ${resume.title}`}
                >
                  <Artwork uri={artworkUrl(resume, 140)} size={68} rings className="rounded-sm" />
                  <View className="flex-1 gap-1.5 justify-center min-w-0">
                    <Text className="text-t3 text-ov font-semibold uppercase">Continue listening</Text>
                    <Text className="text-t1 text-tm font-medium truncate" numberOfLines={1}>
                      {resume.title}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1 h-1 bg-ln2 rounded-full overflow-hidden">
                        <View className="h-full bg-acc" style={{ width: `${progress * 100}%` }} />
                      </View>
                      <Text className="text-t3 text-mono-s font-mono">
                        {currentTrack?.id === resume.id && durationMs
                          ? formatDuration(positionMs)
                          : resume.artist}
                      </Text>
                    </View>
                  </View>
                  <View className="w-[52px] h-[52px] rounded-full items-center justify-center bg-acc shadow-glow-acc flex-none">
                    <Icon name={currentTrack?.id === resume.id && isPlaying ? 'pause' : 'play'} size={22} color="#000000" />
                  </View>
                </Pressable>
              )}

              {!signedIn && (
                <View className="bg-s1 rounded-xl p-4 border border-ln">
                  <Text className="text-t1 text-tm font-semibold mb-1">You're listening as a guest</Text>
                  <Text className="text-t2 text-bs mb-3">
                    Create a free account to save songs you love, build playlists and pick up where you left off on any device.
                  </Text>
                  <View className="flex-row gap-2">
                    <Button variant="accent" size="sm" onPress={() => navigation.navigate('SignIn', { mode: 'signup' })}>
                      Create account
                    </Button>
                    <Button variant="outline" size="sm" onPress={() => navigation.navigate('SignIn', { mode: 'signin' })}>
                      Sign in
                    </Button>
                  </View>
                </View>
              )}

              {/* Jump back in (2x2 grid) */}
              {recentTracks.length > 1 && (
                <View className="gap-3">
                  <Text className="text-h2 font-semibold text-t1">Jump back in</Text>
                  <View className="flex-row flex-wrap justify-between" style={{ rowGap: 10 }}>
                    {recentTracks.slice(0, 4).map((t, i) => (
                      <Animated.View key={t.id} entering={FadeIn.delay(i * 30)} className="w-[48.5%]">
                        <Pressable
                          onPress={() => playTrack(t, recentTracks)}
                          className="bg-s2 border border-ln rounded-sm p-2 pr-3.5 flex-row items-center gap-3"
                          accessibilityRole="button"
                          accessibilityLabel={`Play ${t.title}`}
                        >
                          <Artwork uri={artworkUrl(t, 64)} size={40} className="rounded-sm" />
                          <View className="flex-1 gap-0.5 min-w-0">
                            <Text className="text-t1 text-ll font-medium truncate" numberOfLines={1}>{t.title}</Text>
                            <Text className="text-t3 text-ls truncate" numberOfLines={1}>{t.artist}</Text>
                          </View>
                        </Pressable>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              )}

              {/* Made for you shelf */}
              {favouriteTracks.length > 0 && (
                <View className="gap-3">
                  <View className="flex-row items-baseline justify-between">
                    <Text className="text-h2 font-semibold text-t1">Made for you</Text>
                    <Pressable onPress={() => navigation.navigate('Library')} className="flex-row items-center gap-0.5" accessibilityRole="button">
                      <Text className="text-t2 text-ll">All</Text>
                      <Icon name="chevron-right" size={14} color="#9A9AA8" />
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible -mx-5 px-5" contentContainerStyle={{ gap: 12 }}>
                    {favouriteTracks.slice(0, 10).map((item, idx) => (
                      <Animated.View key={item.id} entering={FadeIn.delay(idx * 40)} className="w-[132px]">
                        <Pressable onPress={() => playTrack(item, favouriteTracks)} accessibilityRole="button" accessibilityLabel={`Play ${item.title}`}>
                          <Artwork uri={artworkUrl(item, 300)} size={132} rings className="rounded-md mb-2.5" />
                          <Text className="text-t1 text-tm font-medium truncate" numberOfLines={1}>{item.title}</Text>
                          <Text className="text-t2 text-bs truncate" numberOfLines={1}>{item.artist}</Text>
                        </Pressable>
                      </Animated.View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Trending now */}
              <View className="gap-3">
                <View className="flex-row items-baseline justify-between">
                  <Text className="text-h2 font-semibold text-t1">Trending now</Text>
                  <Pressable onPress={() => navigation.navigate('Search')} className="flex-row items-center gap-0.5" accessibilityRole="button">
                    <Text className="text-t2 text-ll">All</Text>
                    <Icon name="chevron-right" size={14} color="#9A9AA8" />
                  </Pressable>
                </View>
                <View className="-mx-2.5 gap-0.5">
                  {trendingTracks.length === 0 ? (
                    <StateView loading={trending.loading} error={trending.error} onRetry={refresh} empty="Nothing trending right now." />
                  ) : (
                    trendingTracks.slice(0, 8).map((item, index) => (
                      <SongRow
                        key={item.id}
                        track={item}
                        index={index}
                        showIndex
                        isActive={currentTrack?.id === item.id}
                        onPress={() => playTrack(item, trendingTracks)}
                      />
                    ))
                  )}
                </View>
              </View>
            </>
          ) : (
            /* OFFLINE MODE (M02) */
            <>
              {/* You're offline banner */}
              <View className="flex-row items-center gap-2.5 p-2.5 px-3.5 bg-goldbg border border-[rgba(255,194,77,0.22)] rounded-md">
                <Icon name="smartphone" size={18} color="#FFC24D" />
                <View className="flex-1 gap-0.5">
                  <Text className="text-ll font-semibold text-gold">You're offline</Text>
                  <Text className="text-t2 text-bs">No music stored on this device yet.</Text>
                </View>
              </View>

              <StateView empty="You're offline. Music saved to this phone will show up here once downloads arrive." />
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
