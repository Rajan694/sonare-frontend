import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon, { type IconName } from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { Segmented } from '../components/ui/Segmented'
import { cn } from '../lib/utils'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { showToast } from '../store/toastStore'
import { useSettings, updateSettings, type UserSettings } from '../data/settings'
import { useAuth } from '../data/hooks'
import { signOut } from '../data/auth'
import { syncNow } from '../data/sync'

const QUALITIES: { id: UserSettings['downloadQuality']; label: string }[] = [
  { id: 'low', label: 'Low (data saver)' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
  { id: 'lossless', label: 'Best available' },
]

function Row({ icon, label, desc, danger, children }: {
  icon: IconName
  label: string
  desc?: string
  danger?: boolean
  children?: React.ReactNode
}) {
  return (
    <>
      <span className={cn('icobox', danger && 'bg-red/10 text-red')}><Icon name={icon} size={16} /></span>
      <span className="flex flex-col grow min-w-0">
        <span className={cn('text-body-m', danger ? 'text-red' : 'text-t1')}>{label}</span>
        {desc && <span className="text-body-s text-t3 truncate">{desc}</span>}
      </span>
      {children}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-overline text-t3 pb-1">{title}</span>
      <div className="surf2 flex flex-col divide-y divide-ln2">{children}</div>
    </div>
  )
}

const chevron = <Icon name="chevron-right" size={16} className="text-t4 flex-none" />

export default function SettingsScreen() {
  const navigate = useNavigate()
  const settings = useSettings()
  const { mode, setMode } = useModeStore()
  const { user } = useAuth()

  async function handleSignOut() {
    await signOut()
    showToast({ title: 'Signed out', icon: 'logout' })
    navigate('/signin')
  }

  return (
    <div className="flex flex-col p-8 gap-6 overflow-auto h-full">
      <span className="text-h1 text-t1">Settings</span>

      <Section title="Audio & Playback">
        <Link to="/equalizer" className="lrow no-underline">
          <Row icon="sliders" label="Equalizer & Audio" desc="EQ, bass boost, virtualizer, speed">{chevron}</Row>
        </Link>
        <div className="lrow">
          <Row icon="music" label="Streaming quality" desc="Applies from the next track" />
          <select
            className="chip text-t1 bg-s2 border-ln2 appearance-none"
            aria-label="Streaming quality"
            value={settings.downloadQuality}
            onChange={e => updateSettings({ downloadQuality: e.target.value as UserSettings['downloadQuality'] })}
          >
            {QUALITIES.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
          </select>
        </div>
        <label className="lrow cursor-pointer">
          <Row icon="music2" label="Gapless playback" desc="Seamless album transitions" />
          <Switch checked={settings.gapless} onCheckedChange={gapless => updateSettings({ gapless })} aria-label="Toggle gapless playback" />
        </label>
        <label className="lrow cursor-pointer">
          <Row icon="volume" label="Volume normalization" desc="Evens out loud and quiet tracks" />
          <Switch checked={settings.normalization} onCheckedChange={normalization => updateSettings({ normalization })} aria-label="Toggle volume normalization" />
        </label>
      </Section>

      {CAPS.offlineMode && (
        <Section title="Connection">
          <div className="lrow">
            <Row icon={mode === 'online' ? 'cloud' : 'smartphone'} label="Mode" desc={mode === 'online' ? 'Streaming from Sonare' : 'Music on this device only'} />
            <Segmented
              options={[
                { id: 'online', label: 'Online', icon: 'cloud' },
                { id: 'offline', label: 'Offline', icon: 'smartphone' },
              ]}
              value={mode}
              onChange={m => {
                // Going offline is confirmed first (FLOWS 1.1); going online is immediate.
                if (m === mode) return
                if (m === 'offline') navigate('/mode-switch')
                else setMode('online')
              }}
              color={mode === 'offline' ? 'gold' : 'acc'}
            />
          </div>
          <label className="lrow cursor-pointer">
            <Row icon="wifi-off" label="Stay offline" desc="Start in Offline mode until I switch back" />
            <Switch variant="gold" checked={settings.stayOffline} onCheckedChange={stayOffline => updateSettings({ stayOffline })} aria-label="Stay offline" />
          </label>
        </Section>
      )}

      <Section title="Library">
        {CAPS.localLibrary && (
          <Link to="/folders" className="lrow no-underline">
            <Row icon="folder" label="Local folders" desc="Manage scanned folders">{chevron}</Row>
          </Link>
        )}
        <button className="lrow w-full text-left bg-transparent border-0 cursor-pointer" onClick={() => void syncNow()} disabled={mode === 'offline'}>
          <Row icon="sync" label="Sync now" desc="Push plays and favourites, refresh playlists" />
        </button>
      </Section>

      <Section title="Appearance">
        <div className="lrow">
          <Row icon="moon" label="Theme" desc="Dark (always on)" />
        </div>
      </Section>

      <Section title="Account">
        {user && (
          <div className="lrow">
            <Row icon="info" label={user.displayName || 'Signed in'} desc={user.email} />
          </div>
        )}
        <div className="lrow">
          <Row icon="info" label="About Sonare" desc="Version 1.0.0" />
        </div>
        {user ? (
          <button className="lrow w-full text-left bg-transparent border-0 cursor-pointer" onClick={handleSignOut}>
            <Row icon="logout" label="Sign out" danger />
          </button>
        ) : (
          <Link to="/signin" className="lrow no-underline">
            <Row icon="logout" label="Sign in" desc="Sync playlists, favourites and history">{chevron}</Row>
          </Link>
        )}
      </Section>
    </div>
  )
}
