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
  const resume = currentTrack ?? recentTracks[0] ?? null;
  const progress = currentTrack && durationMs ? Math.min(1, positionMs / durationMs) : 0;

  const refresh = () => {
    recent.refetch();
    favourites.refetch();
    trending.refetch();
  };

  const onResume = () => {
    if (!resume) return;
    if (currentTrack?.id === resume.id) setIsPlaying(!isPlaying);
    else playTrack(resume, recentTracks);
  };

  const firstName = user?.displayName?.split(' ')[0];

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
            <IconButton icon={<Icon name="search" size={20} color="#FFFFFF" />} onPress={() => navigation.navigate('Search')} accessibilityLabel="Search" />
            <IconButton icon={<Icon name="settings" size={20} color="#FFFFFF" />} onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings" />
            {firstName ? (
              <Pressable
                onPress={() => navigation.navigate('Settings')}
                accessibilityRole="button"
                accessibilityLabel="Your account"
                className="w-[30px] h-[30px] rounded-full bg-acc items-center justify-center ml-1 mr-1"
              >
                <Text className="text-black text-bm font-semibold">{firstName.charAt(0).toUpperCase()}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => navigation.navigate('SignIn', { mode: 'signin' })}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                className="h-[30px] px-3 rounded-full bg-acc items-center justify-center ml-1 mr-1"
              >
                <Text className="text-black text-bs font-semibold">Sign in</Text>
              </Pressable>
            )}
          </View>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#00E28A" colors={['#00E28A']} />}
      >
        <View className="px-5 pt-4 pb-6">
          <Text className="text-t3 text-bs mb-0.5">{greeting()}</Text>
          <Text className="text-h1 font-semibold text-t1 mb-5">{firstName ? `Welcome back, ${firstName}` : 'Welcome to Sonare'}</Text>

          {!online ? (
            <StateView empty="You're offline. Music saved to this phone will show up here once downloads arrive." />
          ) : (
            <>
              {resume && (
                <Pressable onPress={onResume} className="bg-s1 rounded-xl p-3 flex-row items-center gap-3 mb-6" accessibilityRole="button" accessibilityLabel={`Continue listening to ${resume.title}`}>
                  <Artwork uri={artworkUrl(resume, 140)} size={64} className="rounded-md" />
                  <View className="flex-1">
                    <Text className="text-t3 text-ov mb-1 font-medium tracking-wide uppercase text-[10px]">Continue listening</Text>
                    <Text className="text-t1 text-tm font-medium mb-1" numberOfLines={1}>{resume.title}</Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1 h-1 bg-s3 rounded-full overflow-hidden">
                        <View className="h-full bg-acc" style={{ width: `${progress * 100}%` }} />
                      </View>
                      <Text className="text-t3 text-mono-s">
                        {currentTrack?.id === resume.id ? formatDuration(positionMs) : resume.artist}
                      </Text>
                    </View>
                  </View>
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-1 bg-acc">
                    <Icon name={currentTrack?.id === resume.id && isPlaying ? 'pause' : 'play'} size={22} color="#000000" />
                  </View>
                </Pressable>
              )}

              {!signedIn && (
                <View className="bg-s1 rounded-xl p-4 mb-6 border border-ln">
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

              {recentTracks.length > 1 && (
                <View className="mb-6">
                  <Text className="text-h2 font-semibold text-t1 mb-3">Jump back in</Text>
                  <View className="flex-row flex-wrap gap-2.5">
                    {recentTracks.slice(0, 4).map((t, i) => (
                      <Animated.View key={t.id} entering={FadeIn.delay(i * 30)} className="w-[48%]">
                        <Pressable onPress={() => playTrack(t, recentTracks)} className="bg-s1 rounded-lg p-2.5 flex-row items-center gap-2" accessibilityRole="button" accessibilityLabel={`Play ${t.title}`}>
                          <Artwork uri={artworkUrl(t, 64)} size={40} className="rounded-sm" />
                          <View className="flex-1">
                            <Text className="text-t1 text-ll font-medium" numberOfLines={1}>{t.title}</Text>
                            <Text className="text-t3 text-ls" numberOfLines={1}>{t.artist}</Text>
                          </View>
                        </Pressable>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              )}

              {favouriteTracks.length > 0 && (
                <View className="mb-6 -mx-5 px-5">
                  <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="text-h2 font-semibold text-t1">Your favourites</Text>
                    <Pressable onPress={() => navigation.navigate('Library')} accessibilityRole="button">
                      <Text className="text-t2 text-ll">All ⟩</Text>
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible" contentContainerStyle={{ paddingRight: 20 }}>
                    {favouriteTracks.slice(0, 10).map((t, idx) => (
                      <Animated.View key={t.id} entering={FadeIn.delay(idx * 50)} className="mr-3 w-[132px]">
                        <Pressable onPress={() => playTrack(t, favouriteTracks)} accessibilityRole="button" accessibilityLabel={`Play ${t.title}`}>
                          <Artwork uri={artworkUrl(t, 300)} size={132} className="rounded-lg mb-2" />
                          <Text className="text-t1 text-tm font-medium" numberOfLines={1}>{t.title}</Text>
                          <Text className="text-t2 text-bs" numberOfLines={1}>{t.artist}</Text>
                        </Pressable>
                      </Animated.View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View className="mb-2">
                <Text className="text-h2 font-semibold text-t1 mb-2">Trending now</Text>
                <View className="-mx-4">
                  {trendingTracks.length === 0 ? (
                    <StateView loading={trending.loading} error={trending.error} onRetry={trending.refetch} empty="Nothing trending right now." />
                  ) : (
                    trendingTracks.slice(0, 8).map((item, index) => (
                      <SongRow
                        key={item.id}
                        track={item}
                        index={index}
                        showIndex
                        isPlaying={currentTrack?.id === item.id}
                        onPress={() => playTrack(item, trendingTracks)}
                      />
                    ))
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
