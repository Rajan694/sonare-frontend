import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Segmented } from '../ui/Segmented'
import { CAPS } from '../../lib/caps'
import { useModeStore } from '../../store/modeStore'
import Icon from '../ui/Icon'
import Button, { IconButton } from '../ui/Button'
import { syncNow } from '../../data/sync'
import { useAuth } from '../../data/hooks'
import type { Mode } from '../../data/types'
import { useAppDispatch, useAppSelector } from '../../store'
import SearchField from './SearchField'

export default function Topbar() {
  const navigate = useNavigate()
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

  return (
    <header className="topbar">
      <span className="flex items-center gap-1 flex-none">
        <IconButton icon="chevron-left" label="Back" size={32} onClick={() => navigate(-1)} />
        <IconButton icon="chevron-right" label="Forward" size={32} onClick={() => navigate(1)} />
      </span>

      <div className="flex-none w-[380px]">
        <SearchField shortcut="Ctrl K" enableSlashShortcut={false} enableCtrlKShortcut={true} />
      </div>

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
          className={syncing ? '[&_svg]:animate-spin' : undefined}
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
