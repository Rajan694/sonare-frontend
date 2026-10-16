import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '../ui/Text';
import Icon from '../ui/Icon';
import { SongRow } from '../music/SongRow';
import { api, ApiError } from '../../data/api';
import { usePlayerStore } from '../../store/player';
import { useAiEnabled } from '../../store/ai';
import { searchPlanSongs } from '../../../../shared/ai/resolvePicks';
import type { Track } from '../../data/types';

type State =
  { step: 'idle' } | { step: 'asking' } | { step: 'done'; summary?: string; songs: Track[] } | { step: 'failed' };

/**
 * "Ask AI" on the search screen: only when tapped (free AI quotas are small), it turns the query
 * into a few concrete searches and lists the songs they find. Keyed by the query, so a new one
 * starts over.
 */
export const AiSearchPicks = ({ query }: { query: string }) => {
  const enabled = useAiEnabled();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const [state, setState] = useState<State>({ step: 'idle' });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  if (!enabled || query.trim().length < 3) return null;

  const ask = async () => {
    controller.current?.abort();
    const mine = new AbortController();
    controller.current = mine;
    setState({ step: 'asking' });
    try {
      const plan = await api.aiSearchPlan(query.trim());
      const songs = await searchPlanSongs(plan.queries, api.songSearch, { signal: mine.signal });
      if (!mine.signal.aborted) setState({ step: 'done', summary: plan.summary, songs });
    } catch (err) {
      if (mine.signal.aborted) return;
      // AI_UNAVAILABLE hides the whole feature (useAiEnabled); anything else gets one line.
      setState(err instanceof ApiError && err.code === 'AI_UNAVAILABLE' ? { step: 'idle' } : { step: 'failed' });
    }
  };

  if (state.step === 'idle' || state.step === 'asking') {
    const asking = state.step === 'asking';
    return (
      <Pressable
        onPress={ask}
        disabled={asking}
        className="self-start max-w-full flex-row items-center gap-2 px-3.5 h-9 rounded-full border border-ln2 bg-s1"
        accessibilityRole="button"
        accessibilityState={{ busy: asking }}
        accessibilityLabel={asking ? 'Asking AI' : `Ask AI about ${query.trim()}`}
      >
        {asking ? (
          <ActivityIndicator size="small" color="#00E28A" />
        ) : (
          <Icon name="sparkles" size={14} color="#00E28A" />
        )}
        <Text className="text-t1 text-ll flex-shrink" numberOfLines={1}>
          {asking ? 'Asking AI…' : `Ask AI about “${query.trim()}”`}
        </Text>
      </Pressable>
    );
  }

  if (state.step === 'failed') {
    return <Text className="text-t3 text-bs">AI is busy right now. Try again later.</Text>;
  }

  return (
    <View className="bg-s1 border border-ln rounded-lg p-3.5 gap-2.5" accessibilityLabel="AI picks">
      <View className="gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Icon name="sparkles" size={12} color="#00E28A" />
          <Text className="text-ov font-semibold text-t3 uppercase">AI picks</Text>
        </View>
        {state.summary ? <Text className="text-t2 text-bs">{state.summary}</Text> : null}
      </View>
      {state.songs.length === 0 ? (
        <Text className="text-t3 text-bs">The AI's searches found no songs. Try saying it another way.</Text>
      ) : (
        <View className="-mx-2.5">
          {state.songs.map((track, index) => (
            <SongRow
              key={track.id}
              track={track}
              index={index}
              isActive={currentTrack?.id === track.id}
              onPress={() => playTrack(track, state.songs, { kind: 'Search', name: 'AI picks' })}
            />
          ))}
        </View>
      )}
    </View>
  );
};
