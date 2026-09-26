import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useDebounce, useGenres, usePlaylist, notifyPlaylistsChanged } from '../data/hooks'
import { api } from '../data/api'
import { showToast } from '../store/toastStore'
import { useLocalLibrary, localLibrary } from '../data/local'
import SongRow, { SongTableHeader } from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Icon from '../components/ui/Icon'
import Button, { IconButton } from '../components/ui/Button'
import DownloadButton from '../components/music/DownloadButton'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { fadeRise, transition } from '../lib/motion'
import { cn } from '../lib/utils'
import { useAppDispatch, useAppSelector } from '../store'
import { runSearch, searchKey, setQuery, setType, type SearchType } from '../store/searchSlice'
import type { Track, Album, Artist, Playlist } from '../data/types'

type ChipFilter = 'all' | SearchType

const CHIPS: { id: ChipFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'playlists', label: 'Playlists' },
]

export default function Search() {
  const { mode, setMode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const dispatch = useAppDispatch()
  const { query, type: activeType, results, resultsFor, requested, status, error } = useAppSelector(s => s.search)
  const [params, setParams] = useSearchParams()
  const addTo = params.get('addTo')
  const [activeChip, setActiveChip] = useState<ChipFilter>('all')

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
  const debouncedQuery = useDebounce(query.trim(), 300)

  // Map activeChip to searchSlice SearchType (when All, fetch songs as primary)
  const querySearchType: SearchType = activeChip === 'all' ? 'songs' : activeChip

  useEffect(() => {
    if (isOnline && debouncedQuery) {
      dispatch(runSearch({ query: debouncedQuery, type: querySearchType }))
    }
  }, [isOnline, debouncedQuery, querySearchType])

  const local = useLocalLibrary()
  const key = searchKey(debouncedQuery, querySearchType)
  const current = resultsFor === key
  const failed = requested === key && status === 'error'
  const searchLoading = isOnline && !current && !failed
  const searchError = isOnline && failed ? error : null
  const needle = query.trim().toLowerCase()

  const localMatches = needle
    ? local.tracks.filter(t => [t.title, t.artist, t.album].some(v => v?.toLowerCase().includes(needle)))
    : []

  const { data: genres } = useGenres()

  const serverItems = isOnline && current ? results : []
  // Merge items
  const combinedTracks = isOnline
    ? [
        ...localMatches,
        ...serverItems.filter((item): item is Track => 'durationMs' in item && !localMatches.some(l => l.id === item.id)),
      ]
    : localMatches

  const totalResultsCount = isOnline
    ? combinedTracks.length + (activeChip !== 'all' && activeChip !== 'songs' ? serverItems.length : 0)
    : localMatches.length

  const handlePlay = (track: Track) => {
    playTrack(track, combinedTracks.length > 0 ? combinedTracks : [track])
  }

  // Find top result (prefer first match: album, song, or artist)
  const topSong = combinedTracks[0]

  return (
    <div className="@container flex flex-col overflow-hidden h-full">
      {addTo && (
        <div className="onstrip mx-8 mt-6 gap-3 flex-none">
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-acc">Adding to {addToPlaylist?.name ?? 'playlist'}</span>
            <span className="text-label-s text-t3">
              {added.size > 0 ? `${added.size} added — search for more` : 'Search for songs and press + to add them'}
            </span>
          </span>
          <Link to={`/playlist/${addTo}`} className="btn btn-acc btn-sm no-underline">Done</Link>
        </div>
      )}

      {/* Chips bar & Count indicator */}
      {hasQuery && (
        <div className="flex items-center justify-between px-8 pt-6 pb-2 flex-none flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {CHIPS.map(chip => (
              <button
                key={chip.id}
                className={cn('chip', activeChip === chip.id && 'chip-on')}
                onClick={() => {
                  setActiveChip(chip.id)
                  if (chip.id !== 'all') {
                    dispatch(setType(chip.id))
                  }
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-body-s text-t3">
            {isOnline ? (
              <>
                <Icon name="cloud" size={15} />
                <span>Server + device · {totalResultsCount.toLocaleString()} results</span>
              </>
            ) : (
              <>
                <Icon name="smartphone" size={15} />
                <span className="text-gold">This device only · {totalResultsCount.toLocaleString()} matches</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Offline banner if offline */}
      {!isOnline && hasQuery && CAPS.offlineMode && (
        <div className="mx-8 mt-4 offstrip flex-none">
          <Icon name="wifi-off" size={16} />
          <span className="text-body-m text-gold grow">Online search is unavailable in Offline Mode.</span>
          <button className="btn btn-sm btn-out" onClick={() => setMode('online')}>
            <Icon name="cloud" size={14} />
            <span>Search online instead</span>
          </button>
        </div>
      )}

      {/* Main content body */}
      <div className={cn('flex flex-col grow overflow-auto px-8 pb-8', !hasQuery && 'pt-6')}>
        <AnimatePresence mode="wait">
          {hasQuery ? (
            <motion.div
              key={debouncedQuery + activeChip + mode}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition.normal}
              className="flex flex-col gap-6 pt-3"
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
                  <Button variant="out" size="sm" icon="sync" onClick={() => dispatch(runSearch({ query: debouncedQuery, type: querySearchType }))}>
                    Try again
                  </Button>
                </div>
              ) : combinedTracks.length === 0 && serverItems.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="No results found"
                  description={isOnline ? `No results found matching "${query}"` : `Nothing on this device matches "${query}"`}
                />
              ) : activeChip === 'all' ? (
                <div className="flex flex-col gap-8">
                  {/* Two column layout: Top Result card + Songs Table */}
                  <div className="grid grid-cols-1 @4xl:grid-cols-[360px_minmax(0,1fr)] gap-7 items-start">
                    {/* Top result card */}
                    {topSong && (
                      <div className="flex flex-col gap-3">
                        <span className="text-overline text-t3 uppercase font-semibold">Top result</span>
                        <div className="surf flex flex-col gap-4 p-5 rounded-xl">
                          <Artwork
                            src={topSong.thumbnail || `/api/v1/albums/${topSong.albumId}/artwork?size=240`}
                            alt={topSong.title}
                            variant="a2"
                            size={168}
                            radius="md"
                            className="shadow-xl"
                          />
                          <div className="flex flex-col gap-1.5">
                            <span className="text-heading-m text-t1 font-semibold">{topSong.title}</span>
                            <span className="text-body-m text-t2">
                              Song · {topSong.artist} {topSong.album ? `· ${topSong.album}` : ''}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {topSong.source === 'local' || local.downloads.has(topSong.id) ? (
                                <span className="badge bg-local inline-flex items-center gap-1">
                                  <Icon name="smartphone" size={9} />
                                  <span>On device</span>
                                </span>
                              ) : (
                                <span className="badge bg-cloud inline-flex items-center gap-1">
                                  <Icon name="cloud" size={9} />
                                  <span>Server</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 mt-2">
                            <button
                              className="playbtn playbtn-48"
                              aria-label={`Play ${topSong.title}`}
                              onClick={() => handlePlay(topSong)}
                            >
                              <Icon name="play" size={21} />
                            </button>
                            <DownloadButton tracks={[topSong]} offline={!isOnline} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Songs 4 rows table */}
                    <div className="@container flex flex-col gap-3 min-w-0">
                      <span className="text-overline text-t3 uppercase font-semibold">Songs</span>
                      <div className="flex flex-col gap-0.5">
                        {combinedTracks.slice(0, 4).map((track, i) => (
                          <SongRow
                            key={track.id}
                            track={track}
                            index={i + 1}
                            isActive={currentTrack?.id === track.id}
                            onClick={() => handlePlay(track)}
                            onAdd={addTo ? () => void addTrack(track) : undefined}
                            added={added.has(track.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Artists row of avatars */}
                  <div className="flex flex-col gap-3">
                    <span className="text-overline text-t3 uppercase font-semibold">Artists</span>
                    <div className="flex items-center gap-6 overflow-x-auto pb-2">
                      {Array.from(new Set(combinedTracks.map(t => t.artist))).slice(0, 6).map((artistName, i) => (
                        <div key={artistName} className="flex flex-col items-center gap-2 w-[92px] flex-none text-center">
                          <Artwork
                            alt={artistName}
                            variant={`a${((i % 12) + 1) as 1}`}
                            size={92}
                            radius="circ"
                          />
                          <span className="text-label-m text-t1 truncate w-full">{artistName}</span>
                          <span className="text-label-s text-t3">Artist</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Offline Notice at the bottom */}
                  {!isOnline && (
                    <div className="surf flex items-center gap-3 p-4 rounded-xl opacity-75">
                      <Icon name="cloud" size={18} />
                      <div className="flex flex-col">
                        <span className="text-body-m text-t2 font-medium">More matches on server</span>
                        <span className="text-body-s text-t3">Go online to search and stream online catalog.</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeChip === 'songs' ? (
                <div className="flex flex-col gap-2">
                  <SongTableHeader />
                  {combinedTracks.map((track, i) => (
                    <SongRow
                      key={track.id}
                      track={track}
                      index={i + 1}
                      isActive={currentTrack?.id === track.id}
                      onClick={() => handlePlay(track)}
                      onAdd={addTo ? () => void addTrack(track) : undefined}
                      added={added.has(track.id)}
                    />
                  ))}
                </div>
              ) : activeChip === 'albums' ? (
                <div className="flex gap-4 flex-wrap pt-2">
                  {(serverItems.filter((item): item is Album => 'trackCount' in item)).map((album, i) => (
                    <Card
                      key={album.id}
                      title={album.title}
                      subtitle={album.artist}
                      artVariant={`a${(i % 12) + 1}` as any}
                      thumbnail={album.thumbnail || `/api/v1/albums/${album.id}/artwork?size=140`}
                      to={`/album/${album.id}`}
                    />
                  ))}
                </div>
              ) : activeChip === 'artists' ? (
                <div className="flex gap-4 flex-wrap pt-2">
                  {(serverItems.filter((item): item is Artist => 'albumCount' in item || 'following' in item)).map((artist, i) => (
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
                  {(serverItems.filter((item): item is Playlist => 'kind' in item && !('durationMs' in item))).map((pl, i) => (
                    <Card
                      key={pl.id}
                      title={pl.name}
                      subtitle={pl.kind ? `Playlist · ${pl.kind}` : 'Playlist'}
                      artVariant={`a${(i % 12) + 1}` as any}
                      thumbnail={pl.thumbnail || `/api/v1/albums/${pl.id}/artwork?size=140`}
                      to={`/playlist/${pl.id}`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-6">
              <span className="text-title-l text-t1 font-semibold">Browse categories</span>
              <div className="grid grid-cols-2 @md:grid-cols-4 gap-3">
                {(genres || ['Ambient', 'Electronica', 'Post-rock', 'Indie', 'Jazz', 'Classical', 'Hip-hop', 'Folk']).map((genre, i) => {
                  const name = typeof genre === 'string' ? genre : (genre as any).name
                  return (
                    <button
                      key={name}
                      onClick={() => dispatch(setQuery(name))}
                      className="gcard text-left cursor-pointer relative overflow-hidden border-0"
                    >
                      <Artwork variant={`a${(i % 12) + 1}` as any} size={56} radius="md" className="absolute top-2 right-2" />
                      <span className="text-title-l text-t1 relative">{name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
