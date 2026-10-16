// "Create with AI" in both apps: the AI drafts a playlist (POST /me/ai/playlist), its songs are
// found with the app's own search, and only then is the playlist made. Each app passes in its
// own calls.

import type { AiPlaylistDraft, Playlist, Track } from "../apiTypes.js";
import { resolvePicks, type SongSearch } from "./resolvePicks.js";

export const AI_PLAYLIST_SIZES = [15, 25, 40] as const;
/** Fewer songs found than this and no playlist is made. */
export const MIN_PLAYLIST_SONGS = 3;

export type AiPlaylistResult =
  | { kind: "created"; playlist: Playlist; songs: number }
  /** Made, but adding its songs failed: it opens empty rather than being lost. */
  | { kind: "empty"; playlist: Playlist }
  | { kind: "too-few" };

export interface AiPlaylistDeps {
  draft: (body: { prompt: string; count: number }) => Promise<AiPlaylistDraft>;
  search: SongSearch;
  create: (draft: AiPlaylistDraft) => Promise<Playlist>;
  addTracks: (playlistId: string, tracks: Track[]) => Promise<unknown>;
}

/** Throws when the AI or the server fails, or `signal` aborts (an AbortError). */
export const createAiPlaylist = async (
  deps: AiPlaylistDeps,
  {
    prompt,
    count,
    signal,
    onProgress,
  }: {
    prompt: string;
    count: number;
    signal: AbortSignal;
    onProgress?: (searched: number, total: number) => void;
  },
): Promise<AiPlaylistResult> => {
  const stopIfCancelled = () => {
    if (signal.aborted) {
      const err = new Error("Cancelled");
      err.name = "AbortError";
      throw err;
    }
  };
  const draft = await deps.draft({ prompt, count });
  stopIfCancelled();

  let searched = 0;
  onProgress?.(0, draft.picks.length);
  const found = await resolvePicks(
    draft.picks,
    async (q) => {
      try {
        return await deps.search(q);
      } finally {
        onProgress?.(++searched, draft.picks.length);
      }
    },
    { limit: count, signal },
  );
  stopIfCancelled();
  if (found.length < MIN_PLAYLIST_SONGS) return { kind: "too-few" };

  const playlist = await deps.create(draft);
  try {
    await deps.addTracks(
      playlist.id,
      found.map((f) => f.track),
    );
  } catch {
    return { kind: "empty", playlist };
  }
  return { kind: "created", playlist, songs: found.length };
};
