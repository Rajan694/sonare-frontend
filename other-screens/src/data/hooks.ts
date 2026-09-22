import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { localLibrary } from './local'
import { getCurrentUser, isAuthReady, onAuthChange, onAuthReady } from './auth'
import type { Track, Album, Artist, Playlist, Folder, Page, User } from './types'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useAuth(): { user: User | null; ready: boolean } {
  const [user, setUser] = useState<User | null>(getCurrentUser())
  const [ready, setReady] = useState<boolean>(isAuthReady())

  useEffect(() => {
    const unsubAuth = onAuthChange(u => setUser(u))
    const unsubReady = onAuthReady(() => setReady(true))
    return () => {
      unsubAuth()
      unsubReady()
    }
  }, [])

  return { user, ready }
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: any[] = [],
  options: { enabled?: boolean; initialData?: T | null } = {}
): AsyncState<T> {
  const { enabled = true, initialData = null } = options
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<Error | null>(null)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => {
    setTrigger(t => t + 1)
  }, [])

  // Serialize the caller's deps into one string so the effect's dependency array is a
  // fixed size regardless of how many deps a call site passes. Computed inline rather
  // than via useMemo: `deps` is a fresh array literal on every render, so memoising on
  // [deps] would recompute every render anyway while costing an extra hook slot.
  const depKey = JSON.stringify(deps)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    asyncFn()
      .then(res => {
        if (isMounted) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [enabled, trigger, depKey])

  return { data, loading, error, refetch }
}

export function useAuthAsync<T>(
  asyncFn: () => Promise<T>,
  deps: any[] = [],
  options: { enabled?: boolean; initialData?: T | null } = {}
): AsyncState<T> {
  const { user, ready } = useAuth()
  const { enabled = true, initialData = null } = options

  // Wait for auth to settle during cold boot before firing /me calls, and refetch on user state change
  const shouldRun = enabled && ready

  return useAsync(
    asyncFn,
    [user?.id, ready, ...deps],
    { enabled: shouldRun, initialData }
  )
}

export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(value)
    }, delayMs)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMs])
  return debounced
}

// Catalog hooks (unauthenticated, immediate)
export function useTrending(region: string = 'IN', limit: number = 50) {
  return useAsync(() => api.getTrending(region, limit), [region, limit])
}

export function useSearch(
  query: string,
  type: 'songs' | 'albums' | 'artists' | 'playlists' | 'all' = 'all',
  cursor?: string
) {
  const debouncedQuery = useDebounce(query.trim(), 300)
  return useAsync(
    () => api.search(debouncedQuery, type, cursor),
    [debouncedQuery, type, cursor],
    { enabled: debouncedQuery.length > 0 }
  )
}

export function useSuggestions(query: string) {
  const debouncedQuery = useDebounce(query.trim(), 250)
  return useAsync(
    () => api.searchSuggestions(debouncedQuery),
    [debouncedQuery],
    { enabled: debouncedQuery.length > 0 }
  )
}

export function useGenres() {
  return useAsync(() => api.getGenres(), [])
}

export function useAlbum(id: string | undefined) {
  return useAsync(
    () => (id ? api.getAlbum(id) : Promise.reject(new Error('Missing album id'))),
    [id],
    { enabled: !!id }
  )
}

export function useAlbumTracks(id: string | undefined, cursor?: string) {
  return useAsync(
    () => (id ? api.getAlbumTracks(id, cursor) : Promise.reject(new Error('Missing album id'))),
    [id, cursor],
    { enabled: !!id }
  )
}

export function useArtist(id: string | undefined) {
  return useAsync(
    () => (id ? api.getArtist(id) : Promise.reject(new Error('Missing artist id'))),
    [id],
    { enabled: !!id }
  )
}

export function useArtistTopTracks(id: string | undefined, limit: number = 20) {
  return useAsync(
    () => (id ? api.getArtistTopTracks(id, limit) : Promise.reject(new Error('Missing artist id'))),
    [id, limit],
    { enabled: !!id }
  )
}

export function useArtistAlbums(id: string | undefined, cursor?: string) {
  return useAsync(
    () => (id ? api.getArtistAlbums(id, cursor) : Promise.reject(new Error('Missing artist id'))),
    [id, cursor],
    { enabled: !!id }
  )
}

export function usePlaylist(id: string | undefined) {
  return useAsync(
    () => (id ? api.getPlaylist(id) : Promise.reject(new Error('Missing playlist id'))),
    [id],
    { enabled: !!id }
  )
}

export function usePlaylistTracks(id: string | undefined, cursor?: string) {
  return useAsync(
    () => (id ? api.getPlaylistTracks(id, cursor) : Promise.reject(new Error('Missing playlist id'))),
    [id, cursor],
    { enabled: !!id }
  )
}

// User /me hooks (wait for auth settlement and react to login)
export function useLibraryTracks(params?: {
  sort?: 'addedAt' | 'playCount' | 'title'
  order?: 'asc' | 'desc'
  source?: 'all' | 'server'
  cursor?: string
}) {
  return useAuthAsync(
    () => api.getLibraryTracks(params),
    [params?.sort, params?.order, params?.source, params?.cursor]
  )
}

export function useLibraryAlbums(cursor?: string) {
  return useAuthAsync(() => api.getLibraryAlbums(cursor), [cursor])
}

export function useLibraryArtists(cursor?: string) {
  return useAuthAsync(() => api.getLibraryArtists(cursor), [cursor])
}

export function useLibraryGenres() {
  return useAuthAsync(() => api.getLibraryGenres(), [])
}

export function useFavourites(cursor?: string) {
  return useAuthAsync(() => api.getFavouriteTracks(cursor), [cursor])
}

export function useRecentlyPlayed(limit: number = 20) {
  return useAuthAsync(() => api.getRecentlyPlayed(limit), [limit])
}

export function useMostPlayed(params?: { limit?: number; window?: '30d' }) {
  return useAuthAsync(() => api.getMostPlayed(params), [params?.limit, params?.window])
}

export function useNewReleases() {
  return useAuthAsync(() => api.getNewReleases(), [])
}

export function useMyPlaylists() {
  return useAuthAsync(() => api.getMyPlaylists(), [])
}

export function useLyrics(trackId: string | undefined, prefer: 'synced' | 'plain' = 'synced') {
  return useAsync(
    () => (trackId ? api.getLyrics(trackId, prefer) : Promise.reject(new Error('Missing track id'))),
    [trackId, prefer],
    { enabled: !!trackId }
  )
}

export function usePeaks(trackId: string | undefined, bars: number = 150) {
  return useAsync(
    () => (trackId ? api.getTrackPeaks(trackId, bars) : Promise.reject(new Error('Missing track id'))),
    [trackId, bars],
    { enabled: !!trackId }
  )
}

export function useFolders() {
  return useAsync(() => localLibrary.listFolders(), [])
}
