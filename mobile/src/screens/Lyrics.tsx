import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, LayoutChangeEvent, TextInput, Alert, Dimensions } from 'react-native';
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
import { api } from '../data/api';
import { artworkUrl } from '../data/config';
import { useAsync } from '../data/hooks';
import Icon from '../components/ui/Icon';
import { cn } from '../lib/cn';
import { useDevicePrefsStore } from '../store/devicePrefs';
import { useWaveform } from '../store/waveforms';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Button';
import { requireAccount } from '../data/accountGate';

/** One tap of "earlier" / "later" (the desktop app's step too). */
const OFFSET_STEP_MS = 250;

const toLrc = (lines: { atMs: number; text: string }[]): string => {
  return lines
    .map((l) => {
      const m = Math.floor(l.atMs / 60000);
      const s = ((l.atMs % 60000) / 1000).toFixed(2).padStart(5, '0');
      return `[${String(m).padStart(2, '0')}:${s}]${l.text}`;
    })
    .join('\n');
};

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
  const wave = useWaveform(currentTrack, 76);
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
  const [offsetMs, setOffsetMs] = useState(0);
  useEffect(() => setOffsetMs(data?.offsetMs ?? 0), [data]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const changeOffset = (delta: number) =>
    requireAccount('Create a free account to fix lyrics and their timing.', () => {
      const next = offsetMs + delta;
      setOffsetMs(next);
      api.updateLyricsOffset(currentTrack!.id, next).catch(() => Alert.alert('Could not save the lyric timing'));
    });

  const startEditing = () =>
    requireAccount('Create a free account to fix lyrics and their timing.', () => {
      setDraft(hasSynced ? toLrc(lines) : plain);
      setEditing(true);
    });

  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || !currentTrack) return;
    setSaving(true);
    try {
      // Timestamps like [01:23.45] make it synced lyrics; anything else is plain text.
      await api.saveLyrics(currentTrack.id, /^\[\d{1,2}:\d{2}(\.\d+)?\]/m.test(text) ? { lrc: text } : { plain: text });
      setEditing(false);
      lyrics.refetch();
    } catch (e: any) {
      Alert.alert('Could not save the lyrics', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const at = positionMs - offsetMs;
  let activeIndex = -1;
  for (let i = 0; i < lines.length && lines[i].atMs <= at; i++) activeIndex = i;

  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lineY = useRef<Record<number, number>>({});

  // Keep the current line in view until the user takes over scrolling.
  useEffect(() => {
    if (!showSynced || userScrolling || activeIndex < 0) return;
    const y = lineY.current[activeIndex];
    if (y !== undefined)
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, y - 120),
        animated: true,
      });
  }, [activeIndex, showSynced, userScrolling]);

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
      <Ambient uri={artworkUrl(currentTrack, 64)} />
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
          <Artwork uri={artworkUrl(currentTrack, 140)} size={52} rings className="rounded-sm" />
          <View className="flex-1 min-w-0">
            <Text className="text-t1 text-tm font-medium truncate" numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text className="text-t2 text-bs truncate" numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          {data?.synced ? (
            <Badge label=".lrc" variant="local" icon={<Icon name="lyrics" size={10} color="#FFC24D" />} />
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
            <Chip size="sm" label="Edit" icon={<Icon name="edit" size={13} color="#7E7E8C" />} onPress={startEditing} />
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
      </View>

      {!data ? (
        <View className="flex-1">
          <StateView
            loading={lyrics.loading}
            error={lyrics.error?.message?.includes('not found') ? null : lyrics.error}
            onRetry={lyrics.refetch}
            empty="No lyrics found for this song."
          />
          {!lyrics.loading && currentTrack.source === 'server' && (
            <View className="items-center pb-10">
              <Button variant="outline" size="sm" onPress={startEditing}>
                Add lyrics
              </Button>
            </View>
          )}
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

      {/* Fix or add the words: LRC lines ([01:23.45] …) stay synced, anything else is plain text. */}
      <Sheet visible={editing} onClose={() => setEditing(false)}>
        <View className="px-6 pb-6 gap-3">
          <Text className="text-h2 font-semibold text-t1">Edit lyrics</Text>
          <Text className="text-bs text-t3">
            Lines starting with a time like [01:23.45] stay synced; without times they are saved as plain text. Saved to
            your account.
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="[00:12.00] First line…"
            placeholderTextColor="#7E7E8C"
            accessibilityLabel="Lyrics text"
            className="bg-s2 border border-ln2 rounded-md p-3 text-t1 text-bm font-mono"
            style={{ height: Dimensions.get('window').height * 0.4 }}
          />
          <View className="flex-row gap-2.5">
            <Button variant="outline" className="flex-1" onPress={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="accent" className="flex-1" onPress={saveEdit} disabled={saving || !draft.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </View>
        </View>
      </Sheet>

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
