import React, { useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '../ui/Text';
import Icon from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/Segmented';
import { api, ApiError } from '../../data/api';
import { useLibraryStore } from '../../store/library';
import { AI_PLAYLIST_SIZES, createAiPlaylist } from '../../../../shared/ai/aiPlaylist';

type Step = { at: 'form'; error?: string } | { at: 'asking' } | { at: 'finding'; searched: number; total: number };

const BUSY = 'AI is busy right now. Try again later.';

/** The shared flow (shared/ai/aiPlaylist.ts) with this app's calls. */
const makeAiPlaylist = (options: Parameters<typeof createAiPlaylist>[1]) =>
  createAiPlaylist(
    {
      draft: api.aiPlaylistDraft,
      search: api.songSearch,
      create: async (draft) => {
        const playlist = await useLibraryStore.getState().createPlaylist(draft.name);
        if (draft.description)
          await api.updatePlaylist(playlist.id, { description: draft.description }).catch(() => {});
        return playlist;
      },
      addTracks: api.addToPlaylist,
    },
    options,
  );

/** "Create with AI" on the Playlists screen: describe a playlist, the AI picks the songs. */
export const AiPlaylistSheet = ({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  /** The new playlist, and whether its songs went in. */
  onCreated: (playlistId: string, songs: number | null) => void;
}) => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<number>(25);
  const [step, setStep] = useState<Step>({ at: 'form' });
  const controller = useRef<AbortController | null>(null);

  const text = prompt.trim();
  const busy = step.at !== 'form';

  const close = () => {
    controller.current?.abort();
    controller.current = null;
    setStep({ at: 'form' });
    onClose();
  };

  const create = async () => {
    if (text.length < 3 || busy) return;
    const mine = new AbortController();
    controller.current = mine;
    setStep({ at: 'asking' });
    try {
      const result = await makeAiPlaylist({
        prompt: text,
        count: size,
        signal: mine.signal,
        onProgress: (searched, total) => {
          if (!mine.signal.aborted) setStep({ at: 'finding', searched, total });
        },
      });
      if (mine.signal.aborted) return;
      if (result.kind === 'too-few') {
        setStep({ at: 'form', error: "Couldn't find enough of those songs. Try describing it differently." });
        return;
      }
      useLibraryStore
        .getState()
        .reloadPlaylists()
        .catch(() => {});
      setPrompt('');
      close();
      onCreated(result.playlist.id, result.kind === 'created' ? result.songs : null);
    } catch (err) {
      if (mine.signal.aborted) return;
      const message = err instanceof ApiError && err.code !== 'AI_UNAVAILABLE' && err.status < 500 ? err.message : BUSY;
      setStep({ at: 'form', error: message });
    }
  };

  return (
    <Sheet visible={visible} onClose={close}>
      <View className="px-6 pb-6 gap-4">
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <Icon name="sparkles" size={18} color="#00E28A" />
            <Text className="text-t1 text-h2 font-medium">Create with AI</Text>
          </View>
          <Text className="text-t2 text-bs">Describe a mood, an occasion or a sound, and the AI picks the songs.</Text>
        </View>
        <Field
          placeholder="e.g. Rainy evening, Hindi acoustic"
          value={prompt}
          onChangeText={setPrompt}
          maxLength={300}
          editable={!busy}
          autoFocus
          onSubmitEditing={create}
          returnKeyType="done"
          accessibilityLabel="Describe the playlist"
        />
        <View className="gap-2">
          <Text className="text-t2 text-ll">Songs</Text>
          <SegmentedControl
            options={AI_PLAYLIST_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
            value={String(size)}
            onChange={(v) => !busy && setSize(Number(v))}
          />
        </View>

        {step.at === 'form' && step.error ? (
          <Text className="text-red text-bs" accessibilityLiveRegion="polite">
            {step.error}
          </Text>
        ) : null}
        {busy ? (
          <View className="flex-row items-center gap-2" accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color="#00E28A" />
            <Text className="text-t2 text-bs">
              {step.at === 'finding' ? `Finding songs… ${step.searched} of ${step.total}` : 'Asking AI…'}
            </Text>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <Button variant="outline" onPress={close} className="flex-1">
            Cancel
          </Button>
          <Button variant="accent" onPress={create} disabled={busy || text.length < 3} className="flex-1">
            Create
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
