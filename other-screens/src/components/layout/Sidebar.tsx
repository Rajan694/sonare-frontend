import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { CAPS } from '../../lib/caps'
import { useModeStore } from '../../store/modeStore'
import { useMyPlaylists, notifyPlaylistsChanged, useAuth } from '../../data/hooks'
import { requireAccount } from '../../data/accountGate'
import { api } from '../../data/api'
import Icon from '../ui/Icon'
import { showToast } from '../../store/toastStore'
import { IconButton } from '../ui/Button'
import Artwork from '../music/Artwork'
import { openPlaylistMenu } from '../music/TrackMenu'
import type { Playlist } from '../../data/types'

interface SidebarProps {
  variant?: 'desktop' | 'web'
}

const NAV_ITEMS = [
  { to: '/home', icon: 'home' as const, label: 'Home' },
  { to: '/search', icon: 'search' as const, label: 'Search' },
  { to: '/library', icon: 'library' as const, label: 'Your Library' },
  { to: '/playlist', icon: 'playlist' as const, label: 'Playlists' },
] as const

const LIBRARY_ITEMS = [
  { to: '/library', icon: 'music' as const, label: 'Songs' },
  { to: '/library?view=albums', icon: 'disc' as const, label: 'Albums' },
  { to: '/library?view=artists', icon: 'mic' as const, label: 'Artists' },
  { to: '/library?view=genres', icon: 'grid' as const, label: 'Genres' },
  { to: '/folders', icon: 'folder' as const, label: 'Folders' },
  { to: '/library?view=favourites', icon: 'heart' as const, label: 'Favourites' },
] as const

function playlistIcon(kind: Playlist['kind']) {
  if (kind === 'local') return { icon: 'smartphone' as const, cls: 'text-gold' }
  if (kind === 'synced') return { icon: 'sync' as const, cls: 'text-blue' }
  return { icon: 'cloud' as const, cls: 'text-acc' }
}

const artVariants = ['a1', 'a5', 'a3', 'a6', 'a2', 'a4'] as const

const LIKED_SONGS = '/library?view=favourites'

