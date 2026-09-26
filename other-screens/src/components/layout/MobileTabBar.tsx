import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import Icon from '../ui/Icon'

const MOBILE_TABS = [
  { to: '/home', icon: 'home' as const, label: 'Home' },
  { to: '/library', icon: 'library' as const, label: 'Library' },
  { to: '/playlists', icon: 'playlist' as const, label: 'Playlists' },
  { to: '/search', icon: 'search' as const, label: 'Search' },
] as const

export default function MobileTabBar() {
  const location = useLocation()

  function isActive(to: string) {
    if (to === '/home') return location.pathname === '/home'
    if (to === '/library') return location.pathname.startsWith('/library')
    if (to === '/playlists') return location.pathname.startsWith('/playlist')
    if (to === '/search') return location.pathname.startsWith('/search')
    return false
  }

  return (
    <nav className="flex items-stretch h-16 bg-[#060607]/95 border-t border-ln flex-none pb-[env(safe-area-inset-bottom)] z-20">
      {MOBILE_TABS.map(tab => {
        const active = isActive(tab.to)
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 no-underline transition-colors',
              active ? 'text-acc' : 'text-t3 hover:text-t1'
            )}
          >
            <Icon name={tab.icon} size={21} />
            <span className={cn('text-[10px] font-semibold tracking-[0.3px]', active ? 'text-acc' : 'text-t3')}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
