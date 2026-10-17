import React, { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/api';
import SongRow from '../music/SongRow';
import Icon from '../ui/Icon';
import { useAiEnabled } from './useAi';
import { searchPlanSongs } from '../../../../shared/ai/resolvePicks';
import type { Track } from '../../types';

type State =
  { step: 'idle' } | { step: 'asking' } | { step: 'done'; summary?: string; songs: Track[] } | { step: 'failed' };

interface AiSearchPicksProps {
  query: string;
  currentTrackId?: string;
  onPlay: (track: Track, queue: Track[]) => void;
}

/**
 * "Ask AI" on the search screen: only when asked (free AI quotas are small), it turns the query
 * into a few concrete searches and lists the songs they find. A new query starts over.
 */
export const AiSearchPicks = ({ query, currentTrackId, onPlay }: AiSearchPicksProps) => {
  const enabled = useAiEnabled();
  const [state, setState] = useState<State>({ step: 'idle' });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    setState({ step: 'idle' });
    return () => controller.current?.abort();
  }, [query]);

  if (!enabled || query.trim().length < 3) return null;

  const ask = async () => {
    controller.current?.abort();
    const mine = new AbortController();
    controller.current = mine;
    setState({ step: 'asking' });
    try {
      const plan = await api.aiSearchPlan(query.trim());
      const songs = await searchPlanSongs(plan.queries, (q) => api.songSearch(q), { signal: mine.signal });
      if (!mine.signal.aborted) setState({ step: 'done', summary: plan.summary, songs });
    } catch (err) {
      if (mine.signal.aborted) return;
      // AI_UNAVAILABLE hides the whole feature (useAiEnabled); anything else gets one line.
      setState(err instanceof ApiError && err.code === 'AI_UNAVAILABLE' ? { step: 'idle' } : { step: 'failed' });
    }
  };

  if (state.step === 'idle' || state.step === 'asking') {
    return (
      <button
        type="button"
        className="btn btn-sm btn-out self-start max-w-full"
        onClick={() => void ask()}
        disabled={state.step === 'asking'}
        aria-busy={state.step === 'asking'}
      >
        <Icon
          name={state.step === 'asking' ? 'sync' : 'sparkles'}
          size={14}
          className={state.step === 'asking' ? 'animate-spin' : 'text-acc'}
        />
        <span className="truncate">{state.step === 'asking' ? 'Asking AI…' : `Ask AI about “${query.trim()}”`}</span>
      </button>
    );
  }

  if (state.step === 'failed') {
    return <span className="text-body-s text-t3">AI is busy right now. Try again later.</span>;
  }

  return (
    <section className="surf flex flex-col gap-3 p-4 rounded-xl" aria-label="AI picks">
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-2 text-overline text-t3 uppercase font-semibold">
          <Icon name="sparkles" size={12} className="text-acc" />
          AI picks
        </span>
        {state.summary && <span className="text-body-s text-t2">{state.summary}</span>}
      </div>
      {state.songs.length === 0 ? (
        <span className="text-body-s text-t3">The AI's searches found no songs. Try saying it another way.</span>
      ) : (
        <div className="flex flex-col gap-0.5">
          {state.songs.map((track, i) => (
            <SongRow
              key={track.id}
              track={track}
              index={i + 1}
              isActive={currentTrackId === track.id}
              onClick={() => onPlay(track, state.songs)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
