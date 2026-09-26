import { API_BASE, getAccessToken, refreshAccessToken } from './auth'
import { CLIENT } from '../lib/caps'
import type { Track, Album, Artist, Playlist, Page, User } from './types'

export class ApiError extends Error {
  public status: number
  public code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** What to tell someone when a section's data did not load. */
export function loadErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === 'UPSTREAM_UNAVAILABLE') {
    return "Sonare's music service isn't responding. Try again in a moment."
  }
  // fetch rejects with a TypeError when the request never reached the server.
  if (err instanceof TypeError) return "Can't reach the Sonare server."
  return err instanceof Error ? err.message : 'Something went wrong.'
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
  skipAuth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth, ...init } = options

  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v))
      }
    }
  }

  const headers = new Headers(init.headers)
  headers.set('X-Sonare-Client', CLIENT)
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = getAccessToken()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  let res = await fetch(url.toString(), {
    ...init,
    headers,
  })

  // Handle 401 with one-time token refresh and retry
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`)
      res = await fetch(url.toString(), {
        ...init,
        headers,
      })
    }
  }

  if (res.status === 204) {
    return {} as T
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    if (!res.ok) {
      throw new ApiError(`HTTP error ${res.status}`, res.status)
    }
    return {} as T
  }

  if (!res.ok) {
    const code = data?.error?.code
    const message = data?.error?.message || `Request failed with status ${res.status}`
    throw new ApiError(message, res.status, code)
  }

  return data as T
}

export const api = {
  // Catalog
  search(q: string, type: 'songs' | 'albums' | 'artists' | 'playlists' | 'all' = 'all', cursor?: string) {
    return request<Page<Track | Album | Artist | Playlist>>('/search', {
      params: { q, type, cursor },
    })
  },

  searchSuggestions(q: string) {
    return request<string[]>('/search/suggestions', {
      params: { q },
    })
  },

  getTrending(region: string = 'IN', limit: number = 50) {
    return request<Page<Track>>('/trending', {
      params: { region, limit },
    })
  },

  getGenres() {
    return request<{ id: string; name: string }[]>('/genres')
  },

  getTrack(id: string) {
    return request<Track>(`/tracks/${encodeURIComponent(id)}`)
  },

  getAlbum(id: string) {
    return request<Album>(`/albums/${encodeURIComponent(id)}`)
  },

  getAlbumTracks(id: string, cursor?: string) {
    return request<Page<Track>>(`/albums/${encodeURIComponent(id)}/tracks`, {
      params: { cursor },
    })
  },

  getArtist(id: string) {
    return request<Artist>(`/artists/${encodeURIComponent(id)}`)
  },

  getArtistTopTracks(id: string, limit: number = 20) {
    return request<Page<Track>>(`/artists/${encodeURIComponent(id)}/top-tracks`, {
      params: { limit },
    })
  },

  getArtistAlbums(id: string, cursor?: string) {
    return request<Page<Album>>(`/artists/${encodeURIComponent(id)}/albums`, {
      params: { cursor },
    })
  },

  getPlaylist(id: string) {
    return request<Playlist>(`/playlists/${encodeURIComponent(id)}`)
  },

  getPlaylistTracks(id: string, cursor?: string) {
    return request<Page<Track>>(`/playlists/${encodeURIComponent(id)}/tracks`, {
      params: { cursor },
    })
  },

  // Playback
  getTrackStream(id: string, quality: 'auto' | 'low' | 'high' = 'auto', format?: 'opus' | 'm4a') {
    return request<{
      url: string
      mimeType: string
      codec: string
      bitrateKbps: number
      contentLength: number
      expiresAt: number
      muxed?: boolean
    }>(`/tracks/${encodeURIComponent(id)}/stream`, {
      params: { quality, format },
    })
  },

  getTrackPeaks(id: string, bars: number = 150) {
    return request<{ peaks: number[] }>(`/tracks/${encodeURIComponent(id)}/peaks`, {
      params: { bars },
    })
  },

  getTrackArtworkUrl(id: string, size?: '64' | '140' | '300' | '640'): string {
    const params = size ? `?size=${size}` : ''
    return `${API_BASE}/tracks/${encodeURIComponent(id)}/artwork${params}`
  },

  getAlbumArtworkUrl(id: string, size?: '64' | '140' | '300' | '640'): string {
    const params = size ? `?size=${size}` : ''
    return `${API_BASE}/albums/${encodeURIComponent(id)}/artwork${params}`
  },

  getPlaylistArtworkUrl(id: string, size?: '64' | '140' | '300' | '640'): string {
    const params = size ? `?size=${size}` : ''
    return `${API_BASE}/playlists/${encodeURIComponent(id)}/artwork${params}`
  },

  getArtistArtworkUrl(id: string, size?: '64' | '140' | '300' | '640'): string {
    const params = size ? `?size=${size}` : ''
    return `${API_BASE}/artists/${encodeURIComponent(id)}/artwork${params}`
  },

  // Lyrics
  getLyrics(id: string, prefer: 'synced' | 'plain' = 'synced') {
    return request<{
      synced: boolean
      provider: string
      offsetMs: number
      lines: { atMs: number; text: string }[]
      plain?: string
      attribution?: { name: string; url: string }
    }>(`/tracks/${encodeURIComponent(id)}/lyrics`, {
      params: { prefer },
    })
  },

  searchLyrics(params: { track: string; artist?: string; album?: string; durationSec?: number }) {
    return request<any[]>('/lyrics/search', { params })
  },

  saveLyrics(id: string, body: { lrc?: string; plain?: string }) {
    return request<{ ok: boolean }>(`/tracks/${encodeURIComponent(id)}/lyrics`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateLyricsOffset(id: string, offsetMs: number) {
    return request<{ ok: boolean }>(`/tracks/${encodeURIComponent(id)}/lyrics/offset`, {
      method: 'PATCH',
      body: JSON.stringify({ offsetMs }),
    })
  },

  deleteLyrics(id: string) {
    return request<{ ok: boolean }>(`/tracks/${encodeURIComponent(id)}/lyrics`, {
      method: 'DELETE',
    })
  },

  // User Library & /me
  getMe() {
    return request<User>('/me')
  },

  getLibraryTracks(params?: {
    sort?: 'addedAt' | 'playCount' | 'title'
    order?: 'asc' | 'desc'
    source?: 'all' | 'server'
    cursor?: string
  }) {
    return request<Page<Track>>('/me/library/tracks', { params })
  },

  getLibraryAlbums(cursor?: string) {
    return request<Page<Album>>('/me/library/albums', { params: { cursor } })
  },

  getLibraryArtists(cursor?: string) {
    return request<Page<Artist>>('/me/library/artists', { params: { cursor } })
  },

  getLibraryGenres() {
    return request<{ id: string; name: string }[]>('/me/library/genres')
  },

  getFavouriteTracks(cursor?: string) {
    return request<Page<Track>>('/me/favourites/tracks', { params: { cursor } })
  },

  setTrackFavourite(id: string, favourite: boolean) {
    return request<{ ok: boolean }>(`/me/favourites/tracks/${encodeURIComponent(id)}`, {
      method: favourite ? 'PUT' : 'DELETE',
    })
  },

  setAlbumFavourite(id: string, favourite: boolean) {
    return request<{ ok: boolean }>(`/me/favourites/albums/${encodeURIComponent(id)}`, {
      method: favourite ? 'PUT' : 'DELETE',
    })
  },

  setArtistFollowing(id: string, following: boolean) {
    return request<{ ok: boolean }>(`/me/following/artists/${encodeURIComponent(id)}`, {
      method: following ? 'PUT' : 'DELETE',
    })
  },

  getRecentlyPlayed(limit: number = 20) {
    return request<Page<Track>>('/me/recently-played', { params: { limit } })
  },

  getMostPlayed(params?: { limit?: number; window?: '30d' }) {
    return request<Page<Track>>('/me/most-played', { params })
  },

  getNewReleases() {
    return request<Page<Album>>('/me/new-releases')
  },

  getMadeForYou() {
    return request<Page<Album | Track>>('/discover/made-for-you')
  },

  // Playlists
  getMyPlaylists() {
    return request<Page<Playlist>>('/me/playlists')
  },

  createPlaylist(body: { name: string; kind?: 'local' | 'synced' | 'online'; description?: string }) {
    return request<Playlist>('/me/playlists', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  getMyPlaylist(id: string) {
    return request<Playlist>(`/me/playlists/${encodeURIComponent(id)}`)
  },

  getMyPlaylistTracks(id: string) {
    return request<Page<Track>>(`/me/playlists/${encodeURIComponent(id)}/tracks`)
  },

  updateMyPlaylist(id: string, body: { name?: string; description?: string }) {
    return request<Playlist>(`/me/playlists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  deleteMyPlaylist(id: string) {
    return request<{ ok: boolean }>(`/me/playlists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  addTracksToPlaylist(id: string, trackIds: string[]) {
    return request<{ ok: boolean }>(`/me/playlists/${encodeURIComponent(id)}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackIds }),
    })
  },

  removeTracksFromPlaylist(id: string, body: { index?: number; trackIds?: string[] }) {
    return request<{ ok: boolean }>(`/me/playlists/${encodeURIComponent(id)}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    })
  },

  reorderPlaylistTracks(id: string, body: { from: number; to: number }) {
    return request<{ ok: boolean }>(`/me/playlists/${encodeURIComponent(id)}/tracks/order`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  // State & Sync
  getPlayerState() {
    return request<any>('/me/player-state')
  },

  savePlayerState(body: any) {
    return request<{ ok: boolean }>('/me/player-state', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  getSettings() {
    return request<any>('/me/settings')
  },

  saveSettings(body: any) {
    return request<{ ok: boolean }>('/me/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  sync(body: any) {
    return request<any>('/me/sync', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
