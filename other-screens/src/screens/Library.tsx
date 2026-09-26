import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useLocalLibrary, resolveLocalRefs } from '../data/local'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { 
  useLibraryTracks, 
  useFavourites, 
  useMostPlayed, 
  useLibraryAlbums, 
  useLibraryArtists, 
  useFolders,
  useTrending,
  useAuth,
} from '../data/hooks'
import SongRow, { SongTableHeader } from '../components/music/SongRow'
import { Card } from '../components/ui/Card'
import Artwork, { trackArtwork } from '../components/music/Artwork'
import Button, { IconButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import { staggerContainer } from '../lib/motion'
import { cn, formatBytes } from '../lib/utils'
import type { Track } from '../data/types'

const ALL_TABS = ['Songs', 'Albums', 'Artists', 'Genres', 'Folders', 'Favourites', 'Most played'] as const
const TABS = CAPS.localLibrary ? ALL_TABS : ALL_TABS.filter(t => t !== 'Folders')
type Tab = typeof ALL_TABS[number]

type SortKey = 'addedAt' | 'title' | 'artist' | 'album' | 'durationMs'
const SORTS: { key: SortKey; label: string; desc: boolean }[] = [
  { key: 'addedAt', label: 'Recently added', desc: true },
  { key: 'title', label: 'Title', desc: false },
  { key: 'artist', label: 'Artist', desc: false },
  { key: 'album', label: 'Album', desc: false },
  { key: 'durationMs', label: 'Duration', desc: false },
]

function sortTracks(list: Track[], key: SortKey, desc: boolean): Track[] {
  const sorted = [...list].sort((a, b) => {
    const x = a[key] ?? ''
    const y = b[key] ?? ''
    return typeof x === 'number' && typeof y === 'number'
      ? x - y
      : String(x).localeCompare(String(y), undefined, { sensitivity: 'base' })
  })
  return desc ? sorted.reverse() : sorted
}

export default function Library() {
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const [params, setParams] = useSearchParams()
  const slug = (t: Tab) => t.toLowerCase().replace(' ', '-')
  const activeTab: Tab = TABS.find(t => slug(t) === params.get('view')) ?? 'Songs'
  const setActiveTab = (t: Tab) => setParams(t === 'Songs' ? {} : { view: slug(t) }, { replace: true })
  
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>(null)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'server'>('all')
  const [downloadedOnly, setDownloadedOnly] = useState(false)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const isOffline = mode === 'offline'
  const { user } = useAuth()
  
  const guestTab = !isOffline && !user && activeTab !== 'Songs' && activeTab !== 'Genres' && activeTab !== 'Folders'

  const { data: libraryTracksData, loading: libLoading } = useLibraryTracks()
  const { data: favsData, loading: favsLoading } = useFavourites()
  const { data: mostPlayedData, loading: mostLoading } = useMostPlayed()
  const { data: albumsData, loading: albumsLoading } = useLibraryAlbums()
  const { data: artistsData, loading: artistsLoading } = useLibraryArtists()
  const { data: foldersData } = useFolders()
  const { data: trendingData } = useTrending('IN', 20)

  const local = useLocalLibrary()

  let tracks: Track[] = []
  let loading = false

  if (activeTab === 'Songs') {
    const server = isOffline
      ? []
      : libraryTracksData?.items && libraryTracksData.items.length > 0
        ? libraryTracksData.items
        : local.tracks.length > 0 ? [] : trendingData?.items || []
    tracks = [...local.tracks, ...server]
    loading = !isOffline && libLoading && local.tracks.length === 0
  } else if (activeTab === 'Favourites') {
    tracks = resolveLocalRefs(favsData?.items || [], local)
    loading = favsLoading
  } else if (activeTab === 'Most played') {
    tracks = resolveLocalRefs(mostPlayedData?.items || [], local)
    loading = mostLoading
  }

  if (isOffline && activeTab !== 'Songs') {
    tracks = tracks.filter(t => t.source === 'local' || local.downloads.has(t.id))
    loading = false
  }

  if (sourceFilter === 'local') {
    tracks = tracks.filter(t => t.source === 'local' || local.downloads.has(t.id))
  } else if (sourceFilter === 'server') {
    tracks = tracks.filter(t => t.source === 'server' && !local.downloads.has(t.id))
  }

  if (downloadedOnly) {
    tracks = tracks.filter(t => t.source === 'local' || local.downloads.has(t.id))
  }

  if (sort) tracks = sortTracks(tracks, sort.key, sort.desc)
  const isTrackTab = activeTab === 'Songs' || activeTab === 'Favourites' || activeTab === 'Most played'

  function sortBy(key: SortKey) {
    const preset = SORTS.find(s => s.key === key)!
    setSort(prev => (prev?.key === key ? { key, desc: !prev.desc } : { key, desc: preset.desc }))
  }

  function headerCell(key: SortKey, label: React.ReactNode, className?: string) {
    const on = sort?.key === key
    return (
      <button
        className={cn('flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer text-label-s hover:text-t1', on ? 'text-t1' : 'text-t3', className)}
        onClick={() => sortBy(key)}
        aria-label={`Sort by ${SORTS.find(s => s.key === key)!.label}`}
      >
        {label}
        {on && <Icon name={sort!.desc ? 'chevron-down' : 'chevron-up'} size={12} />}
      </button>
    )
  }

  function groupLocal(key: 'album' | 'artist') {
    const groups = new Map<string, Track[]>()
    for (const t of local.tracks) {
      const name = (key === 'album' ? t.album : t.artist) || (key === 'album' ? 'Unknown album' : 'Unknown artist')
      groups.set(name, [...(groups.get(name) ?? []), t])
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks)
    }
  }

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5)
      playTrack(shuffled[0], shuffled)
    }
  }

  const countSubtitle = isOffline
    ? `${tracks.length.toLocaleString()} songs on this device`
    : `${tracks.length.toLocaleString()} songs in your library`

  return (
    <div className="@container flex flex-col gap-6 overflow-hidden h-full">
      {/* Header section */}
      <div className="flex flex-col gap-4 px-4 @[480px]:px-8 pt-5 @[480px]:pt-7 flex-none">
        {/* Title row */}
        <div className="flex flex-col @[480px]:flex-row @[480px]:items-center @[480px]:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-display-m text-t1 font-semibold">{activeTab}</span>
            <span className="text-body-m text-t2">
              {isTrackTab ? countSubtitle : activeTab}
            </span>
          </div>
          {/* Action buttons (Shuffle / Play all) */}
          <div className="flex items-center gap-2.5">
            {CAPS.localLibrary && (
              <Link to="/folders" className="btn btn-out">
                <Icon name="folder" size={15} />
                <span>Folders</span>
              </Link>
            )}
            <Button variant="out" icon="shuffle" onClick={handleShuffle} disabled={tracks.length === 0}>
              Shuffle
            </Button>
            <Button variant={isOffline ? 'gold' : 'acc'} icon="play" onClick={handlePlayAll} disabled={tracks.length === 0}>
              Play all
            </Button>
          </div>
        </div>

        {/* Horizontal scrollable tabs row */}
        <div className="tabs overflow-x-auto no-scrollbar flex items-center">
          {TABS.map(tab => (
            <button
              key={tab}
              className={cn('tab flex-none', activeTab === tab && 'on')}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter chips & list/grid toggle row */}
        {isTrackTab && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <select
                className="chip chip-sm text-t1 bg-s2 border-ln2 appearance-none cursor-pointer"
                aria-label="Sort order"
                value={sort?.key ?? 'addedAt'}
                onChange={e => {
                  const preset = SORTS.find(s => s.key === e.target.value)
                  setSort(preset ? { key: preset.key, desc: preset.desc } : null)
                }}
              >
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>

              <select
                className="chip chip-sm text-t1 bg-s2 border-ln2 appearance-none cursor-pointer"
                aria-label="Filter source"
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value as any)}
              >
                <option value="all">All sources</option>
                <option value="local">On device</option>
                <option value="server">Server</option>
              </select>

              {CAPS.downloads && (
                <button
                  className={cn('chip chip-sm inline-flex items-center gap-1.5 flex-none', downloadedOnly && 'chip-on')}
                  onClick={() => setDownloadedOnly(prev => !prev)}
                >
                  <Icon name="smartphone" size={13} />
                  <span>Downloaded only</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <IconButton icon="list" label="List view" size={28} active={view === 'list'} onClick={() => setView('list')} />
              <IconButton icon="layout-grid" label="Grid view" size={28} active={view === 'grid'} onClick={() => setView('grid')} />
            </div>
          </div>
        )}

        {/* Table header */}
        {isTrackTab && view === 'list' && (
          <SongTableHeader>
            <span className="text-right">#</span>
            <span />
            {headerCell('title', 'TITLE')}
            <span className="hidden @[720px]:inline">{headerCell('album', 'ALBUM')}</span>
            <span>SOURCE</span>
            <span className="text-right flex items-center justify-end">
              {headerCell('durationMs', <Icon name="clock" size={13} />, 'justify-end')}
            </span>
            <span />
          </SongTableHeader>
        )}
      </div>

      {/* Main content list/grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + mode + view + sourceFilter + downloadedOnly}
          className="flex flex-col gap-0.5 px-4 @[480px]:px-8 pb-8 overflow-auto"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {loading ? (
            <div className="flex flex-col gap-2 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="srow h-14 bg-s2/30 rounded" />
              ))}
            </div>
          ) : guestTab ? (
            <EmptyState
              icon="heart"
              title="This lives in your account"
              description="Create a free account to keep favourites, play history, albums and artists — on every device."
              action={
                <span className="flex gap-2">
                  <Link to="/signin" state={{ mode: 'signup' }} className="no-underline"><Button variant="acc">Create account</Button></Link>
                  <Link to="/signin" state={{ mode: 'signin' }} className="no-underline"><Button variant="out">Sign in</Button></Link>
                </span>
              }
            />
          ) : isOffline && (activeTab === 'Albums' || activeTab === 'Artists') ? (
            local.tracks.length === 0 ? (
              <EmptyState icon="folder" title="Nothing on this device" description="Add a music folder or download songs while online" />
            ) : (
              <div className="flex gap-4 flex-wrap">
                {groupLocal(activeTab === 'Albums' ? 'album' : 'artist').map(([name, group], i) => (
                  <Card
                    key={name}
                    title={name}
                    subtitle={`${group.length} ${group.length === 1 ? 'song' : 'songs'}`}
                    artVariant={`a${(i % 12) + 1}` as any}
                    thumbnail={group.find(t => t.thumbnail)?.thumbnail}
                    onPlay={() => playTrack(group[0], group)}
                  />
                ))}
              </div>
            )
          ) : activeTab === 'Albums' ? (
            <div className="flex gap-4 flex-wrap">
              {albumsLoading ? (
                <div className="flex gap-4 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="acard w-[160px] h-[210px] bg-s2/40 rounded-md" />
                  ))}
                </div>
              ) : (albumsData?.items || []).length === 0 ? (
                <EmptyState
                  icon="disc"
                  title="No saved albums"
                  description="Favourite an album to see it in your library"
                />
              ) : (
                albumsData?.items.map((album, i) => (
                  <Card
                    key={album.id}
                    title={album.title}
                    subtitle={album.artist}
                    artVariant={`a${(i % 12) + 1}` as any}
                    thumbnail={album.thumbnail || `/api/v1/albums/${album.id}/artwork?size=140`}
                    to={`/album/${album.id}`}
                  />
                ))
              )}
            </div>
          ) : activeTab === 'Artists' ? (
            <div className="flex gap-4 flex-wrap">
              {artistsLoading ? (
                <div className="flex gap-4 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-[160px] h-[160px] bg-s2/40 rounded-full" />
                  ))}
                </div>
              ) : (artistsData?.items || []).length === 0 ? (
                <EmptyState
                  icon="mic"
                  title="No followed artists"
                  description="Follow artists to see them here"
                />
              ) : (
                artistsData?.items.map((artist, i) => (
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
                ))
              )}
            </div>
          ) : activeTab === 'Folders' ? (
            <div className="flex flex-col gap-2">
              {(foldersData || []).map(folder => (
                <div key={folder.id} className="surf2 flex flex-col gap-3 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className={cn('icobox', folder.included ? 'icobox-acc' : '')}>
                      <Icon name="folder" size={16} />
                    </span>
                    <div className="flex flex-col grow min-w-0">
                      <span className="text-title-l text-t1 truncate">{folder.name}</span>
                      <span className="text-body-s text-t3 truncate">{folder.path}</span>
                      <span className="text-body-s text-t3 mt-0.5">
                        {folder.trackCount} tracks · {formatBytes(folder.bytes)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'Genres' ? (
            <div className="grid grid-cols-2 @[720px]:grid-cols-4 gap-3">
              {['Ambient', 'Electronica', 'Post-rock', 'Indie', 'Jazz', 'Classical', 'Hip-hop', 'Folk'].map((cat, i) => (
                <Link
                  key={cat}
                  to={`/search?q=${encodeURIComponent(cat)}`}
                  className="gcard text-left cursor-pointer relative overflow-hidden no-underline"
                >
                  <Artwork variant={`a${(i % 12) + 1}` as any} size={56} radius="md" className="absolute top-2 right-2" />
                  <span className="text-title-l text-t1 relative">{cat}</span>
                </Link>
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <EmptyState
              icon="music"
              title="No songs found"
              description="Add songs or go online to browse catalog"
            />
          ) : view === 'grid' ? (
            <div className="flex gap-4 flex-wrap">
              {tracks.map((track, i) => (
                <Card
                  key={track.id}
                  title={track.title}
                  subtitle={track.artist}
                  artVariant={`a${(i % 12) + 1}` as any}
                  thumbnail={trackArtwork(track, 140)}
                  to={track.albumId ? `/album/${track.albumId}` : undefined}
                  onPlay={() => playTrack(track, tracks)}
                />
              ))}
            </div>
          ) : (
            tracks.map((track, i) => (
              <SongRow
                key={track.id}
                track={track}
                index={i + 1}
                isActive={currentTrack?.id === track.id}
                onClick={() => playTrack(track, tracks)}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
