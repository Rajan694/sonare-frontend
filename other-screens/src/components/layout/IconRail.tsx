import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import Icon from '../ui/Icon'

const RAIL_ITEMS = [
  { to: '/home', icon: 'home' as const, label: 'Home' },
  { to: '/search', icon: 'search' as const, label: 'Search' },
  { to: '/library', icon: 'library' as const, label: 'Library' },
  { to: '/playlist', icon: 'playlist' as const, label: 'Lists' },
  { to: '/settings', icon: 'settings' as const, label: 'Settings' },
] as const

export default function IconRail() {
  const location = useLocation()

  function isActive(to: string) {
    if (to === '/home') return location.pathname === '/home'
    if (to === '/search') return location.pathname.startsWith('/search')
    if (to === '/library') return location.pathname.startsWith('/library')
    if (to === '/playlist') return location.pathname.startsWith('/playlist')
    if (to === '/settings') return location.pathname.startsWith('/settings')
    return false
  }

  return (
    <aside className="flex flex-col items-center justify-center flex-none w-[76px] h-full border-r border-ln py-3.5 px-2.5 gap-1.5 bg-s0">
      {RAIL_ITEMS.map(item => {
        const active = isActive(item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-col items-center justify-center w-14 h-14 rounded-[14px] gap-1 no-underline transition-colors',
              active
                ? 'bg-s3 text-acc shadow-sm'
                : 'text-t3 hover:text-t1 hover:bg-s2/60'
            )}
          >
            <Icon name={item.icon} size={20} />
            <span className={cn('text-label-s', active ? 'text-acc font-medium' : 'text-t3')}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </aside>
  )
}
