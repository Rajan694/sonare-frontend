import { useEffect, useState } from 'react';
import { ApiError, api } from './api';
import type { LyricsScript } from '../storage/devicePrefs';
import { useDevicePrefs } from '../storage/devicePrefs';
import type { Track } from '../types';

/**
 * One lyrics request per song for the session, shared by the Lyrics screen and the Lyrics
 * buttons (player bar, Now Playing). Whether a song's lyrics were found is remembered here so a
 * song with none shows a disabled button instead of opening an empty screen. Only an answer
 * counts: no lyrics (404) or the lyrics sites down mark a song unavailable; no network leaves it
 * unknown, and unknown keeps the button enabled.
 */

export type Lyrics = Awaited<ReturnType<typeof api.getLyrics>>;
export type LyricsAvailability = 'available' | 'unavailable';
type LyricsTrack = Pick<Track, 'id' | 'title' | 'artist' | 'durationMs'>;

const MAX_CACHED = 50;
const requests = new Map<string, Promise<Lyrics>>();
const status = new Map<string, LyricsAvailability>();
const listeners = new Set<() => void>();

const keyFor = (id: string, prefer: string, script: string) => `${id}|${prefer}|${script}`;

const mark = (id: string, value: LyricsAvailability) => {
  if (status.get(id) === value) return;
  status.set(id, value);
  for (const l of listeners) l();
};

/** Local files are unknown to the server; their lyrics come from the file. */
const isCatalog = (id: string) => !id.startsWith('local:');

/** The lyrics for a song, asked for once; a failed request is forgotten so Try again asks again. */
export const fetchLyrics = (
  track: LyricsTrack,
  prefer: 'synced' | 'plain' = 'synced',
  script: LyricsScript = 'original',
): Promise<Lyrics> => {
  const key = keyFor(track.id, prefer, script);
  const known = requests.get(key);
  if (known) return known;
  const request = api.getLyrics(track.id, prefer, script, track).then(
    (lyrics) => {
      mark(track.id, 'available');
      return lyrics;
    },
    (e: unknown) => {
      requests.delete(key);
      if (e instanceof ApiError) mark(track.id, 'unavailable');
      throw e;
    },
  );
  requests.set(key, request);
  // Oldest out first: a long session doesn't keep every song's lyrics.
  if (requests.size > MAX_CACHED) requests.delete(requests.keys().next().value!);
  return request;
};

/** Earlier / Later changed the song's offset: cached copies show the new one. */
export const patchCachedOffset = (trackId: string, offsetMs: number) => {
  for (const [key, request] of requests) {
    if (key.startsWith(`${trackId}|`))
      requests.set(
        key,
        request.then((l) => ({ ...l, offsetMs })),
      );
  }
};

export const lyricsAvailability = (trackId: string): LyricsAvailability | undefined => status.get(trackId);

/** Test hook: forget everything. */
export const resetLyricsCache = () => {
  requests.clear();
  status.clear();
};

/**
 * Whether the song's lyrics can be shown, asking for them once when the song arrives. Undefined
 * while unknown (and for local files, which are never asked about).
 */
export const useLyricsAvailability = (track: LyricsTrack | null | undefined): LyricsAvailability | undefined => {
  const { lyricsScript } = useDevicePrefs();
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  const trackId = track?.id;
  useEffect(() => {
    if (!track || !isCatalog(track.id) || status.has(track.id)) return;
    fetchLyrics(track, 'synced', lyricsScript).catch(() => {
      // Remembered above; the screen shows the reason if it is opened.
    });
    // The id and the script decide the request; a fresh object for the same song asks nothing new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, lyricsScript]);
  return trackId && isCatalog(trackId) ? status.get(trackId) : undefined;
};
