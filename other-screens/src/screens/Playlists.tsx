import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { useMyPlaylists, notifyPlaylistsChanged, useAuth } from '../data/hooks'
import { requireAccount } from '../data/accountGate'
import { api } from '../data/api'
import { showToast } from '../store/toastStore'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { staggerContainer, staggerItem, transition } from '../lib/motion'
import type { Playlist } from '../data/types'

export default function Playlists() {
  const { mode } = useModeStore()
  const isOffline = mode === 'offline'
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: playlistsData, loading: playlistsLoading } = useMyPlaylists()

  const rawPlaylists: Playlist[] = playlistsData?.items || []
  const playlists = isOffline
    ? rawPlaylists.filter(p => p.kind === 'local' || p.downloadedCount > 0)
    : rawPlaylists

  const handleCreatePlaylist = () =>
    requireAccount('Create a free account to make playlists.', createPlaylist)

  const createPlaylist = async () => {
    const name = window.prompt('Enter playlist name:')
    if (name?.trim()) {
      try {
        const created = await api.createPlaylist({ name: name.trim(), kind: 'synced' })
        notifyPlaylistsChanged()
        navigate(`/playlist/${created.id}`)
      } catch (e: any) {
        showToast({ title: 'Could not create playlist', description: e?.message, icon: 'info' })
      }
    }
  }

  const artVariants = ['a1', 'a5', 'a3', 'a6', 'a2', 'a4', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12'] as const

  return (
    <motion.div
      className="@container flex flex-col gap-6 p-4 @[480px]:p-8 pb-8 overflow-auto h-full"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header section */}
      <motion.div
        className="flex flex-col @[480px]:flex-row @[480px]:items-center justify-between gap-4"
        variants={staggerItem}
        transition={transition.normal}
      >
        <div className="flex flex-col gap-1">
          <span className="text-display-m text-t1 font-semibold">Playlists</span>
          <span className="text-body-m text-t2">
            {playlists.length + 1} playlists {isOffline ? 'available offline' : 'in your collection'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="acc" icon="plus" onClick={handleCreatePlaylist}>
            New playlist
          </Button>
        </div>
      </motion.div>

      {/* Guest banner if unauthenticated and online */}
      {!user && !isOffline && (
        <motion.div className="onstrip gap-3" variants={staggerItem} transition={transition.normal}>
          <Icon name="info" size={16} className="text-acc flex-none" />
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-acc">Create and sync playlists</span>
            <span className="text-body-s text-t2">Sign in or create an account to organize your music library into custom playlists.</span>
          </span>
          <Link to="/signin" state={{ mode: 'signup' }} className="no-underline"><Button variant="acc" size="sm">Create account</Button></Link>
          <Link to="/signin" state={{ mode: 'signin' }} className="no-underline"><Button variant="out" size="sm">Sign in</Button></Link>
        </motion.div>
      )}

      {/* Responsive Grid of Playlist Cards */}
      <motion.div
        className="grid grid-cols-2 @[640px]:grid-cols-3 @[960px]:grid-cols-4 @[1200px]:grid-cols-5 gap-4 pt-2"
        variants={staggerItem}
        transition={transition.normal}
      >
        {/* Liked Songs Card (Always First) */}
        <Link
          to="/library?view=favourites"
          className="acard surf2 p-3.5 rounded-xl no-underline text-inherit flex flex-col gap-3 group hover:border-ln3 transition-colors"
        >
          <div className="aspect-square w-full rounded-lg bg-gradient-to-br from-[#4A3B89] to-[#1E123F] flex items-center justify-center relative overflow-hidden shadow-lg">
            <Icon name="heart" size={36} className="text-acc" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-title-m font-semibold text-t1 truncate">Liked Songs</span>
            <span className="text-body-s text-t2 truncate">Auto playlist</span>
            <div className="mt-1">
              <span className="badge bg-neutral text-[10px]">FAVOURITES</span>
            </div>
          </div>
        </Link>

        {/* User / Catalog Playlists */}
        {playlistsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surf2 p-3.5 rounded-xl flex flex-col gap-3 animate-pulse">
              <div className="aspect-square w-full bg-s2/40 rounded-lg" />
              <div className="h-4 bg-s2/40 rounded w-3/4" />
              <div className="h-3 bg-s2/40 rounded w-1/2" />
            </div>
          ))
        ) : (
          playlists.map((playlist, i) => {
            const artVariant = artVariants[i % artVariants.length]
            return (
              <Link
                key={playlist.id}
                to={`/playlist/${playlist.id}`}
                className="acard surf2 p-3.5 rounded-xl no-underline text-inherit flex flex-col gap-3 group hover:border-ln3 transition-colors"
              >
                <div className="aspect-square w-full rounded-lg relative overflow-hidden shadow-lg">
                  <Artwork
                    src={playlist.thumbnail}
                    variant={artVariant}
                    size={240}
                    radius="sm"
                    rings
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-title-m font-semibold text-t1 truncate group-hover:text-acc transition-colors">
                    {playlist.name}
                  </span>
                  <span className="text-body-s text-t2 truncate">
                    {playlist.trackCount ? `${playlist.trackCount} songs` : 'Playlist'}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {playlist.kind === 'local' ? (
                      <span className="badge bg-local text-[10px] inline-flex items-center gap-1">
                        <Icon name="smartphone" size={8} />
                        <span>ON DEVICE</span>
                      </span>
                    ) : playlist.kind === 'synced' ? (
                      <span className="badge bg-dl text-[10px] inline-flex items-center gap-1">
                        <Icon name="sync" size={8} />
                        <span>SYNCED</span>
                      </span>
                    ) : (
                      <span className="badge bg-cloud text-[10px] inline-flex items-center gap-1">
                        <Icon name="cloud" size={8} />
                        <span>ONLINE</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </motion.div>
    </motion.div>
  )
}
