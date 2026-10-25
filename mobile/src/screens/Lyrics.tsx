import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, LayoutChangeEvent, Alert } from 'react-native';
import { Text } from '../components/ui/Text';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Artwork } from '../components/music/Artwork';
import { Ambient } from '../components/music/Ambient';
import { Waveform } from '../components/music/Waveform';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModeStore } from '../store/mode';
import { formatDuration } from '../lib/format';
import { Badge } from '../components/ui/Badge';
import { StateView } from '../components/ui/StateView';
import { usePlayerStore } from '../store/player';
import { Chip } from '../components/ui/Chip';
import { Switch } from '../components/ui/Switch';
import { api } from '../data/api';
import { useTrackArtwork } from '../store/deviceArt';
import { useArtColor } from '../hooks/useArtColor';
import { useAsync } from '../data/hooks';
import Icon from '../components/ui/Icon';
import { cn } from '../lib/cn';
import { useDevicePrefsStore } from '../store/devicePrefs';
import { useWaveform } from '../store/waveforms';
import { requireAccount } from '../data/accountGate';

/** One tap of "earlier" / "later" (the desktop app's step too). */
const OFFSET_STEP_MS = 250;

/** How long the app waits after the last tap before it saves the new offset. */
const OFFSET_SAVE_DELAY_MS = 600;

const offsetLabel = (ms: number) => `${ms > 0 ? '+' : ms < 0 ? '−' : ''}${(Math.abs(ms) / 1000).toFixed(2)}s`;

const stamp = (ms: number) => {
  return `${Math.floor(ms / 60000)}:${(Math.floor(ms / 1000) % 60).toString().padStart(2, '0')}`;
};

