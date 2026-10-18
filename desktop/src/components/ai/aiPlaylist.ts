import { api } from '../../api/api';
import { notifyPlaylistsChanged } from '../../api/hooks';
import { createAiPlaylist as createShared, type AiPlaylistResult } from '../../../../shared/ai/aiPlaylist';

export { AI_PLAYLIST_SIZES, MIN_PLAYLIST_SONGS, type AiPlaylistResult } from '../../../../shared/ai/aiPlaylist';

/** shared/ai/aiPlaylist.ts with this app's calls; the playlists list refreshes after. */
export const createAiPlaylist = async (options: {
  prompt: string;
  count: number;
  signal: AbortSignal;
  onProgress?: (searched: number, total: number) => void;
}): Promise<AiPlaylistResult> => {
  const result = await createShared(
    {
      draft: (body) => api.aiPlaylistDraft(body),
      search: (q) => api.songSearch(q),
      create: (draft) => api.createPlaylist({ name: draft.name, description: draft.description, kind: 'synced' }),
      addTracks: (id, tracks) => api.addTracksToPlaylist(id, tracks),
    },
    options,
  );
  if (result.kind !== 'too-few') notifyPlaylistsChanged();
  return result;
};