export default function Sidebar({ variant = 'desktop' }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { mode } = useModeStore()
  const { data: playlistsData, loading: playlistsLoading } = useMyPlaylists()
  const { user } = useAuth()

  const playlists: Playlist[] = playlistsData?.items || []
  const isWeb = variant === 'web'

  function isActive(to: string) {
    return location.pathname === to || (to !== '/home' && to !== '/library' && location.pathname.startsWith(to + '/'))
  }

  const handleCreatePlaylist = () => requireAccount('Create a free account to make playlists.', createPlaylist)

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

  return (
    <aside className={cn('side', isWeb ? 'w-[236px] p-0' : 'w-[260px]')}>
      {!isWeb && (
        <>
          <div className="flex items-center gap-2.5 flex-none border-b border-ln h-16 px-[18px]">
            <span className="flex items-center justify-center flex-none rounded-[9px] bg-acc text-black w-7 h-7">
              <Icon name="music" size={16} />
            </span>
            <span className="flex flex-col grow gap-0">
              <span className="text-title-l text-t1 tracking-tight">Sonare</span>
            </span>
          </div>

          <div className="flex flex-col flex-none py-3 px-2.5 gap-0.5">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={cn('sitem', isActive(item.to) && 'on')}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            ))}
          </div>

          <hr className="hr mx-4 my-1" />
        </>
      )}

      <div className={cn('flex flex-col flex-none gap-0.5', isWeb ? 'pt-5 px-2.5 pb-1' : 'pt-3 px-2.5 pb-1.5')}>
        <span className="text-overline text-t3 px-3 pb-2">Library</span>
        {LIBRARY_ITEMS.filter(item => {
          if (item.to === '/folders' && !CAPS.localLibrary) return false
          if (!isWeb && item.to === LIKED_SONGS) return false // In desktop, liked songs is pinned under playlists
          return true
        }).map(item => (
          <Link
            key={item.label}
            to={item.to}
            className={cn('sitem', location.pathname + location.search === item.to && 'on')}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        ))}
      </div>

      <hr className={cn('hr my-1', isWeb ? 'mx-2 my-3' : 'mx-4')} />

      <div className="flex flex-col grow py-3 px-2.5 gap-0.5 overflow-hidden">
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-overline text-t3">Playlists</span>
          <IconButton icon="plus" label="New playlist" size={28} onClick={handleCreatePlaylist} />
        </div>

        <div className="flex flex-col gap-0.5 overflow-y-auto grow">
          {!isWeb && (
            <Link
              to={LIKED_SONGS}
              className={cn('sitem h-11', location.pathname + location.search === LIKED_SONGS && 'on')}
            >
              <span className="art-r-xs flex items-center justify-center flex-none w-[30px] h-[30px] bg-accbg text-acc">
                <Icon name="heart" size={15} />
              </span>
              <span className="flex flex-col grow gap-px min-w-0">
                <span className="text-label-l text-t1 truncate">Liked Songs</span>
                <span className="text-label-s text-t3 truncate">Your favourites</span>
              </span>
            </Link>
          )}
          {playlistsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="sitem h-11 animate-pulse bg-s2/30 rounded" />
            ))
          ) : !user ? (
            <Link to="/signin" state={{ mode: 'signup', reason: 'Create a free account to make playlists and sync them across devices.' }} className="text-body-s text-t3 px-3 py-2 no-underline hover:text-t1">
              Sign in to make playlists
            </Link>
          ) : playlists.length === 0 ? (
            <span className="text-body-s text-t3 px-3 py-2">No playlists created</span>
          ) : (
            playlists.map((pl, i) => {
              const { icon, cls } = playlistIcon(pl.kind)
              return (
                <Link
                  key={pl.id}
                  to={`/playlist/${pl.id}`}
                  className="sitem h-11"
                  onContextMenu={e => openPlaylistMenu(pl, e)}
                >
                  <Artwork
                    src={pl.thumbnail || `/api/v1/playlists/${pl.id}/artwork?size=64`}
                    alt={pl.name}
                    variant={artVariants[i % artVariants.length]}
                    size={isWeb ? 28 : 30}
                    radius="xs"
                  />
                  <span className="flex flex-col grow gap-px min-w-0">
                    <span className="text-label-l text-t1 truncate">{pl.name}</span>
                    <span className="text-label-s text-t3 truncate capitalize">
                      {isWeb
                        ? `${pl.trackCount !== null ? `${pl.trackCount} songs` : ''}`
                        : `${pl.kind}${pl.trackCount !== null ? ` · ${pl.trackCount}` : ''}`}
                    </span>
                  </span>
                  <span className={cn('flex-none', cls)}>
                    <Icon name={icon} size={14} />
                  </span>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {!isWeb && (
        <div className="flex flex-col flex-none p-3 border-t border-ln">
          {(!CAPS.offlineMode || mode === 'online') && !user ? (
            <Link to="/signin" state={{ mode: 'signin' }} className="onstrip no-underline">
              <span className="dot dot-acc" />
              <span className="flex flex-col grow gap-px">
                <span className="text-label-s font-medium tracking-[0.4px] text-acc">ONLINE · GUEST</span>
                <span className="text-label-s text-t3">Sign in to sync</span>
              </span>
            </Link>
          ) : (
            <div className={cn('onstrip', CAPS.offlineMode && mode === 'offline' && 'offstrip')}>
              <span className={cn('dot', !CAPS.offlineMode || mode === 'online' ? 'dot-acc' : 'dot-gold')} />
              <span className="flex flex-col grow gap-px">
                <span className={cn('text-label-s font-medium tracking-[0.4px]', !CAPS.offlineMode || mode === 'online' ? 'text-acc' : 'text-gold')}>
                  {!CAPS.offlineMode || mode === 'online' ? 'ONLINE · SYNCED' : 'OFFLINE MODE'}
                </span>
                <span className="text-label-s text-t3">
                  {!CAPS.offlineMode || mode === 'online' ? 'Connected to Sonare' : 'Local files only'}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