export const LyricsScreen = () => {
  const navigation = useNavigation<any>();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const mode = useModeStore((state) => state.mode);
  const insets = useSafeAreaInsets();
  const [userScrolling, setUserScrolling] = useState(false);
  const [view, setView] = useState<'synced' | 'plain'>('synced');

  const lyricsScript = useDevicePrefsStore((state) => state.lyricsScript);
  const lyricsAutoScroll = useDevicePrefsStore((state) => state.lyricsAutoScroll);
  const setLyricsAutoScroll = useDevicePrefsStore((state) => state.setLyricsAutoScroll);
  const wave = useWaveform(currentTrack, 76);
  const artUri = useTrackArtwork(currentTrack, 140);
  const artColor = useArtColor(artUri);
  const lyrics = useAsync(
    () => api.lyrics(currentTrack!.id, lyricsScript, currentTrack!),
    [currentTrack?.id, lyricsScript],
    {
      enabled: currentTrack?.source === 'server',
    },
  );
  const data = lyrics.data;
  const lines = data?.lines ?? [];
  const hasSynced = !!data?.synced && lines.length > 0;
  const showSynced = hasSynced && view === 'synced';
  const plain = data?.plain || lines.map((l) => l.text).join('\n');

  // The account's timing fix for this song, like the desktop app: positive shows each line later.
  // Taps move it at once; the save waits for a pause so it can't land out of order.
  const [offsetMs, setOffsetMs] = useState(0);
  useEffect(() => setOffsetMs(data?.offsetMs ?? 0), [data]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOffset = useRef<{ trackId: string; value: number } | null>(null);
  const flushOffset = useRef<() => void>(() => {});
  flushOffset.current = () => {
    const pending = pendingOffset.current;
    if (!pending) return;
    pendingOffset.current = null;
    api.updateLyricsOffset(pending.trackId, pending.value).catch(() => Alert.alert('Could not save the lyric timing'));
  };
  // A save still waiting when the screen closes goes out now.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flushOffset.current();
    };
  }, []);

  const changeOffset = (delta: number) =>
    requireAccount('Create a free account to fix lyrics and their timing.', () => {
      const next = offsetMs + delta;
      setOffsetMs(next);
      pendingOffset.current = { trackId: currentTrack!.id, value: next };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => flushOffset.current(), OFFSET_SAVE_DELAY_MS);
    });

  const at = positionMs - offsetMs;
  let activeIndex = -1;
  for (let i = 0; i < lines.length && lines[i].atMs <= at; i++) activeIndex = i;

  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lineY = useRef<Record<number, number>>({});

  // Keep the current line in view until the user takes over scrolling (and only while auto-scroll
  // is on).
  useEffect(() => {
    if (!showSynced || !lyricsAutoScroll || userScrolling || activeIndex < 0) return;
    const y = lineY.current[activeIndex];
    if (y !== undefined)
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, y - 120),
        animated: true,
      });
  }, [activeIndex, showSynced, userScrolling, lyricsAutoScroll]);

  if (!currentTrack) {
    return (
      <Screen>
        <Header
          title="Lyrics"
          left={
            <IconButton
              icon={<Icon name="chevron-down" size={20} color="#FFFFFF" />}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Close lyrics"
            />
          }
        />
        <StateView empty="Nothing playing" />
      </Screen>
    );
  }

  const isGold = mode === 'offline' || currentTrack.source === 'local';

  return (
    <Screen scrollable={false} className="bg-bg">
      <Ambient uri={artUri} color={artColor} />
      <Header
        title={<Text className="text-ll font-semibold text-t1">Lyrics</Text>}
        left={
          <IconButton
            icon={<Icon name="chevron-down" size={22} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close lyrics"
          />
        }
      />

      <View className="px-5 pt-2 pb-3">
        <View className="flex-row items-center gap-3">
          <Artwork uri={artUri} size={52} rings className="rounded-sm" />
          <View className="flex-1 min-w-0">
            <Text className="text-t1 text-tm font-medium truncate" numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text className="text-t2 text-bs truncate" numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          {data?.synced ? (
            <Badge label="Synced" variant="local" icon={<Icon name="lyrics" size={10} color="#FFC24D" />} />
          ) : data?.provider ? (
            <Badge label={data.provider} variant="neutral" />
          ) : null}
        </View>

        {data && (
          <View className="flex-row gap-2 mt-4">
            {hasSynced && (
              <Chip
                size="sm"
                label="Synced"
                active={view === 'synced'}
                icon={<Icon name="refresh" size={13} color={view === 'synced' ? '#00E28A' : '#7E7E8C'} />}
                onPress={() => setView('synced')}
              />
            )}
            <Chip size="sm" label="Plain text" active={!showSynced} onPress={() => setView('plain')} />
            {userScrolling && showSynced && (
              <Chip size="sm" label="Follow playback" onPress={() => setUserScrolling(false)} />
            )}
          </View>
        )}

        {showSynced && (
          <View className="flex-row items-center gap-2 mt-3">
            <Text className="text-bs text-t3 flex-1">Timing {offsetLabel(offsetMs)}</Text>
            <Chip
              size="sm"
              label="Earlier"
              icon={<Icon name="minus" size={13} color="#7E7E8C" />}
              onPress={() => changeOffset(-OFFSET_STEP_MS)}
            />
            <Chip
              size="sm"
              label="Later"
              icon={<Icon name="plus" size={13} color="#7E7E8C" />}
              onPress={() => changeOffset(OFFSET_STEP_MS)}
            />
          </View>
        )}

        {showSynced && (
          <View className="flex-row items-center gap-3 mt-3">
            <Switch
              value={lyricsAutoScroll}
              onValueChange={setLyricsAutoScroll}
              accessibilityLabel="Auto-scroll"
              variant={isGold ? 'gold' : 'default'}
            />
            <View className="flex-1">
              <Text className="text-tm font-medium text-t1">Auto-scroll</Text>
              <Text className="text-bs text-t3">Follow the line being sung</Text>
            </View>
          </View>
        )}
      </View>

      {!data ? (
        <View className="flex-1">
          <StateView
            loading={lyrics.loading}
            error={lyrics.error?.message?.includes('not found') ? null : lyrics.error}
            onRetry={lyrics.refetch}
            empty="No lyrics found for this song."
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          onScrollBeginDrag={() => setUserScrolling(true)}
          scrollEventThrottle={16}
        >
          {showSynced ? (
            lines.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <View
                  key={index}
                  className="flex-row items-start gap-3 mb-5"
                  onLayout={(e: LayoutChangeEvent) => {
                    lineY.current[index] = e.nativeEvent.layout.y;
                  }}
                >
                  <Text className={`w-[30px] pt-1.5 text-mono-s font-mono ${isActive ? 'text-acc' : 'text-t4'}`}>
                    {stamp(Math.max(0, item.atMs + offsetMs))}
                  </Text>
                  <Pressable
                    onPress={() => {
                      seekTo(Math.max(0, item.atMs + offsetMs));
                      setUserScrolling(false);
                    }}
                    className="flex-1"
                    accessibilityRole="button"
                    accessibilityHint="Jump to this line"
                  >
                    <Text
                      className={`text-h2 font-semibold ${isActive ? 'text-t1' : 'text-t3 opacity-55'}`}
                      style={
                        isActive
                          ? {
                              textShadowColor: 'rgba(0,226,138,0.35)',
                              textShadowRadius: 24,
                            }
                          : {}
                      }
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

      {/* The design's player bar under the lyrics: small waveform, time and transport. */}
      <View
        className="bg-[rgba(11,11,13,0.92)] border-t border-ln2 px-[22px] pt-3 gap-2.5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Waveform
          trackId={currentTrack.id}
          peaks={wave?.peaks}
          real={wave?.real}
          size="sm"
          progress={durationMs ? Math.min(1, positionMs / durationMs) : 0}
          mode={isGold ? 'offline' : 'online'}
          onSeek={durationMs ? (f) => seekTo(Math.round(f * durationMs)) : undefined}
        />
        <View className="flex-row items-center justify-between">
          <Text className="text-mono-s font-mono text-t2 w-12">{formatDuration(positionMs)}</Text>
          <View className="flex-row items-center gap-4">
            <IconButton
              icon={<Icon name="skip-back" size={18} color="#FFFFFF" />}
              size={32}
              onPress={playPrevious}
              accessibilityLabel="Previous track"
            />
            <Pressable
              onPress={() => setIsPlaying(!isPlaying)}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              className={cn(
                'w-10 h-10 rounded-full items-center justify-center',
                isGold ? 'bg-gold shadow-glow-gold' : 'bg-acc shadow-glow-acc',
              )}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={18} color="#000000" />
            </Pressable>
            <IconButton
              icon={<Icon name="skip-forward" size={18} color="#FFFFFF" />}
              size={32}
              onPress={playNext}
              accessibilityLabel="Next track"
            />
          </View>
          <Text className="text-mono-s font-mono text-t3 w-12 text-right">
            -{formatDuration(Math.max(0, (durationMs || currentTrack.durationMs || 0) - positionMs))}
          </Text>
        </View>
      </View>
    </Screen>
  );
};
