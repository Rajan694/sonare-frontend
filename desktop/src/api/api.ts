import { serverFetch } from './serverFetch';
import { API_BASE, getAccessToken, onAuthChange, refreshAccessToken } from './auth';
import { CLIENT } from '../lib/caps';
import type {
  Track,
  Album,
  Artist,
  Playlist,
  SavedPlaylist,
  Page,
  User,
  AppRelease,
  StreamInfo,
  RemovedCount,
} from '../types';
import type { AiPlaylistDraft, AiSearchPlan, AiTitleFixes, AiYouMayLike } from '../../../shared/apiTypes';
import type { PendingTitle } from '../../../shared/catalog/titleFixes';
import type { LyricsScript } from '../storage/devicePrefs';
import { inAppYoutube, isInAppYoutubeAllowed, loadCachedConfig, setAppConfig, type AppConfig } from '../youtube/inApp';
import { trackThumbUrl } from '../../../shared/catalog/images';
import { albumMeta, artistMeta, playlistMeta, trackMeta, trackMetas } from '../../../shared/catalog/meta';
import { ApiError, apiErrorFrom, createCatalogFallback, isYouTubeId, ytId } from '../../../shared/api/client';

type Catalog = Awaited<ReturnType<typeof inAppYoutube.getCatalog>>;

// ---- In-app YouTube (desktop window only; see src/youtube/inApp.ts) ----

// Asks the in-app catalog first in the desktop window (shared/api/client.ts).
const { localFirst, paged } = createCatalogFallback<Catalog>({
  allowed: isInAppYoutubeAllowed,
  catalog: () => inAppYoutube.getCatalog(),
});

export { isYouTubeId };

// The backend tells an artist page whether you follow the artist; the in-app catalog can't, so
// remember follows from the library and from follow/unfollow, loading the library once if needed.
const followedArtists = new Map<string, boolean>();
let followsPrimed: Promise<void> | null = null;

const rememberFollow = (id: string, following: boolean) => followedArtists.set(ytId(id), following);

onAuthChange(() => {
  followedArtists.clear();
  followsPrimed = null;
});

const isFollowed = async (id: string): Promise<boolean> => {
  if (getAccessToken()) {
    followsPrimed ??= api
      .getLibraryArtists()
      .then(() => undefined)
      .catch(() => {
        followsPrimed = null;
      });
    await followsPrimed;
  }
  return followedArtists.get(ytId(id)) ?? false;
};

export { ApiError };

/** What to tell someone when a section's data did not load. */
export const loadErrorMessage = (err: unknown): string => {
  if (err instanceof ApiError && err.code === 'UPSTREAM_UNAVAILABLE') {
    return "Sonare's music service isn't responding. Try again in a moment.";
  }
  // fetch rejects with a TypeError when the request never reached the server.
  if (err instanceof TypeError) return "Can't reach the Sonare server.";
  return err instanceof Error ? err.message : 'Something went wrong.';
};

// An AI request found no provider answering (503 AI_UNAVAILABLE): main.tsx hides the AI
// features until the next /app-config says otherwise.
let aiUnavailableListener: (() => void) | null = null;
export const onAiUnavailable = (listener: () => void): void => {
  aiUnavailableListener = listener;
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { params, skipAuth, ...init } = options;

  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers = new Headers(init.headers);
  headers.set('X-Sonare-Client', CLIENT);
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let res = await serverFetch(url.toString(), {
    ...init,
    headers,
  });

  // Handle 401 with one-time token refresh and retry
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await serverFetch(url.toString(), {
        ...init,
        headers,
      });
    }
  }

  if (res.status === 204) {
    return {} as T;
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new ApiError(`HTTP error ${res.status}`, res.status);
    }
    return {} as T;
  }

  if (!res.ok) {
    const err = apiErrorFrom(res.status, data);
    if (err.code === 'AI_UNAVAILABLE') aiUnavailableListener?.();
    throw err;
  }

  return data as T;
};

