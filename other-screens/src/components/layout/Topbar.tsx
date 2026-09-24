import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { useAppDispatch, useAppSelector } from '../../store'
import { setQuery } from '../../store/searchSlice'

export default function Topbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, setMode } = useModeStore()
  const searchRef = useRef<HTMLInputElement>(null)
  const [syncing, setSyncing] = useState(false)
  const { user } = useAuth()

  // The app's only search field. The query lives in the Redux store, so the Search screen
  // shows it — and keeps its results — however you get back there.
  const dispatch = useAppDispatch()
  const query = useAppSelector(s => s.search.query)
  const onSearchPage = location.pathname === '/search'

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    dispatch(setQuery(v))
    // Searching opens the results. Already there, stay put (keeps ?addTo= add-to-playlist mode).
    if (v.trim() && !onSearchPage) navigate('/search')
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !onSearchPage) navigate('/search')
    // Hand the keyboard back to the player shortcuts.
    else if (e.key === 'Escape') e.currentTarget.blur()
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
        shortcut={query ? undefined : 'Ctrl K'}
        value={query}
        onChange={handleSearchChange}
        onKeyDown={handleSearchKey}
        placeholder="Search songs, albums, artists"
        className="flex-none w-[380px] h-[38px]"
        aria-label="Search"
      >
        {query && (
          <button
            className="ib ib-28 flex-none"
            aria-label="Clear search"
            data-tip="Clear search"
            onClick={() => {
              dispatch(setQuery(''))
              searchRef.current?.focus()
            }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </Field>

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
      {!user && (
        <Button variant="acc" size="sm" onClick={() => navigate('/signin', { state: { mode: 'signin' } })}>
          Sign in
        </Button>
      )}

      {/* Profile and settings are one page, so this is its only way in. */}
      <button
        className="ib ib-32 flex-none p-0"
        aria-label="Profile and settings"
        data-tip={user ? `${user.displayName} · Profile and settings` : 'Profile and settings'}
        onClick={() => navigate('/settings')}
      >
        {user ? (
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-acc text-black text-label-l font-semibold">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        ) : (
          <span className="flex items-center justify-center w-[26px] h-[26px] rounded-full bg-s4 text-t2">
            <Icon name="user" size={15} />
          </span>
        )}
      </button>
    </header>
  )
}
