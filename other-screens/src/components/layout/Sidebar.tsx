import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { cn } from '../../lib/utils'
import { useModeStore } from '../../store/modeStore'
import Icon from '../ui/Icon'
import { IconButton } from '../ui/Button'
import Artwork from '../music/Artwork'
import { MOCK_PLAYLISTS } from '../../data/mock'
import type { Playlist } from '../../data/types'

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
] as const

function playlistIcon(kind: Playlist['kind']) {
  if (kind === 'local') return { icon: 'smartphone' as const, cls: 'text-gold' }
  if (kind === 'synced') return { icon: 'sync' as const, cls: 'text-blue' }
  return { icon: 'cloud' as const, cls: 'text-acc' }
}

const artVariants = ['a1', 'a5', 'a3', 'a6', 'a2', 'a4'] as const

export default function Sidebar() {
  const location = useLocation()
  const { mode } = useModeStore()

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  return (
    <aside className="side">
      <div className="flex items-center gap-2.5 flex-none border-b border-ln h-16 px-[18px]">
        <span className="flex items-center justify-center flex-none rounded-[9px] bg-acc text-black w-7 h-7">
          <Icon name="music" size={16} />
        </span>
        <span className="flex flex-col grow gap-0">
          <span className="text-title-l text-t1 tracking-tight">Sonare</span>
        </span>
        <IconButton icon="minimize" label="Collapse sidebar" size={28} />
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

      <div className="flex flex-col flex-none pt-3 px-2.5 pb-1.5 gap-0.5">
        <span className="text-overline text-t3 px-3 pb-2">Library</span>
        {LIBRARY_ITEMS.map(item => (
          <Link
            key={item.label}
            to={item.to}
            className={cn('sitem', isActive(item.to.split('?')[0]) && item.label === 'Songs' && location.search === '' && 'on')}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        ))}
      </div>

      <hr className="hr mx-4 my-1" />

      <div className="flex flex-col grow py-3 px-2.5 gap-0.5 overflow-hidden">
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-overline text-t3">Playlists</span>
          <IconButton icon="plus" label="New playlist" size={28} />
        </div>

        {MOCK_PLAYLISTS.map((pl, i) => {
          const { icon, cls } = playlistIcon(pl.kind)
          return (
            <Link
              key={pl.id}
              to={`/playlist/${pl.id}`}
              className="sitem h-11"
            >
              <Artwork variant={artVariants[i % artVariants.length]} size={30} radius="xs" />
              <span className="flex flex-col grow gap-px min-w-0">
                <span className="text-label-l text-t1 truncate">{pl.name}</span>
                <span className="text-label-s text-t3 truncate capitalize">{pl.kind} · {pl.trackCount}</span>
              </span>
              <span className={cn('flex-none', cls)}>
                <Icon name={icon} size={14} />
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-col flex-none p-3 border-t border-ln">
        <div className={cn('onstrip', mode === 'offline' && 'offstrip')}>
          <span className={cn('dot', mode === 'online' ? 'dot-acc' : 'dot-gold')} />
          <span className="flex flex-col grow gap-px">
            <span className={cn('text-label-s font-medium tracking-[0.4px]', mode === 'online' ? 'text-acc' : 'text-gold')}>
              {mode === 'online' ? 'ONLINE · SYNCED' : 'OFFLINE MODE'}
            </span>
            <span className="text-label-s text-t3">
              {mode === 'online' ? 'Last sync 3 min ago' : 'Local files only'}
            </span>
          </span>
        </div>
      </div>
    </aside>
  )
}
