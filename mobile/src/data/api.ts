import { API_BASE } from './config';
import { useAuthStore } from './auth';
import { httpRequest } from './http';
import type { Album, Artist, Lyrics, Page, Playlist, SearchItem, StreamInfo, Track, User } from './types';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
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

function buildUrl(path: string, params?: Params): string {
  const query = Object.entries(params ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${API_BASE}${path}${query ? `?${query}` : ''}`;
}

async function request<T>(path: string, { method = 'GET', params, body, timeoutMs }: RequestOptions = {}): Promise<T> {
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
}

const enc = encodeURIComponent;

export const api = {
  // Catalog
  search: (q: string, type: 'all' | 'songs' | 'albums' | 'artists' | 'playlists' = 'all') =>
    request<Page<SearchItem>>('/search', { params: { q, type } }),
  trending: (limit = 20) => request<Page<Track>>('/trending', { params: { region: 'IN', limit } }),
  album: (id: string) => request<Album>(`/albums/${enc(id)}`),
  albumTracks: (id: string) => request<Page<Track>>(`/albums/${enc(id)}/tracks`),
  artist: (id: string) => request<Artist>(`/artists/${enc(id)}`),
  artistTopTracks: (id: string, limit = 20) => request<Page<Track>>(`/artists/${enc(id)}/top-tracks`, { params: { limit } }),
  artistAlbums: (id: string) => request<Page<Album>>(`/artists/${enc(id)}/albums`),
  /** YouTube playlists; the user's own ones go through the `my*` calls below. */
  playlist: (id: string) => request<Playlist>(`/playlists/${enc(id)}`),
  playlistTracks: (id: string) => request<Page<Track>>(`/playlists/${enc(id)}/tracks`),

  // Playback
  stream: (id: string, quality: 'auto' | 'low' | 'high' = 'auto') =>
    request<StreamInfo>(`/tracks/${enc(id)}/stream`, { params: { quality } }),
  peaks: (id: string, bars: number) => request<{ peaks: number[] }>(`/tracks/${enc(id)}/peaks`, { params: { bars } }),
  lyrics: (id: string) => request<Lyrics>(`/tracks/${enc(id)}/lyrics`, { params: { prefer: 'synced' } }),

  // The signed-in user
  me: () => request<User>('/me'),
  libraryTracks: (sort: 'addedAt' | 'playCount' | 'title' = 'addedAt') =>
    request<Page<Track>>('/me/library/tracks', { params: { sort, order: sort === 'title' ? 'asc' : 'desc' } }),
  favourites: () => request<Page<Track>>('/me/favourites/tracks'),
  setFavourite: (trackId: string, favourite: boolean) =>
    request<{ ok: boolean }>(`/me/favourites/tracks/${enc(trackId)}`, { method: favourite ? 'PUT' : 'DELETE' }),
  setFollowing: (artistId: string, following: boolean) =>
    request<{ ok: boolean }>(`/me/following/artists/${enc(artistId)}`, { method: following ? 'PUT' : 'DELETE' }),
  recentlyPlayed: (limit = 20) => request<Page<Track>>('/me/recently-played', { params: { limit } }),
  mostPlayed: (limit = 20) => request<Page<Track>>('/me/most-played', { params: { limit } }),
  /** Plays the listener has actually heard; queued and sent by data/sync.ts. */
  reportPlays: (plays: { trackRef: { kind: 'server'; id: string } | { kind: 'local'; fingerprint: string }; at: number; ms: number }[]) =>
    request<{ ok: boolean }>('/me/sync', {
      method: 'POST',
      body: { plays: plays.map(({ trackRef, at, ms }) => ({ trackRef, at, ms })) },
      // A hung upload would hold the whole queue; time out and let sync.ts retry.
      timeoutMs: 15_000,
    }),

  // The user's playlists
  myPlaylists: () => request<Page<Playlist>>('/me/playlists'),
  myPlaylist: (id: string) => request<Playlist>(`/me/playlists/${enc(id)}`),
  myPlaylistTracks: (id: string) => request<Page<Track>>(`/me/playlists/${enc(id)}/tracks`),
  createPlaylist: (name: string) => request<Playlist>('/me/playlists', { method: 'POST', body: { name, kind: 'synced' } }),
  deletePlaylist: (id: string) => request<{ ok: boolean }>(`/me/playlists/${enc(id)}`, { method: 'DELETE' }),
  addToPlaylist: (id: string, trackIds: string[]) =>
    request<{ ok: boolean }>(`/me/playlists/${enc(id)}/tracks`, { method: 'POST', body: { trackIds } }),
  removeFromPlaylist: (id: string, index: number) =>
    request<{ ok: boolean }>(`/me/playlists/${enc(id)}/tracks`, { method: 'DELETE', body: { index } }),
};

/** The user's own playlists live under /me; everything else is a YouTube playlist. */
export const isOwnPlaylist = (id: string) => id.startsWith('sonare:');
