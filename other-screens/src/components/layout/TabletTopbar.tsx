import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Segmented } from '../ui/Segmented'
import { CAPS } from '../../lib/caps'
import { useModeStore } from '../../store/modeStore'
import { BrandMark } from '../ui/BrandMark'
import Button from '../ui/Button'
import SearchField from './SearchField'
import { useAuth } from '../../data/hooks'
import type { Mode } from '../../data/types'

export default function TabletTopbar() {
  const navigate = useNavigate()
  const { mode, setMode } = useModeStore()
  const { user } = useAuth()

  function handleModeSwitch(target: Mode) {
    if (target === mode) return
    if (target === 'offline') {
      navigate('/mode-switch')
    } else {
      setMode('online')
    }
  }

  return (
    <header className="flex items-center gap-4 flex-none h-[60px] px-5 border-b border-ln bg-[#060607]/90 z-20">
      <Link to="/home" className="flex items-center gap-2.5 flex-none no-underline text-inherit">
        <BrandMark size={26} className="flex-none" />
        <span className="text-title-l text-t1 tracking-tight">Sonare</span>
      </Link>

      <div className="flex grow min-w-0">
        <SearchField shortcut="/" enableSlashShortcut enableCtrlKShortcut className="h-[36px]" />
      </div>

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
        {!user ? (
          <Button variant="acc" size="sm" onClick={() => navigate('/signin', { state: { mode: 'signin' } })}>
            Sign in
          </Button>
        ) : (
          <button
            className="ib ib-32 flex-none p-0"
            aria-label="Profile"
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
