import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Segmented } from '../ui/Segmented'
import { cn } from '../../lib/utils'
import { CAPS } from '../../lib/caps'
import { useModeStore } from '../../store/modeStore'
import Icon from '../ui/Icon'
import Button, { IconButton } from '../ui/Button'
import SearchField from './SearchField'
import { syncNow } from '../../data/sync'
import { useAuth } from '../../data/hooks'
import type { Mode } from '../../data/types'

const WEB_NAV_ITEMS = [
  { to: '/home', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/playlist', label: 'Playlists' },
  { to: '/search', label: 'Search' },
] as const

export default function WebTopbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, setMode } = useModeStore()
  const [syncing, setSyncing] = useState(false)
  const { user } = useAuth()

  function handleModeSwitch(target: Mode) {
    if (target === mode) return
    if (target === 'offline') {
      navigate('/mode-switch')
    } else {
      setMode('online')
    }
  }

  async function handleSync() {
    setSyncing(true)
    await syncNow()
    setSyncing(false)
  }

  function isNavActive(to: string) {
    if (to === '/home') return location.pathname === '/home'
    if (to === '/library') return location.pathname.startsWith('/library')
    if (to === '/playlist') return location.pathname.startsWith('/playlist')
    if (to === '/search') return location.pathname.startsWith('/search')
    return false
  }

  return (
    <header className="flex items-center gap-6 flex-none h-16 px-7 border-b border-ln bg-[#060607]/90 z-20">
      <Link to="/home" className="flex items-center gap-2.5 flex-none no-underline text-inherit">
        <span className="flex items-center justify-center flex-none w-7 h-7 rounded-[9px] bg-acc text-black">
          <Icon name="music" size={16} />
        </span>
        <span className="text-title-l text-t1 tracking-tight">Sonare</span>
      </Link>

      <nav className="flex items-center gap-0.5 flex-none h-full">
        {WEB_NAV_ITEMS.map(item => {
          const active = isNavActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex items-center h-full px-3.5 text-body-m font-medium no-underline transition-colors',
                active ? 'text-t1' : 'text-t2 hover:text-t1'
              )}
            >
              {item.label}
              {active && (
                <span className="absolute left-2.5 right-2.5 bottom-[-1px] h-[2px] bg-acc rounded-t-sm" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="flex grow justify-center max-w-[420px]">
        <SearchField shortcut="/" enableSlashShortcut enableCtrlKShortcut />
      </div>

      <span className="grow min-w-0" />

      {CAPS.offlineMode && (
        <Segmented
          options={[
            { id: 'online', label: 'Online', icon: 'cloud' },
            { id: 'offline', label: 'Offline', icon: 'smartphone' }
          ]}
          value={mode}
          onChange={(m) => handleModeSwitch(m as Mode)}
          color={mode === 'offline' ? 'gold' : 'acc'}
        />
      )}

      <div className="flex items-center gap-1 flex-none">
        {user ? (
          <IconButton
            icon="sync"
            label={syncing ? 'Syncing…' : 'Sync status'}
            size={32}
            onClick={handleSync}
            disabled={syncing || mode === 'offline'}
            className={cn(syncing && '[&_svg]:animate-spin')}
          />
        ) : null}

        <IconButton
          icon="settings"
          label="Settings"
          size={32}
          onClick={() => navigate('/settings')}
        />

        {!user ? (
          <Button variant="acc" size="sm" onClick={() => navigate('/signin', { state: { mode: 'signin' } })}>
            Sign in
          </Button>
        ) : (
          <button
            className="ib ib-32 flex-none p-0"
            aria-label="Your profile"
            data-tip={`${user.displayName} · Profile`}
            onClick={() => navigate('/settings')}
          >
            <span className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-acc text-black text-label-l font-semibold">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          </button>
        )}
      </div>
    </header>
  )
}
