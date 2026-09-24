import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Artwork } from '../components/music/Artwork';
import { StateView } from '../components/ui/StateView';
import { usePlayerStore } from '../store/player';
import { Chip } from '../components/ui/Chip';
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import Icon from '../components/ui/Icon';

function stamp(ms: number) {
  return `${Math.floor(ms / 60000)}:${(Math.floor(ms / 1000) % 60).toString().padStart(2, '0')}`;
}

export function LyricsScreen() {
  const navigation = useNavigation<any>();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const [userScrolling, setUserScrolling] = useState(false);
  const [view, setView] = useState<'synced' | 'plain'>('synced');

  const lyrics = useAsync(() => api.lyrics(currentTrack!.id), [currentTrack?.id], {
    enabled: currentTrack?.source === 'server',
  });
  const data = lyrics.data;
  const lines = data?.lines ?? [];
  const hasSynced = !!data?.synced && lines.length > 0;
  const showSynced = hasSynced && view === 'synced';
  const plain = data?.plain || lines.map(l => l.text).join('\n');

  const at = positionMs + (data?.offsetMs ?? 0);
  let activeIndex = -1;
  for (let i = 0; i < lines.length && lines[i].atMs <= at; i++) activeIndex = i;

  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lineY = useRef<Record<number, number>>({});

  // Keep the current line in view until the user takes over scrolling.
  useEffect(() => {
    if (!showSynced || userScrolling || activeIndex < 0) return;
    const y = lineY.current[activeIndex];
    if (y !== undefined) scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
  }, [activeIndex, showSynced, userScrolling]);

  if (!currentTrack) {
    return (
      <Screen>
        <Header title="Lyrics" left={<IconButton icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Close lyrics" />} />
        <StateView empty="Nothing playing" />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} className="bg-s0">
      <Header
        title={currentTrack.title}
        left={<IconButton icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Close lyrics" />}
      />

      <View className="px-6 py-4">
        <View className="flex-row items-center gap-3">
          <Artwork uri={artworkUrl(currentTrack, 140)} size={48} className="rounded-lg" />
          <View className="flex-1">
            <Text className="text-t1 text-tm font-medium" numberOfLines={1}>{currentTrack.title}</Text>
            <Text className="text-t3 text-bs" numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          {data?.provider ? (
            <View className="bg-s3 px-2 py-1 rounded">
              <Text className="text-t2 text-mono-s">{data.provider}</Text>
            </View>
          ) : null}
        </View>

        {data && (
          <View className="flex-row gap-2 mt-4">
            {hasSynced && <Chip label="Synced" active={view === 'synced'} onPress={() => setView('synced')} />}
            <Chip label="Plain text" active={!showSynced} onPress={() => setView('plain')} />
            {userScrolling && showSynced && <Chip label="Follow playback" onPress={() => setUserScrolling(false)} />}
          </View>
        )}
      </View>

      {!data ? (
        <StateView loading={lyrics.loading} error={lyrics.error?.message?.includes('not found') ? null : lyrics.error} onRetry={lyrics.refetch} empty="No lyrics found for this song." />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 150 }}
          onScrollBeginDrag={() => setUserScrolling(true)}
          scrollEventThrottle={16}
        >
          {showSynced ? (
            lines.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <View
                  key={index}
                  className="flex-row items-start mb-6"
                  onLayout={(e: LayoutChangeEvent) => {
                    lineY.current[index] = e.nativeEvent.layout.y;
                  }}
                >
                  <Text className={`w-10 pt-1.5 text-mono-s ${isActive ? 'text-acc' : 'text-t4'}`}>{stamp(item.atMs)}</Text>
                  <Pressable
                    onPress={() => {
                      seekTo(Math.max(0, item.atMs - (data.offsetMs ?? 0)));
                      setUserScrolling(false);
                    }}
                    className="flex-1"
                    accessibilityRole="button"
                    accessibilityHint="Jump to this line"
                  >
                    <Text
                      className={`text-h2 font-bold ${isActive ? 'text-t1' : 'text-t3 opacity-55'}`}
                      style={isActive ? { textShadowColor: 'rgba(0,226,138,0.35)', textShadowRadius: 24 } : {}}
                    >
                      {item.text || '♪'}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          ) : plain ? (
            <Text className="text-t1 text-tl leading-7">{plain}</Text>
          ) : (
            <StateView empty="No lyrics found for this song." />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
