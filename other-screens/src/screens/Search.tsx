import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useDebounce, useGenres, usePlaylist, notifyPlaylistsChanged } from '../data/hooks'
import { api } from '../data/api'
import { showToast } from '../store/toastStore'
import { useLocalLibrary } from '../data/local'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Icon from '../components/ui/Icon'
import { Chip } from '../components/ui/ChipBadge'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { fadeRise, transition } from '../lib/motion'
import { cn } from '../lib/utils'
import { useAppDispatch, useAppSelector } from '../store'
import { runSearch, searchKey, setQuery, setType, type SearchType } from '../store/searchSlice'
import type { Track, Album, Artist, Playlist } from '../data/types'

const CHIPS: { type: SearchType; label: string }[] = [
  { type: 'songs', label: 'Songs' },
  { type: 'albums', label: 'Albums' },
  { type: 'artists', label: 'Artists' },
  { type: 'playlists', label: 'Playlists' },
]

export default function Search() {
  const { mode, setMode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const dispatch = useAppDispatch()
  // Typed into the top-bar field; the Redux store keeps it (and the results) while we're away.
  const { query, type: active, results, resultsFor, requested, status, error } = useAppSelector(s => s.search)
  const [params, setParams] = useSearchParams()
  // ?addTo=<playlist> is FLOWS M08's "Add songs" mode.
  const addTo = params.get('addTo')

  // ?q= links (Library → Genres) hand their query to the store and leave the URL.
  const linkedQuery = params.get('q')
  useEffect(() => {
    if (linkedQuery === null) return
    dispatch(setQuery(linkedQuery))
    const next = new URLSearchParams(params)
    next.delete('q')
    setParams(next, { replace: true })
  }, [linkedQuery])

  const { data: addToPlaylist } = usePlaylist(addTo ?? undefined)
  const [added, setAdded] = useState<Set<string>>(new Set())

  async function addTrack(track: Track) {
    if (!addTo) return
    setAdded(prev => new Set(prev).add(track.id))
    try {
      await api.addTracksToPlaylist(addTo, [track.id])
      notifyPlaylistsChanged()
    } catch {
      setAdded(prev => {
        const next = new Set(prev)
        next.delete(track.id)
        return next
      })
      showToast({ title: 'Could not add to playlist', description: track.title, icon: 'info' })
    }
  }
  const isOnline = mode === 'online'
  const hasQuery = query.trim().length > 0

  // Online, ask the server once typing pauses. Coming back to the page finds these results
  // already in the store, so nothing is refetched.
  const debouncedQuery = useDebounce(query.trim(), 300)
  const search = () => void dispatch(runSearch({ query: debouncedQuery, type: active }))
  useEffect(() => {
    if (isOnline && debouncedQuery) search()
  }, [isOnline, debouncedQuery, active])

  // Offline (FLOWS M04) searches files on this device and never calls the server.
  const local = useLocalLibrary()
  const key = searchKey(debouncedQuery, active)
  const current = resultsFor === key
  const failed = requested === key && status === 'error'
  // Until this query's results arrive — the debounce gap included — show the skeleton rather
  // than the previous query's results.
  const searchLoading = isOnline && !current && !failed
  const searchError = isOnline && failed ? error : null
  const needle = query.trim().toLowerCase()
  const localMatches = !isOnline && needle
    ? local.tracks.filter(t => [t.title, t.artist, t.album].some(v => v?.toLowerCase().includes(needle)))
    : []
  const shown: SearchType = isOnline ? active : 'songs'
  const activeLabel = CHIPS.find(c => c.type === active)!.label

  const { data: genres } = useGenres()

  const items = isOnline ? (current ? results : []) : localMatches
  const tracks = items.filter((item): item is Track => 'durationMs' in item)
  const albums = items.filter((item): item is Album => 'trackCount' in item && 'year' in item)
  const artists = items.filter((item): item is Artist => 'albumCount' in item || 'following' in item)
  const playlists = items.filter((item): item is Playlist => 'kind' in item && !('durationMs' in item))

  const handlePlay = (track: Track) => {
    playTrack(track, tracks.length > 0 ? tracks : [track])
  }

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {addTo && (
        <div className="onstrip mx-8 mt-6 gap-3 flex-none">
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-acc">Adding to {addToPlaylist?.name ?? 'playlist'}</span>
            <span className="text-label-s text-t3">{added.size > 0 ? `${added.size} added — search for more` : 'Search for songs and press + to add them'}</span>
          </span>
          <Link to={`/playlist/${addTo}`} className="btn btn-acc btn-sm no-underline">Done</Link>
        </div>
      )}
      {hasQuery && isOnline && (
        <div className="flex items-center gap-2 px-8 pt-6 pb-4 flex-none">
          {CHIPS.map(chip => (
            <Chip
              key={chip.type}
              active={active === chip.type}
              onClick={() => dispatch(setType(chip.type))}
            >
              {chip.label}
            </Chip>
          ))}
        </div>
      )}

      <div className={cn('flex flex-col grow overflow-auto px-8 pb-8', !(hasQuery && isOnline) && 'pt-6')}>
        <AnimatePresence mode="wait">
          {hasQuery ? (
            <motion.div
              key={debouncedQuery + shown}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition.normal}
              className="flex flex-col gap-1"
            >
              {searchLoading ? (
                <div className="flex flex-col gap-2 animate-pulse pt-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="srow h-14 bg-s2/30 rounded" />
                  ))}
                </div>
              ) : searchError ? (
                <div className="flex flex-col items-center gap-3 p-4 text-center">
                  <span className="text-red">Search error: {searchError}</span>
                  <Button variant="out" size="sm" icon="sync" onClick={search}>Try again</Button>
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="No results found"
                  description={isOnline ? `No ${activeLabel.toLowerCase()} found matching "${query}"` : `Nothing on this device matches "${query}"`}
                />
              ) : shown === 'songs' ? (
                tracks.map((track, i) => (
                  <SongRow
                    key={track.id}
                    track={track}
                    index={i + 1}
                    isActive={currentTrack?.id === track.id}
                    onClick={() => handlePlay(track)}
                    onAdd={addTo ? () => void addTrack(track) : undefined}
                    added={added.has(track.id)}
                  />
                ))
              ) : shown === 'albums' ? (
                <div className="flex gap-4 flex-wrap pt-2">
                  {(albums.length > 0 ? albums : items).map((album: any, i) => (
                    <Card
                      key={album.id}
                      title={album.title || album.name}
                      subtitle={album.artist || album.uploaderName || ''}
                      artVariant={`a${(i % 12) + 1}` as any}
                      thumbnail={album.thumbnail || `/api/v1/albums/${album.id}/artwork?size=140`}
                      to={`/album/${album.id}`}
                    />
                  ))}
                </div>
              ) : shown === 'artists' ? (
                <div className="flex gap-4 flex-wrap pt-2">
                  {(artists.length > 0 ? artists : items).map((artist: any, i) => (
                    <Link
                      key={artist.id}
                      to={`/artist/${artist.id}`}
                      className="acard w-[160px] no-underline text-inherit flex flex-col items-center text-center p-3 surf2 rounded-lg"
                    >
                      <Artwork
                        src={artist.thumbnail || `/api/v1/artists/${artist.id}/artwork?size=140`}
                        alt={artist.name}
                        variant={`a${(i % 12) + 1}` as any}
                        size={110}
                        radius="circ"
                      />
                      <span className="text-label-l text-t1 truncate mt-2 w-full">{artist.name}</span>
                      <span className="text-label-s text-t3 truncate">Artist</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 flex-wrap pt-2">
                  {(playlists.length > 0 ? playlists : items).map((pl: any, i) => (
                    <Card
                      key={pl.id}
                      title={pl.name || pl.title}
                      subtitle={pl.kind ? `Playlist · ${pl.kind}` : 'Playlist'}
                      artVariant={`a${(i % 12) + 1}` as any}
                      thumbnail={pl.thumbnail || `/api/v1/albums/${pl.id}/artwork?size=140`}
                      to={`/playlist/${pl.id}`}
                    />
                  ))}
                </div>
              )}

              {CAPS.offlineMode && !isOnline && (
                <div className="mt-6 flex flex-col gap-3">
                  <hr className="hr" />
                  <div className="offstrip">
                    <Icon name="wifi-off" size={16} />
                    <span className="flex flex-col grow gap-px">
                      <span className="text-label-l text-gold">Offline mode active</span>
                      <span className="text-label-s text-t3">Switch to Online mode to stream full catalog</span>
                    </span>
                    <button className="btn btn-gold btn-sm" onClick={() => setMode('online')}>Go online</button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="browse"
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition.normal}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-3.5">
                <span className="text-h2 text-t1">Browse categories</span>
                <div className="grid grid-cols-4 gap-3">
                  {(genres && genres.length > 0
                    ? genres
                    : [
                        { id: 'ambient', name: 'Ambient' },
                        { id: 'electronica', name: 'Electronica' },
                        { id: 'post-rock', name: 'Post-rock' },
                        { id: 'indie', name: 'Indie' },
                        { id: 'jazz', name: 'Jazz' },
                        { id: 'classical', name: 'Classical' },
                        { id: 'hip-hop', name: 'Hip-hop' },
                        { id: 'folk', name: 'Folk' },
                      ]
                  ).map((cat, i) => (
                    <button
                      key={cat.id}
                      className="gcard text-left cursor-pointer relative overflow-hidden"
                      onClick={() => dispatch(setQuery(cat.name))}
                    >
                      <Artwork variant={`a${(i % 12) + 1}` as any} size={56} radius="md" className="absolute top-2 right-2" />
                      <span className="text-title-l text-t1 relative">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
