import React, { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Segmented } from '../ui/Segmented'
import { cn } from '../../lib/utils'
import { useModeStore } from '../../store/modeStore'
import Icon from '../ui/Icon'
import { IconButton } from '../ui/Button'
import { Field } from '../ui/Field'
import Artwork from '../music/Artwork'
import { transition } from '../../lib/motion'
import type { Mode } from '../../data/types'

interface TopbarProps {
  searchValue?: string
  onSearchChange?: (v: string) => void
}

export default function Topbar({ searchValue = '', onSearchChange }: TopbarProps) {
  const navigate = useNavigate()
  const { mode, setMode } = useModeStore()
  const [localSearch, setLocalSearch] = useState(searchValue)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setLocalSearch(v)
    onSearchChange?.(v)
    if (v.length > 0) navigate('/search')
  }, [navigate, onSearchChange])

  function handleModeSwitch(target: Mode) {
    if (target === mode) return
    if (target === 'offline') {
      navigate('/mode-switch')
    } else {
      setMode('online')
    }
  }

  return (
    <header className="topbar">
      <span className="flex items-center gap-1 flex-none">
        <IconButton icon="chevron-left" label="Back" size={32} />
        <IconButton icon="chevron-right" label="Forward" size={32} />
      </span>

      <Field
        square
        icon="search"
        shortcut="Ctrl K"
        value={localSearch}
        onChange={handleSearchChange}
        placeholder="Search songs, albums, artists"
        className="flex-none w-[380px] h-[38px]"
        aria-label="Search"
      />

      <span className="grow min-w-0" />

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

      <IconButton icon="sync" label="Sync status" size={32} />
      <Link to="/settings" className="ib ib-32 flex-none" aria-label="Settings">
        <Icon name="settings" size={16} />
      </Link>

      <button className="ib ib-32 flex-none p-0" aria-label="Your profile">
        <Artwork variant="a5" size={26} radius="circ" />
      </button>

      <span className="vr flex-none h-6" />

      <span className="wctl flex-none">
        <button aria-label="Minimize"><Icon name="minus" size={14} /></button>
        <button aria-label="Maximize"><Icon name="maximize" size={14} /></button>
        <button className="cls" aria-label="Close"><Icon name="close" size={14} /></button>
      </span>
    </header>
  )
}
