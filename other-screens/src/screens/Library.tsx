import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { 
  useLibraryTracks, 
  useFavourites, 
  useMostPlayed, 
  useLibraryAlbums, 
  useLibraryArtists, 
  useFolders,
  useTrending
} from '../data/hooks'
import SongRow from '../components/music/SongRow'
import { Card } from '../components/ui/Card'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { Chip } from '../components/ui/ChipBadge'
import { EmptyState } from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import { staggerContainer, transition } from '../lib/motion'
import { cn, formatBytes } from '../lib/utils'
import type { Track } from '../data/types'

const TABS = ['Songs', 'Albums', 'Artists', 'Genres', 'Folders', 'Favourites', 'Most played'] as const
type Tab = typeof TABS[number]

export default function Library() {
  const { mode } = useModeStore()
  const { currentTrack, playTrack } = usePlayerStore()
  const [activeTab, setActiveTab] = useState<Tab>('Songs')
  const isOffline = mode === 'offline'

  const { data: libraryTracksData, loading: libLoading } = useLibraryTracks()
  const { data: favsData, loading: favsLoading } = useFavourites()
  const { data: mostPlayedData, loading: mostLoading } = useMostPlayed()
  const { data: albumsData, loading: albumsLoading } = useLibraryAlbums()
  const { data: artistsData, loading: artistsLoading } = useLibraryArtists()
  const { data: foldersData, loading: foldersLoading } = useFolders()
  const { data: trendingData } = useTrending('IN', 20)

  let tracks: Track[] = []
  let loading = false

  if (activeTab === 'Songs') {
    tracks = libraryTracksData?.items && libraryTracksData.items.length > 0 
      ? libraryTracksData.items 
      : (trendingData?.items || [])
    loading = libLoading
  } else if (activeTab === 'Favourites') {
    tracks = favsData?.items || []
    loading = favsLoading
  } else if (activeTab === 'Most played') {
    tracks = mostPlayedData?.items || []
    loading = mostLoading
  }

  if (isOffline) {
    tracks = tracks.filter(t => t.source === 'local')
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

  return (
    <div className="flex flex-col gap-7 overflow-hidden h-full">
      <div className="flex flex-col gap-6 px-8 pt-6 flex-none">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-display-m text-t1">Your Library</span>
            <span className="text-body-m text-t2">
              {activeTab === 'Songs' || activeTab === 'Favourites' || activeTab === 'Most played'
                ? `${tracks.length.toLocaleString()} songs · sorted by recently added`
                : activeTab}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link to="/folders" className="btn btn-out"><Icon name="folder" size={15} />Manage folders</Link>
            <Button variant="out" icon="shuffle" onClick={handleShuffle} disabled={tracks.length === 0}>Shuffle all</Button>
            <Button variant={isOffline ? 'gold' : 'acc'} icon="play" onClick={handlePlayAll} disabled={tracks.length === 0}>Play all</Button>
          </div>
        </div>

        <div className="tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={cn('tab', activeTab === tab && 'on')}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
          <span className="grow min-w-0" />
          <Chip size="sm" icon="clock" suffixIcon="chevron-down">
            Recently added
          </Chip>
          <div className="flex items-center gap-0.5 ml-2">
            <IconButton icon="list" label="List view" size={28} active />
            <IconButton icon="layout-grid" label="Grid view" size={28} />
          </div>
        </div>

        {(activeTab === 'Songs' || activeTab === 'Favourites' || activeTab === 'Most played') && (
          <div className="grid gap-4 items-center text-label-s text-t3 pb-2.5 border-b border-ln grid-cols-[30px_44px_minmax(0,2.4fr)_minmax(0,1.7fr)_116px_64px_58px_78px] px-3">
            <span className="text-right">#</span>
            <span />
            <span>TITLE</span>
            <span>ALBUM</span>
            <span>SOURCE</span>
            <span className="text-right">PLAYS</span>
            <span className="flex justify-end"><Icon name="clock" size={13} /></span>
            <span />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + mode}
          className="flex flex-col gap-0.5 px-8 pb-8 overflow-auto"
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
            <div className="grid grid-cols-4 gap-3">
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
          ) : (
            tracks.map((track, i) => (
              <SongRow
                key={track.id}
                track={track}
                index={i + 1}
                isActive={currentTrack?.id === track.id}
                isPlaying={currentTrack?.id === track.id}
                onClick={() => playTrack(track, tracks)}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
