import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { app, window as neuWindow } from '@neutralinojs/lib'
import { Segmented } from '../ui/Segmented'
import { cn } from '../../lib/utils'
import { CAPS } from '../../lib/caps'
import { useModeStore } from '../../store/modeStore'
import Icon from '../ui/Icon'
import Button, { IconButton } from '../ui/Button'
import { Field } from '../ui/Field'
import { syncNow } from '../../data/sync'
import { useAuth } from '../../data/hooks'
import type { Mode } from '../../data/types'

async function toggleMaximize() {
  if (await neuWindow.isMaximized()) await neuWindow.unmaximize()
  else await neuWindow.maximize()
}

export default function Topbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { mode, setMode } = useModeStore()
  const searchRef = useRef<HTMLInputElement>(null)
  const [syncing, setSyncing] = useState(false)
  const { user } = useAuth()

  // The search query lives in the URL (/search?q=) so this field and the Search screen agree.
  const onSearchPage = location.pathname === '/search'
  const query = onSearchPage ? params.get('q') ?? '' : ''

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    // Keep other search state (e.g. ?addTo= add-to-playlist mode) while typing.
    const next = new URLSearchParams(onSearchPage ? params : undefined)
    if (v) next.set('q', v)
    else next.delete('q')
    const qs = next.toString()
    navigate(qs ? `/search?${qs}` : '/search', { replace: onSearchPage })
  }

  // Ctrl K focuses search from anywhere (FLOWS §3 top bar).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  return (
    <header className="topbar">
      <span className="flex items-center gap-1 flex-none">
        <IconButton icon="chevron-left" label="Back" size={32} onClick={() => navigate(-1)} />
        <IconButton icon="chevron-right" label="Forward" size={32} onClick={() => navigate(1)} />
      </span>

      <Field
        ref={searchRef}
        square
        icon="search"
        shortcut="Ctrl K"
        value={query}
        onChange={handleSearchChange}
        onFocus={() => {
          if (!onSearchPage) navigate('/search')
        }}
        placeholder="Search songs, albums, artists"
        className="flex-none w-[380px] h-[38px]"
        aria-label="Search"
      />

      <span className="grow min-w-0" />

      {CAPS.offlineMode && (
        <>
          <Segmented
            options={[
              { id: 'online', label: 'Online', icon: 'cloud' },
              { id: 'offline', label: 'Offline', icon: 'smartphone' }
            ]}
            value={mode}
            onChange={(m) => handleModeSwitch(m as Mode)}
            color={mode === 'offline' ? 'gold' : 'acc'}
          />

          <span className="vr flex-none h-6" />
        </>
      )}

      {/* Guests have no account library to sync. */}
      {user && (
        <IconButton
          icon="sync"
          label={syncing ? 'Syncing…' : 'Sync now'}
          size={32}
          onClick={handleSync}
          disabled={syncing || mode === 'offline'}
          className={cn(syncing && '[&_svg]:animate-spin')}
        />
      )}
      <Link to="/settings" className="ib ib-32 flex-none" aria-label="Settings">
        <Icon name="settings" size={16} />
      </Link>

      {user ? (
        <button className="ib ib-32 flex-none p-0" aria-label="Your profile" title={user.displayName} onClick={() => navigate('/settings')}>
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-acc text-black text-label-l font-semibold">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        </button>
      ) : (
        <Button variant="acc" size="sm" onClick={() => navigate('/signin', { state: { mode: 'signin' } })}>
          Sign in
        </Button>
      )}

      {CAPS.windowControls && (
        <>
          <span className="vr flex-none h-6" />

          <span className="wctl flex-none">
            <button aria-label="Minimize" onClick={() => void neuWindow.minimize()}><Icon name="minus" size={14} /></button>
            <button aria-label="Maximize" onClick={() => void toggleMaximize()}><Icon name="maximize" size={14} /></button>
            <button className="cls" aria-label="Close" onClick={() => void app.exit()}><Icon name="close" size={14} /></button>
          </span>
        </>
      )}
    </header>
  )
}
