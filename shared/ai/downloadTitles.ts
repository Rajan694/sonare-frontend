import type { AiTitleFixes } from '../apiTypes.js';
import {
  addTitleFixes,
  getTitleFix,
  hasTitleFix,
  looksMessy,
  type PendingTitle,
  type TitleFix,
} from '../catalog/titleFixes.js';

export interface ShortTitleCandidate {
  id: string;
  title: string;
  artist: string;
  uploader?: string;
  source?: string;
}

export interface ShortTitlesOptions {
  timeoutMs?: number;
}

export type PostAiTitles = (items: PendingTitle[]) => Promise<AiTitleFixes>;

const CHUNK_SIZE = 50;
const MAX_CONCURRENT_CHUNKS = 3;

const rawId = (id: string): string => (id.startsWith('yt:') ? id.slice(3) : id);

/** True when the candidate is a server song (YouTube video or marked server). */
export const isServerSong = (track: ShortTitleCandidate): boolean => {
  if (track.source === 'local' || track.id.startsWith('local:') || track.id.startsWith('sonare:')) {
    return false;
  }
  if (track.id.startsWith('yt:') || track.source === 'server') {
    return true;
  }
  return /^[\w-]{6,20}$/.test(track.id);
};

/**
 * Whether a song's title looks messy (`looksMessy`) or is longer than 40 characters
 * and has no known fix in the title-fix registry.
 */
export const shouldFixTitle = (track: ShortTitleCandidate): boolean => {
  if (!isServerSong(track)) return false;
  const rId = rawId(track.id);
  if (!rId || rId === 'unknown') return false;
  if (hasTitleFix(rId)) return false;
  const title = track.title ?? '';
  const uploader = track.uploader ?? track.artist;
  return looksMessy(title, uploader) || title.length > 40;
};

/**
 * Picks server songs whose title looks messy (`looksMessy`) or is longer than 40 characters
 * and has no known fix, sends them to `post(items)` (= POST /ai/titles with wait: true) in chunks
 * of 50 (at most 3 at once), adds the answers to the title-fix registry (`addTitleFixes`) and
 * resolves to Map<id, {title, artist}>.
 *
 * Resolves with what it has at the timeout (default 12000 ms) and never rejects.
 */
export async function shortTitlesFor<T extends ShortTitleCandidate>(
  tracks: T[],
  post: PostAiTitles,
  options: ShortTitlesOptions = {},
): Promise<Map<string, TitleFix>> {
  const { timeoutMs = 12000 } = options;
  const result = new Map<string, TitleFix>();

  // Collect already-known fixes or identify songs needing fixes
  const toAsk: PendingTitle[] = [];
  const seenIds = new Set<string>();

  for (const t of tracks) {
    if (!isServerSong(t)) continue;

    const rId = rawId(t.id);
    if (!rId || rId === 'unknown') continue;

    // Check if there is already a known fix
    const known = getTitleFix(rId);
    if (known) {
      const artist = known.artist || t.artist || '';
      const titleFix: TitleFix = { title: known.title, artist };
      result.set(t.id, titleFix);
      result.set(rId, titleFix);
      continue;
    }

    if (shouldFixTitle(t) && !seenIds.has(rId)) {
      seenIds.add(rId);
      toAsk.push({
        id: rId,
        title: t.title,
        artist: t.artist,
      });
    }
  }

  if (toAsk.length === 0) {
    return result;
  }

  // Split into chunks of 50
  const chunks: PendingTitle[][] = [];
  for (let i = 0; i < toAsk.length; i += CHUNK_SIZE) {
    chunks.push(toAsk.slice(i, i + CHUNK_SIZE));
  }

  // Run up to MAX_CONCURRENT_CHUNKS at once, bounded by timeoutMs, never rejecting
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      resolve();
    }, timeoutMs);
  });

  const workerPool = async () => {
    let nextIndex = 0;

    const runWorker = async () => {
      while (nextIndex < chunks.length && !timedOut) {
        const idx = nextIndex++;
        const chunk = chunks[idx];
        try {
          const res = await post(chunk);
          if (res?.fixes) {
            const normalizedFixes: Record<string, TitleFix> = {};
            for (const [k, fix] of Object.entries(res.fixes)) {
              if (fix && typeof fix.title === 'string' && fix.title.trim()) {
                const cleanId = rawId(k);
                const orig = chunk.find((item) => rawId(item.id) === cleanId);
                const artist =
                  typeof fix.artist === 'string' && fix.artist.trim() ? fix.artist.trim() : (orig?.artist ?? '');
                const titleFix: TitleFix = { title: fix.title.trim(), artist };
                normalizedFixes[cleanId] = titleFix;
                result.set(cleanId, titleFix);
                result.set(`yt:${cleanId}`, titleFix);
              }
            }
            addTitleFixes(normalizedFixes);
          }
        } catch {
          // Swallow chunk error: never reject
        }
      }
    };

    const workerCount = Math.min(chunks.length, MAX_CONCURRENT_CHUNKS);
    const workers = Array.from({ length: workerCount }, () => runWorker());
    await Promise.all(workers);
  };

  try {
    await Promise.race([workerPool(), timeoutPromise]);
  } catch {
    // Never reject
  } finally {
    if (timer) clearTimeout(timer);
  }

  return result;
}