export const api = {
  // App builds for Settings → About
  getReleases() {
    return request<{ items: AppRelease[] }>('/releases', { skipAuth: true });
  },

  releaseDownloadUrl(id: string): string {
    return `${API_BASE}/releases/${encodeURIComponent(id)}/download`;
  },

  getAppConfig() {
    // Revalidate: an admin change should apply on the next sync, not after the 60 s cache.
    return request<AppConfig>('/app-config', { skipAuth: true, cache: 'no-cache' });
  },

  /**
   * Fetch the admin's settings for the apps: in-app YouTube (applied in the desktop window only;
   * the cached copy stays on failure) and whether AI is on. Null when it couldn't be fetched.
   */
  async syncAppConfig(): Promise<AppConfig | null> {
    await loadCachedConfig();
    try {
      const config = await this.getAppConfig();
      if (window.NL_MODE === 'window') await setAppConfig(config);
      return config;
    } catch {
      // Offline, or an older backend without /app-config: keep what we have.
      return null;
    }
  },

  // Catalog
  search(q: string, type: 'songs' | 'albums' | 'artists' | 'playlists' | 'all' = 'all', cursor?: string) {
    return paged<Page<Track | Album | Artist | Playlist>>(
      'search',
      cursor,
      (c, cur) => c.search(q, type, cur) as Promise<Page<Track | Album | Artist | Playlist>>,
      (cur) => request('/search', { params: { q, type, cursor: cur } }),
    );
  },

  /** Autocomplete for the search field. */
  searchSuggestions(q: string) {
    return localFirst<string[]>(
      'suggestions',
      (c) => c.suggestions(q),
      () => request('/search/suggestions', { params: { q } }),
    );
  },

  /** Songs like this one, played when the queue runs out (backend only). */
  async getRelatedTracks(id: string, limit: number = 20) {
    const res = await request<Page<Track>>(`/tracks/${encodeURIComponent(id)}/related`, { params: { limit } });
    return res.items;
  },

  getTrending(region: string = 'IN', limit: number = 50) {
    return localFirst<Page<Track>>(
      'trending',
      (c) => c.trending(region, limit),
      () => request('/trending', { params: { region, limit } }),
    );
  },

  getGenres() {
    return request<{ id: string; name: string; query?: string }[]>('/genres');
  },

  getTrack(id: string) {
    return localFirst<Track>(
      'track',
      (c) => c.track(ytId(id)),
      () => request(`/tracks/${encodeURIComponent(id)}`),
      id,
    );
  },

  getAlbum(id: string) {
    return localFirst<Album>(
      'album',
      (c) => c.album(ytId(id)),
      () => request(`/albums/${encodeURIComponent(id)}`),
      id,
    );
  },

  getAlbumTracks(id: string, cursor?: string) {
    return paged<Page<Track>>(
      'albumTracks',
      cursor,
      (c, cur) => c.albumTracks(ytId(id), cur),
      (cur) => request(`/albums/${encodeURIComponent(id)}/tracks`, { params: { cursor: cur } }),
      id,
    );
  },

  getArtist(id: string) {
    return localFirst<Artist>(
      'artist',
      async (c) => ({ ...(await c.artist(ytId(id))), following: await isFollowed(id) }),
      () => request(`/artists/${encodeURIComponent(id)}`),
      id,
    );
  },

  getArtistTopTracks(id: string, limit: number = 20) {
    return localFirst<Page<Track>>(
      'artistTopTracks',
      (c) => c.artistTopTracks(ytId(id), limit),
      () => request(`/artists/${encodeURIComponent(id)}/top-tracks`, { params: { limit } }),
      id,
    );
  },

  getArtistAlbums(id: string, cursor?: string) {
    return paged<Page<Album>>(
      'artistAlbums',
      cursor,
      (c, cur) => c.artistAlbums(ytId(id), cur),
      (cur) => request(`/artists/${encodeURIComponent(id)}/albums`, { params: { cursor: cur } }),
      id,
    );
  },

  getPlaylist(id: string) {
    return localFirst<Playlist>(
      'playlist',
      (c) => c.playlist(ytId(id)),
      () => request(`/playlists/${encodeURIComponent(id)}`),
      id,
    );
  },

  getPlaylistTracks(id: string, cursor?: string) {
    return paged<Page<Track>>(
      'playlistTracks',
      cursor,
      (c, cur) => c.playlistTracks(ytId(id), cur),
      (cur) => request(`/playlists/${encodeURIComponent(id)}/tracks`, { params: { cursor: cur } }),
      id,
    );
  },

  // Playback
  /** The backend's relay url, skipping the in-app catalog (the player's fallback). */
  getBackendTrackStream(id: string, quality: 'auto' | 'low' | 'normal' | 'high' = 'auto', format?: 'opus' | 'm4a') {
    return request<StreamInfo>(`/tracks/${encodeURIComponent(id)}/stream`, { params: { quality, format } });
  },

  /** In the desktop window an in-app stream is an absolute googlevideo url; the backend's is a relay path. */
  getTrackStream(id: string, quality: 'auto' | 'low' | 'normal' | 'high' = 'auto', format?: 'opus' | 'm4a') {
    return localFirst<StreamInfo>(
      'stream',
      (c) => c.stream(ytId(id), { quality, format }),
      () => this.getBackendTrackStream(id, quality, format),
      id,
    );
  },

  /** `placeholder`: nobody has uploaded this song's waveform yet; these bars are made up. */
  getTrackPeaks(id: string, bars: number = 150) {
    return request<{ peaks: number[]; placeholder?: boolean }>(`/tracks/${encodeURIComponent(id)}/peaks`, {
      params: { bars },
    });
  },

  /** The waveform heard on this device (150 bars, 0..1); the first upload for a song wins. */
  putTrackPeaks(id: string, peaks: number[]) {
    return request<{ stored: boolean }>(`/tracks/${encodeURIComponent(id)}/peaks`, {
      method: 'PUT',
      body: JSON.stringify({ peaks }),
    });
  },

  getTrackArtworkUrl(id: string, size?: '64' | '140' | '300' | '640'): string {
    // In the desktop window, straight from YouTube's image CDN rather than the backend's redirect.
    if (isInAppYoutubeAllowed() && isYouTubeId(id)) return trackThumbUrl(ytId(id).slice(3));
    const params = size ? `?size=${size}` : '';
    return `${API_BASE}/tracks/${encodeURIComponent(id)}/artwork${params}`;
  },

  getAlbumArtworkUrl(id: string, size?: '64' | '140' | '300' | '640'): string {
    const params = size ? `?size=${size}` : '';
    return `${API_BASE}/albums/${encodeURIComponent(id)}/artwork${params}`;
  },

  getPlaylistArtworkUrl(id: string, size?: '64' | '140' | '300' | '640'): string {
    const params = size ? `?size=${size}` : '';
    return `${API_BASE}/playlists/${encodeURIComponent(id)}/artwork${params}`;
  },

  getArtistArtworkUrl(id: string, size?: '64' | '140' | '300' | '640'): string {
    const params = size ? `?size=${size}` : '';
    return `${API_BASE}/artists/${encodeURIComponent(id)}/artwork${params}`;
  },

  // Lyrics
  /** `track` names the song for the lookup when the backend has never seen it (found in-app). */
  getLyrics(
    id: string,
    prefer: 'synced' | 'plain' = 'synced',
    script: LyricsScript = 'original',
    track?: Pick<Track, 'title' | 'artist' | 'durationMs'>,
  ) {
    return request<{
      synced: boolean;
      provider: string;
      offsetMs: number;
      lines: { atMs: number; text: string }[];
      plain?: string;
    }>(`/tracks/${encodeURIComponent(id)}/lyrics`, {
      params: {
        prefer,
        ...(script !== 'original' && { script }),
        ...(track?.title && track.artist && { title: track.title, artist: track.artist }),
        ...(track?.durationMs && { durationMs: track.durationMs }),
      },
    });
  },

  searchLyrics(params: { track: string; artist?: string; album?: string; durationSec?: number }) {
    return request<any[]>('/lyrics/search', { params });
  },

  updateLyricsOffset(id: string, offsetMs: number) {
    return request<{ ok: boolean }>(`/tracks/${encodeURIComponent(id)}/lyrics/offset`, {
      method: 'PATCH',
      body: JSON.stringify({ offsetMs }),
    });
  },

  // User Library & /me
  getMe() {
    return request<User>('/me');
  },

  getLibraryTracks(params?: {
    filter?: 'all' | 'liked';
    sort?: 'addedAt' | 'title' | 'artist' | 'album' | 'durationMs' | 'playCount';
    order?: 'asc' | 'desc';
    limit?: number;
    cursor?: string;
  }) {
    return request<Page<Track>>('/me/library/tracks', { params });
  },

  getLibraryAlbums(cursor?: string) {
    return request<Page<Album>>('/me/library/albums', { params: { cursor } });
  },

  async getLibraryArtists(cursor?: string) {
    const res = await request<Page<Artist>>('/me/library/artists', { params: { cursor } });
    if (res?.items) {
      for (const a of res.items) {
        if (a.id) rememberFollow(a.id, a.following);
      }
    }
    return res;
  },

  getFavouriteTracks(cursor?: string) {
    return request<Page<Track>>('/me/favourites/tracks', { params: { cursor } });
  },

  /** Every liked id, newest first: enough for the hearts on catalog tracks, which come with `favourite: false`. */
  getFavouriteIds() {
    return request<{ ids: string[] }>('/me/favourites/ids');
  },

  // Saving one sends what the app knows about it (`meta`): the backend may never have seen
  // an item found in-app.
  setTrackFavourite(id: string, favourite: boolean, track?: Track) {
    return request<{ ok: boolean }>(`/me/favourites/tracks/${encodeURIComponent(id)}`, {
      method: favourite ? 'PUT' : 'DELETE',
      ...(favourite && track && { body: JSON.stringify({ meta: trackMeta(track) }) }),
    });
  },

  /** Bulk unlike tracks: DELETE /me/favourites/tracks with body { ids: string[] }. */
  deleteTrackFavourites(ids: string[]) {
    return request<RemovedCount>('/me/favourites/tracks', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },

  setAlbumFavourite(id: string, favourite: boolean, album?: Album) {
    return request<{ ok: boolean }>(`/me/favourites/albums/${encodeURIComponent(id)}`, {
      method: favourite ? 'PUT' : 'DELETE',
      ...(favourite && album && { body: JSON.stringify({ meta: albumMeta(album) }) }),
    });
  },

  /** A saved YouTube playlist is stored like an album, so it shows up in Library → Albums. */
  setPlaylistFavourite(id: string, favourite: boolean, playlist?: Playlist) {
    return request<{ ok: boolean }>(`/me/favourites/albums/${encodeURIComponent(id)}`, {
      method: favourite ? 'PUT' : 'DELETE',
      ...(favourite && playlist && { body: JSON.stringify({ meta: playlistMeta(playlist) }) }),
    });
  },

  setArtistFollowing(id: string, following: boolean, artist?: Artist) {
    rememberFollow(id, following);
    return request<{ ok: boolean }>(`/me/following/artists/${encodeURIComponent(id)}`, {
      method: following ? 'PUT' : 'DELETE',
      ...(following && artist && { body: JSON.stringify({ meta: artistMeta(artist) }) }),
    });
  },

  getRecentlyPlayed(limit: number = 20) {
    return request<Page<Track>>('/me/recently-played', { params: { limit } });
  },

  getNotPlayedLately(limit: number = 20) {
    return request<Page<Track>>('/me/not-played-lately', { params: { limit } });
  },

  getMostPlayed(params?: { limit?: number; window?: '30d' }) {
    return request<Page<Track>>('/me/most-played', { params });
  },

  clearHistory() {
    return request<RemovedCount>('/me/history', { method: 'DELETE' });
  },

  getMadeForYou() {
    return request<Page<Album | Track>>('/discover/made-for-you');
  },

  // Playlists
  getMyPlaylists() {
    return request<Page<Playlist>>('/me/playlists');
  },

  getSavedPlaylists() {
    return request<Page<SavedPlaylist>>('/me/saved-playlists');
  },

  // AI (forReference/ai-briefs/CONTRACT.md in the root repo). The AI names songs; songSearch finds them.
  aiYouMayLike() {
    return request<AiYouMayLike>('/me/ai/you-may-like');
  },

  aiSearchPlan(q: string) {
    return request<AiSearchPlan>('/ai/search', { params: { q } });
  },

  aiPlaylistDraft(body: { prompt: string; count: number }) {
    return request<AiPlaylistDraft>('/me/ai/playlist', { method: 'POST', body: JSON.stringify(body) });
  },

  /** Signed in or not; the token goes along when there is one. */
  aiTitles(items: PendingTitle[], options: { wait?: boolean } = {}) {
    return request<AiTitleFixes>('/ai/titles', {
      method: 'POST',
      body: JSON.stringify({ items, ...(options.wait ? { wait: true } : {}) }),
    });
  },

  /** The songs on the first page of a song search (in-app YouTube first, like any search). */
  async songSearch(q: string): Promise<Track[]> {
    const page = await api.search(q, 'songs');
    return page.items.filter((item): item is Track => 'durationMs' in item);
  },

  createPlaylist(body: { name: string; kind?: 'local' | 'synced' | 'online'; description?: string }) {
    return request<Playlist>('/me/playlists', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getMyPlaylist(id: string) {
    return request<Playlist>(`/me/playlists/${encodeURIComponent(id)}`);
  },

  getMyPlaylistTracks(id: string) {
    return request<Page<Track>>(`/me/playlists/${encodeURIComponent(id)}/tracks`);
  },

  updatePlaylist(id: string, body: { name?: string; description?: string }) {
    return request<Playlist>(`/me/playlists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  deleteMyPlaylist(id: string) {
    return request<{ ok: boolean }>(`/me/playlists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  addTracksToPlaylist(id: string, tracks: Track[]) {
    return request<{ ok: boolean }>(`/me/playlists/${encodeURIComponent(id)}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackIds: tracks.map((t) => t.id), metas: trackMetas(tracks) }),
    });
  },

  removeTracksFromPlaylist(id: string, body: { index?: number; trackIds?: string[] }) {
    return request<{ ok: boolean }>(`/me/playlists/${encodeURIComponent(id)}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  },

  reorderPlaylistTracks(id: string, body: { from: number; to: number }) {
    return request<{ ok: boolean }>(`/me/playlists/${encodeURIComponent(id)}/tracks/order`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // State & Sync
  getPlayerState() {
    return request<any>('/me/player-state');
  },

  savePlayerState(body: any) {
    return request<{ ok: boolean }>('/me/player-state', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  getSettings() {
    return request<any>('/me/settings');
  },

  saveSettings(body: any) {
    return request<{ ok: boolean }>('/me/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  sync(body: any) {
    return request<any>('/me/sync', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

/**
 * Keep the admin's settings for the apps fresh: now, whenever the window comes back into view,
 * and while it's in view, at most every 5 minutes. `onConfig` gets each one fetched.
 */
export const startAppConfigSync = (onConfig: (config: AppConfig) => void): void => {
  let last = 0;
  const sync = () => {
    if (Date.now() - last < 5 * 60_000) return;
    last = Date.now();
    void api.syncAppConfig().then((config) => config && onConfig(config));
  };
  sync();
  setInterval(() => {
    if (document.visibilityState === 'visible') sync();
  }, 60_000);
  window.addEventListener('focus', sync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync();
  });
};
