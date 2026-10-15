import { apiBase } from './config';
import { useAuthStore } from './auth';
import { httpRequest } from './http';
import { isInAppYoutubeEnabled } from '../youtube/appConfig';
import { getInAppCatalog, type InAppCatalog } from '../youtube/inApp';
import { useLibraryStore } from '../store/library';
import { artistMeta, trackMeta, trackMetas } from '../../../shared/catalog/meta';
import type {
  Album,
  AlbumMeta,
  AppRelease,
  Artist,
  Lyrics,
  Page,
  Playlist,
  SearchItem,
  StreamInfo,
  Track,
  TrackMeta,
  User,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Params;
  body?: unknown;
  timeoutMs?: number;
}

const buildUrl = (path: string, params?: Params): string => {
  const query = Object.entries(params ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${apiBase()}${path}${query ? `?${query}` : ''}`;
};

const request = async <T>(
  path: string,
  { method = 'GET', params, body, timeoutMs }: RequestOptions = {},
): Promise<T> => {
  const url = buildUrl(path, params);
  const send = (token: string | null) =>
    httpRequest(url, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      timeoutMs,
    });

  let res = await send(useAuthStore.getState().accessToken);

  // Access tokens are short-lived: refresh once and retry.
  if (res.status === 401) {
    const fresh = await useAuthStore.getState().refresh();
    if (fresh) res = await send(fresh);
  }

  if (res.status === 204) return {} as T;
  const { json } = res;
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(json?.error?.message || `Request failed (${res.status})`, res.status, json?.error?.code);
  }
  return json as T;
};

const enc = encodeURIComponent;

/** Only YouTube items can come from the in-app catalog. */
export const isYouTubeId = (id: string): boolean => !id.startsWith('local:') && !id.startsWith('sonare:');

const ytId = (id: string): string => (id.startsWith('yt:') ? id : `yt:${id}`);

const lastFallbackWarning = new Map<string, number>();

/**
 * Ask the in-app catalog first (when the admin allows it) and fall back to the backend on any
 * error, saying so at most once a minute per method.
 */
const localFirst = async <T>(
  method: string,
  local: (c: InAppCatalog) => Promise<T>,
  remote: () => Promise<T>,
  id?: string,
): Promise<T> => {
  if (isInAppYoutubeEnabled() && (id === undefined || isYouTubeId(id))) {
    try {
      return await local(await getInAppCatalog());
    } catch (err) {
      const now = Date.now();
      if (now - (lastFallbackWarning.get(method) ?? 0) > 60_000) {
        lastFallbackWarning.set(method, now);
        console.warn(`[in-app-yt] ${method} fell back to the backend:`, err instanceof Error ? err.message : err);
      }
    }
  }
  return remote();
};

/** Paged lists: an `L.` cursor came from the in-app catalog and only works there; others only on the backend. */
const paged = <T>(
  method: string,
  cursor: string | undefined,
  local: (c: InAppCatalog, cursor?: string) => Promise<T>,
  remote: (cursor?: string) => Promise<T>,
  id?: string,
): Promise<T> => {
  if (cursor?.startsWith('L.')) return getInAppCatalog().then((c) => local(c, cursor));
  if (cursor) return remote(cursor);
  return localFirst(
    method,
    (c) => local(c),
    () => remote(),
    id,
  );
};

export const resetFallbackLogThrottleForTesting = () => lastFallbackWarning.clear();

export const api = {
  // Catalog: YouTube from the phone first (see youtube/inApp.ts), the backend otherwise.
  search: (q: string, type: 'all' | 'songs' | 'albums' | 'artists' | 'playlists' = 'all', cursor?: string) =>
    paged<Page<SearchItem>>(
      'search',
      cursor,
      (c, cur) => c.search(q, type, cur) as Promise<Page<SearchItem>>,
      (cur) => request('/search', { params: { q, type, cursor: cur } }),
    ),
  /** Autocomplete for the search field. */
  suggestions: (q: string) =>
    localFirst<string[]>(
      'suggestions',
      (c) => c.suggestions(q),
      () => request('/search/suggestions', { params: { q } }),
    ),
  trending: (limit = 20) =>
    localFirst<Page<Track>>(
      'trending',
      (c) => c.trending('IN', limit),
      () => request('/trending', { params: { region: 'IN', limit } }),
    ),
  album: (id: string) =>
    localFirst<Album>(
      'album',
      (c) => c.album(ytId(id)),
      () => request(`/albums/${enc(id)}`),
      id,
    ),
  albumTracks: (id: string, cursor?: string) =>
    paged<Page<Track>>(
      'albumTracks',
      cursor,
      (c, cur) => c.albumTracks(ytId(id), cur),
      (cur) => request(`/albums/${enc(id)}/tracks`, { params: { cursor: cur } }),
      id,
    ),
  artist: (id: string) =>
    localFirst<Artist>(
      'artist',
      // Only the backend knows who you follow; the library store keeps that list.
      async (c) => ({ ...(await c.artist(ytId(id))), following: useLibraryStore.getState().isArtistFollowed(id) }),
      () => request(`/artists/${enc(id)}`),
      id,
    ),
  artistTopTracks: (id: string, limit = 20) =>
    localFirst<Page<Track>>(
      'artistTopTracks',
      (c) => c.artistTopTracks(ytId(id), limit),
      () => request(`/artists/${enc(id)}/top-tracks`, { params: { limit } }),
      id,
    ),
  artistAlbums: (id: string, cursor?: string) =>
    paged<Page<Album>>(
      'artistAlbums',
      cursor,
      (c, cur) => c.artistAlbums(ytId(id), cur),
      (cur) => request(`/artists/${enc(id)}/albums`, { params: { cursor: cur } }),
      id,
    ),
  /** Songs like this one, played when the queue runs out (backend only). */
  relatedTracks: (id: string, limit = 20) =>
    request<Page<Track>>(`/tracks/${enc(id)}/related`, { params: { limit } }).then((page) => page.items),

  /** YouTube playlists; the user's own ones go through the `my*` calls below. */
  playlist: (id: string) =>
    localFirst<Playlist>(
      'playlist',
      (c) => c.playlist(ytId(id)),
      () => request(`/playlists/${enc(id)}`),
      id,
    ),
  playlistTracks: (id: string, cursor?: string) =>
    paged<Page<Track>>(
      'playlistTracks',
      cursor,
      (c, cur) => c.playlistTracks(ytId(id), cur),
      (cur) => request(`/playlists/${enc(id)}/tracks`, { params: { cursor: cur } }),
      id,
    ),

  // Playback
  /** In-app, a direct googlevideo url (it can 403 later; see refreshInAppSession); else the backend's relay. */
  stream: (id: string, quality: 'auto' | 'low' | 'normal' | 'high' = 'auto', format?: 'opus' | 'm4a') =>
    localFirst<StreamInfo>(
      'stream',
      (c) => c.stream(ytId(id), { quality, format }),
      () => request(`/tracks/${enc(id)}/stream`, { params: { quality, format } }),
      id,
    ),
  /** `placeholder`: nobody has uploaded this song's waveform yet; these bars are made up. */
  peaks: (id: string, bars: number) =>
    request<{ peaks: number[]; placeholder?: boolean }>(`/tracks/${enc(id)}/peaks`, {
      params: { bars },
    }),
  /** The waveform heard on this phone (150 bars, 0..1); the first upload for a song wins. */
  putPeaks: (id: string, peaks: number[]) =>
    request<{ stored: boolean }>(`/tracks/${enc(id)}/peaks`, { method: 'PUT', body: { peaks } }),
  /**
   * `script` other than 'original' asks for the version in that script when LRCLIB has one.
   * `track` names the song for the lookup when the backend has never seen it (found in-app).
   */
  lyrics: (id: string, script: string = 'original', track?: Pick<Track, 'title' | 'artist' | 'durationMs'>) =>
    request<Lyrics>(`/tracks/${enc(id)}/lyrics`, {
      params: {
        prefer: 'synced',
        ...(script !== 'original' && { script }),
        ...(track?.title && track.artist && { title: track.title, artist: track.artist }),
        ...(track?.durationMs && { durationMs: track.durationMs }),
      },
    }),
  /** Shifts the account's lyric timing for a song; positive shows each line later. */
  updateLyricsOffset: (id: string, offsetMs: number) =>
    request<{ ok: boolean }>(`/tracks/${enc(id)}/lyrics/offset`, { method: 'PATCH', body: { offsetMs } }),
  /** App builds uploaded on the admin page: the newest of each platform and format. */
  releases: () => request<{ items: AppRelease[] }>('/releases'),
  releaseDownloadUrl: (id: string) => `${apiBase()}/releases/${enc(id)}/download`,
  /** Browse categories; `query` is what opening one searches for. */
  genres: () => request<{ id: string; name: string; query?: string }[]>('/genres'),
  /** Followed artists, then the artists of liked and playlisted songs. */
  libraryArtists: () => request<Page<Artist>>('/me/library/artists'),
  playerState: () =>
    request<{
      trackRef: { kind: 'server'; id: string } | { kind: 'local'; fingerprint: string } | null;
      positionMs: number;
      queue: unknown[];
      index: number;
      shuffle: boolean;
      repeat: 'off' | 'all' | 'one';
      updatedAt?: number;
    }>('/me/player-state'),
  savePlayerState: (body: {
    trackRef: { kind: 'server'; id: string } | null;
    positionMs: number;
    queue: unknown[];
    index: number;
    shuffle: boolean;
    repeat: 'off' | 'all' | 'one';
  }) => request<{ ok: boolean }>('/me/player-state', { method: 'PUT', body }),

  // The signed-in user
  me: () => request<User>('/me'),
  settings: () => request<Record<string, unknown>>('/me/settings'),
  saveSettings: (body: Record<string, unknown>) => request<{ ok: boolean }>('/me/settings', { method: 'PUT', body }),
  libraryTracks: (sort: 'addedAt' | 'playCount' | 'title' = 'addedAt') =>
    request<Page<Track>>('/me/library/tracks', {
      params: { sort, order: sort === 'title' ? 'asc' : 'desc' },
    }),
  favourites: () => request<Page<Track>>('/me/favourites/tracks'),
  /** Just the ids, for the apps' heart state: no metadata lookups. */
  favouriteIds: () => request<{ ids: string[] }>('/me/favourites/ids'),
  // Saving one sends what the app knows about it (`meta`): the backend may never have seen
  // an item found in-app.
  setFavourite: (trackId: string, favourite: boolean, track?: Track) =>
    request<{ ok: boolean }>(`/me/favourites/tracks/${enc(trackId)}`, {
      method: favourite ? 'PUT' : 'DELETE',
      ...(favourite && track && { body: { meta: trackMeta(track) } }),
    }),
  /** Albums the user has saved (hearted). */
  libraryAlbums: () => request<Page<Album>>('/me/library/albums'),
  setAlbumFavourite: (albumId: string, favourite: boolean, meta?: AlbumMeta) =>
    request<{ ok: boolean }>(`/me/favourites/albums/${enc(albumId)}`, {
      method: favourite ? 'PUT' : 'DELETE',
      ...(favourite && meta && { body: { meta } }),
    }),
  setFollowing: async (artistId: string, following: boolean, artist?: Artist) => {
    useLibraryStore.getState().setArtistFollowed(artistId, following);
    try {
      return await request<{ ok: boolean }>(`/me/following/artists/${enc(artistId)}`, {
        method: following ? 'PUT' : 'DELETE',
        ...(following && artist && { body: { meta: artistMeta(artist) } }),
      });
    } catch (e) {
      useLibraryStore.getState().setArtistFollowed(artistId, !following);
      throw e;
    }
  },
  recentlyPlayed: (limit = 20) => request<Page<Track>>('/me/recently-played', { params: { limit } }),
  mostPlayed: (limit = 20) => request<Page<Track>>('/me/most-played', { params: { limit } }),
  /** Plays the listener has actually heard; queued and sent by data/sync.ts. */
  reportPlays: (
    plays: {
      trackRef: { kind: 'server'; id: string } | { kind: 'local'; fingerprint: string };
      at: number;
      ms: number;
      meta?: TrackMeta;
    }[],
  ) =>
    request<{ ok: boolean }>('/me/sync', {
      method: 'POST',
      body: {
        // The song details matter: the backend may never have seen a song found in-app.
        plays: plays.map(({ trackRef, at, ms, meta }) => ({ trackRef, at, ms, meta })),
      },
      // A hung upload would hold the whole queue; time out and let sync.ts retry.
      timeoutMs: 15_000,
    }),

  // The user's playlists
  myPlaylists: () => request<Page<Playlist>>('/me/playlists'),
  myPlaylist: (id: string) => request<Playlist>(`/me/playlists/${enc(id)}`),
  myPlaylistTracks: (id: string) => request<Page<Track>>(`/me/playlists/${enc(id)}/tracks`),
  createPlaylist: (name: string) =>
    request<Playlist>('/me/playlists', {
      method: 'POST',
      body: { name, kind: 'synced' },
    }),
  deletePlaylist: (id: string) => request<{ ok: boolean }>(`/me/playlists/${enc(id)}`, { method: 'DELETE' }),
  /** Renames and/or re-describes an own playlist; an empty description clears it. */
  updatePlaylist: (id: string, body: { name?: string; description?: string }) =>
    request<Playlist>(`/me/playlists/${enc(id)}`, { method: 'PATCH', body }),
  addToPlaylist: (id: string, tracks: Track[]) =>
    request<{ ok: boolean }>(`/me/playlists/${enc(id)}/tracks`, {
      method: 'POST',
      body: { trackIds: tracks.map((t) => t.id), metas: trackMetas(tracks) },
    }),
  /**
   * Removes one playlist row: by its row id when the list knows it (the same song can be in
   * the playlist twice), by its position otherwise.
   */
  removeFromPlaylist: (id: string, entry: { entryId?: string; index: number }) =>
    request<{ ok: boolean }>(`/me/playlists/${enc(id)}/tracks`, {
      method: 'DELETE',
      body: entry.entryId ? { entryIds: [entry.entryId] } : { index: entry.index },
    }),
  /** Moves one playlist row (`entryId`) to position `to` (0-based, in the full list). */
  reorderPlaylist: (id: string, body: { entryId: string; to: number }) =>
    request<{ ok: boolean }>(`/me/playlists/${enc(id)}/tracks/order`, { method: 'PATCH', body }),
};

/** The user's own playlists live under /me; everything else is a YouTube playlist. */
export const isOwnPlaylist = (id: string) => id.startsWith('sonare:');
