// Snapshots the apps send with a favourite, follow, playlist add or play, so the backend can
// list items it never looked up itself (the apps found them in-app). The backend validates
// them again and drops what doesn't fit (sonare-backend src/services/catalogMeta.ts).
import type { Album, AlbumMeta, Artist, ArtistMeta, Playlist, Track, TrackMeta } from '../apiTypes.js';

/** Only YouTube items need one: the backend can't look anything else up anyway. */
const isYouTube = (id: string): boolean => !!id && !id.startsWith('local:') && !id.startsWith('sonare:');

/** A snapshot's ids are `yt:` ids or empty. */
const ytRef = (id: string | null | undefined): string => {
  if (!id) return '';
  if (id.startsWith('yt:')) return id;
  return /^[\w-]{1,64}$/.test(id) ? `yt:${id}` : '';
};

export const trackMeta = (
  t: Pick<Track, 'id' | 'title' | 'artist' | 'artistId' | 'album' | 'albumId' | 'durationMs' | 'thumbnail'>,
): TrackMeta | undefined => {
  if (!isYouTube(t.id) || !t.title) return undefined;
  const albumId = ytRef(t.albumId);
  return {
    title: t.title,
    artist: t.artist ?? '',
    artistId: ytRef(t.artistId),
    ...(t.album && { album: t.album }),
    ...(albumId && { albumId }),
    durationMs: t.durationMs ?? null,
    ...(t.thumbnail && { thumbnail: t.thumbnail }),
  };
};

export const albumMeta = (
  a: Pick<Album, 'id' | 'title' | 'artist' | 'artistId' | 'year' | 'trackCount' | 'thumbnail'>,
): AlbumMeta | undefined => {
  if (!isYouTube(a.id) || !a.title) return undefined;
  return {
    title: a.title,
    artist: a.artist ?? '',
    artistId: ytRef(a.artistId),
    year: a.year ?? null,
    trackCount: a.trackCount ?? null,
    ...(a.thumbnail && { thumbnail: a.thumbnail }),
  };
};

/** A YouTube playlist saved to the library is stored like an album. */
export const playlistMeta = (p: Pick<Playlist, 'id' | 'name' | 'trackCount' | 'thumbnail'>): AlbumMeta | undefined =>
  albumMeta({
    id: p.id,
    title: p.name,
    artist: '',
    artistId: '',
    year: null,
    trackCount: p.trackCount,
    thumbnail: p.thumbnail,
  });

export const artistMeta = (a: Pick<Artist, 'id' | 'name' | 'thumbnail' | 'monthlyListeners'>): ArtistMeta | undefined => {
  if (!isYouTube(a.id) || !a.name) return undefined;
  return {
    name: a.name,
    ...(a.thumbnail && { thumbnail: a.thumbnail }),
    monthlyListeners: a.monthlyListeners ?? null,
  };
};

/** `metas` for POST /me/playlists/:id/tracks, keyed by track id. */
export const trackMetas = (tracks: Parameters<typeof trackMeta>[0][]): Record<string, TrackMeta> =>
  Object.fromEntries(
    tracks.flatMap((t) => {
      const meta = trackMeta(t);
      return meta ? [[t.id, meta]] : [];
    }),
  );
