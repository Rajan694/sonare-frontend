import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useSearch, useGenres } from '../data/hooks'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Icon from '../components/ui/Icon'
import { Chip } from '../components/ui/ChipBadge'
import { Field } from '../components/ui/Field'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { fadeRise, transition } from '../lib/motion'
import type { Track, Album, Artist, Playlist } from '../data/types'

const CHIPS = ['Songs', 'Albums', 'Artists', 'Playlists'] as const
type FilterChip = typeof CHIPS[number]

export default function Search() {
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<FilterChip>('Songs')

  const isOnline = mode === 'online'
  const hasQuery = query.trim().length > 0

  const typeMap: Record<FilterChip, 'songs' | 'albums' | 'artists' | 'playlists'> = {
    Songs: 'songs',
    Albums: 'albums',
    Artists: 'artists',
    Playlists: 'playlists',
  }

  const { data: searchResult, loading: searchLoading, error: searchError } = useSearch(
    query,
    typeMap[active] || 'songs'
  )

  const { data: genres } = useGenres()

  const items = searchResult?.items || []
  const tracks = items.filter((item): item is Track => 'durationMs' in item)
  const albums = items.filter((item): item is Album => 'trackCount' in item && 'year' in item)
  const artists = items.filter((item): item is Artist => 'albumCount' in item || 'following' in item)
  const playlists = items.filter((item): item is Playlist => 'kind' in item && !('durationMs' in item))

  const handlePlay = (track: Track) => {
    playTrack(track, tracks.length > 0 ? tracks : [track])
  }

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-3 px-8 pt-6 pb-4 flex-none">
        <Field
          square
          icon="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search songs, albums, artists..."
          className="grow max-w-[560px]"
          aria-label="Search your library"
        >
          {query && (
            <button
              className="ib ib-28 flex-none"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </Field>
      </div>

      {hasQuery && (
        <div className="flex items-center gap-2 px-8 pb-4 flex-none">
          {CHIPS.map(chip => (
            <Chip
              key={chip}
              active={active === chip}
              onClick={() => setActive(chip)}
            >
              {chip}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex flex-col grow overflow-auto px-8 pb-8">
        <AnimatePresence mode="wait">
          {hasQuery ? (
            <motion.div
              key={query + active}
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
                <div className="text-red p-4 text-center">
                  Search error: {searchError.message}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="No results found"
                  description={`No ${active.toLowerCase()} found matching "${query}"`}
                />
              ) : active === 'Songs' ? (
                tracks.map((track, i) => (
                  <SongRow
                    key={track.id}
                    track={track}
                    index={i + 1}
                    isActive={currentTrack?.id === track.id}
                    isPlaying={currentTrack?.id === track.id}
                    onClick={() => handlePlay(track)}
                  />
                ))
              ) : active === 'Albums' ? (
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
              ) : active === 'Artists' ? (
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

              {!isOnline && (
                <div className="mt-6 flex flex-col gap-3">
                  <hr className="hr" />
                  <div className="offstrip">
                    <Icon name="wifi-off" size={16} />
                    <span className="flex flex-col grow gap-px">
                      <span className="text-label-l text-gold">Offline mode active</span>
                      <span className="text-label-s text-t3">Switch to Online mode to stream full catalog</span>
                    </span>
                    <Link to="/mode-switch" className="btn btn-gold btn-sm">Go online</Link>
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
                      onClick={() => setQuery(cat.name)}
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
