// Turns the AI's song suggestions (title + artist, AiPick) into playable tracks with the app's own
// song search: in-app YouTube first, the backend second, as for any search. The AI sometimes
// names songs that don't exist, so a pick is only kept when a search result really matches it.

import type { AiPick, Track } from "../apiTypes.js";

/** The app's song search: the first page of `type: 'songs'` results. */
export type SongSearch = (query: string) => Promise<Track[]>;

export interface ResolvedPick {
  pick: AiPick;
  track: Track;
}

export interface ResolveOptions {
  /** Searches in flight at once. */
  concurrency?: number;
  /** Track ids to leave out (songs the user already plays a lot, say). */
  exclude?: ReadonlySet<string>;
  /** Stop after this many matches. */
  limit?: number;
  /** Stop early (the screen went away). */
  signal?: AbortSignal;
}

const STOP_WORDS = new Set([
  "the",
  "feat",
  "ft",
  "official",
  "video",
  "audio",
  "lyrics",
]);

/** Accents off where the engine can (Hermes may lack String.normalize). */
const plain = (text: string): string => {
  try {
    return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    return text;
  }
};

// ASCII punctuation plus the quotes and dashes titles use; letters of any script stay.
const PUNCTUATION =
  /[\s!-/:-@[-`{-~\u2018\u2019\u201c\u201d\u2013\u2014\u2026\u00b7\u2022\uff5c]+/g;

const words = (text: string): string[] =>
  plain(text.toLowerCase())
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(PUNCTUATION, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

/** Share of `a`'s words found in `b`, 0..1. */
const overlap = (a: string, b: string): number => {
  const want = words(a);
  if (want.length === 0) return 0;
  const have = new Set(words(b));
  return want.filter((w) => have.has(w)).length / want.length;
};

/**
 * How well a search result matches a pick, 0..1: the title has to be there, and the artist
 * (searched in the artist field and the title, as uploads often credit singers in the title).
 */
export const matchScore = (pick: AiPick, track: Track): number => {
  const title = overlap(pick.title, track.title);
  if (title < 0.6) return 0;
  const artist = Math.max(
    overlap(pick.artist, track.artist),
    overlap(pick.artist, track.title),
  );
  return title * 0.6 + artist * 0.4;
};

/** Best matching result for one pick, or null. */
export const bestMatch = (
  pick: AiPick,
  results: readonly Track[],
): Track | null => {
  let best: Track | null = null;
  let bestScore = 0.6;
  for (const track of results.slice(0, 8)) {
    if (track.source !== "server") continue;
    const score = matchScore(pick, track);
    if (score > bestScore) {
      best = track;
      bestScore = score;
    }
  }
  return best;
};

/**
 * Looks each pick up and keeps the ones found, in the AI's order, each song once. A failed
 * search just loses that pick.
 */
export const resolvePicks = async (
  picks: readonly AiPick[],
  search: SongSearch,
  { concurrency = 3, exclude, limit = Infinity, signal }: ResolveOptions = {},
): Promise<ResolvedPick[]> => {
  const found: (ResolvedPick | null)[] = new Array(picks.length).fill(null);
  let next = 0;
  let matched = 0;

  const worker = async () => {
    while (next < picks.length && matched < limit && !signal?.aborted) {
      const i = next++;
      const pick = picks[i];
      try {
        const track = bestMatch(
          pick,
          await search(`${pick.title} ${pick.artist}`),
        );
        if (track && !exclude?.has(track.id)) {
          found[i] = { pick, track };
          matched += 1;
        }
      } catch {
        // Search failed for this one: skip it.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  const seen = new Set<string>();
  const out: ResolvedPick[] = [];
  for (const entry of found) {
    if (!entry || seen.has(entry.track.id)) continue;
    seen.add(entry.track.id);
    out.push(entry);
    if (out.length >= limit) break;
  }
  return out;
};

/**
 * For an AI search plan (GET /ai/search): runs its queries two at a time and merges the first
 * `perQuery` songs of each, each song once (by id, and by title and artist), in the plan's order.
 * A failed search adds nothing.
 */
export const searchPlanSongs = async (
  queries: readonly string[],
  search: SongSearch,
  { perQuery = 3, signal }: { perQuery?: number; signal?: AbortSignal } = {},
): Promise<Track[]> => {
  const results: Track[][] = queries.map(() => []);
  let next = 0;
  const worker = async () => {
    while (next < queries.length && !signal?.aborted) {
      const i = next++;
      results[i] = await search(queries[i]).catch(() => []);
    }
  };
  await Promise.all([worker(), worker()]);
  // The same song is often up more than once (an upload and its "Topic" copy): one each.
  const seen = new Set<string>();
  const merged: Track[] = [];
  for (const track of results.flatMap((songs) => songs.slice(0, perQuery))) {
    const song = `${words(track.title).join(" ")}|${words(track.artist).join(" ")}`;
    if (seen.has(track.id) || seen.has(song)) continue;
    seen.add(track.id);
    seen.add(song);
    merged.push(track);
  }
  return merged;
};
