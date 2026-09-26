import React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon, { type IconName } from '../components/ui/Icon'
import Button from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { Segmented } from '../components/ui/Segmented'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import { useLocalLibrary } from '../data/local'
import { showToast } from '../store/toastStore'
import { useSettings, updateSettings, type UserSettings } from '../data/settings'
import { useAuth } from '../data/hooks'
import { signOut } from '../data/auth'
import { syncNow } from '../data/sync'
import { formatBytes } from '../lib/utils'

const QUALITIES: { id: UserSettings['downloadQuality']; label: string }[] = [
  { id: 'low', label: 'Low (data saver)' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
  { id: 'lossless', label: 'Best available' },
]

interface SectionDef {
  id: string
  label: string
  icon: IconName
  title: string
  description: string
  available: boolean
}

function Row({ icon, label, desc, children }: {
  icon: IconName
  label: string
  desc?: string
  children?: React.ReactNode
}) {
  return (
    <div className="lrow">
      <span className="icobox"><Icon name={icon} size={18} /></span>
      <span className="flex flex-col grow min-w-0 gap-0.5">
        <span className="text-body-m text-t1 font-medium">{label}</span>
        {desc && <span className="text-body-s text-t3 truncate">{desc}</span>}
      </span>
      {children}
    </div>
  )
}

const chevron = <Icon name="chevron-right" size={16} className="text-t4 flex-none" />

export default function SettingsScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const settings = useSettings()
  const { mode, setMode } = useModeStore()
  const { user } = useAuth()
  const local = useLocalLibrary()

  const sections: SectionDef[] = [
    {
      id: 'account',
      label: 'Account',
      icon: 'user',
      title: 'Account',
      description: 'Manage your profile and sign-in status.',
      available: true,
    },
    {
      id: 'playback',
      label: 'Playback',
      icon: 'play',
      title: 'Playback',
      description: 'Audio streaming quality, gaps, and volume normalization.',
      available: true,
    },
    {
      id: 'audio',
      label: 'Audio & effects',
      icon: 'sliders',
      title: 'Audio & effects',
      description: 'Equalizer presets, bass boost, and audio processing.',
      available: true,
    },
    {
      id: 'library',
      label: 'Library & scanning',
      icon: 'folder',
      title: 'Library & scanning',
      description: 'Local folders, rescanning, and synchronization.',
      available: true,
    },
    {
      id: 'connection',
      label: 'Connection mode',
      icon: 'smartphone',
      title: 'Connection mode',
      description: 'Controls what the whole app shows and where playback comes from.',
      available: CAPS.offlineMode,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: 'moon',
      title: 'Appearance',
      description: 'Display and theme settings.',
      available: true,
    },
    {
      id: 'about',
      label: 'About',
      icon: 'info',
      title: 'About',
      description: 'Application details and version information.',
      available: true,
    },
  ]

  const activeSections = sections.filter(s => s.available)
  const currentSectionId = searchParams.get('section') || 'account'
  const currentSection = activeSections.find(s => s.id === currentSectionId) || activeSections[0]

  function setSection(id: string) {
    setSearchParams({ section: id })
  }

  async function handleSignOut() {
    await signOut()
    showToast({ title: 'Signed out', description: "You're listening as a guest", icon: 'logout' })
  }

  const totalLocalBytes = local.folders.reduce((n, f) => n + f.bytes, 0)
  const totalLocalTracks = local.folders.filter(f => f.included).reduce((n, f) => n + f.trackCount, 0)
  const totalFoldersCount = local.folders.length

  const renderAccount = () => (
    <div className="flex flex-col gap-6">
      <div className="surf flex items-center gap-4 p-5 rounded-2xl">
        {user ? (
          <>
            <span className="flex items-center justify-center flex-none w-12 h-12 rounded-full bg-acc text-black text-title-l font-semibold">
              {user.displayName.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="flex flex-col grow min-w-0">
              <span className="text-title-l text-t1 truncate">{user.displayName || 'Signed in'}</span>
              <span className="text-body-s text-t3 truncate">{user.email}</span>
            </span>
            <Button variant="out" icon="logout" onClick={handleSignOut}>Sign out</Button>
          </>
        ) : (
          <>
            <span className="flex items-center justify-center flex-none w-12 h-12 rounded-full bg-s4 text-t2">
              <Icon name="user" size={22} />
            </span>
            <span className="flex flex-col grow min-w-0">
              <span className="text-title-l text-t1">Listening as a guest</span>
              <span className="text-body-s text-t3">Create a free account to sync playlists, favourites and history.</span>
            </span>
            <Button variant="acc" onClick={() => navigate('/signin', { state: { mode: 'signup' } })}>Create account</Button>
            <Button variant="out" onClick={() => navigate('/signin', { state: { mode: 'signin' } })}>Sign in</Button>
          </>
        )}
      </div>
    </div>
  )

  const renderPlayback = () => (
    <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
      <div className="lrow">
        <span className="icobox"><Icon name="music" size={18} /></span>
        <span className="flex flex-col grow min-w-0 gap-0.5">
          <span className="text-body-m text-t1 font-medium">Streaming quality</span>
          <span className="text-body-s text-t3 truncate">Applies from the next track</span>
        </span>
        <select
          className="chip text-t1 bg-s2 border-ln2 appearance-none"
          aria-label="Streaming quality"
          value={settings.downloadQuality}
          onChange={e => updateSettings({ downloadQuality: e.target.value as UserSettings['downloadQuality'] })}
        >
          {QUALITIES.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
        </select>
      </div>
      <label className="cursor-pointer">
        <Row icon="music2" label="Gapless playback" desc="Seamless album transitions">
          <Switch checked={settings.gapless} onCheckedChange={gapless => updateSettings({ gapless })} aria-label="Toggle gapless playback" />
        </Row>
      </label>
      <label className="cursor-pointer">
        <Row icon="volume" label="Volume normalization" desc="Evens out loud and quiet tracks">
          <Switch checked={settings.normalization} onCheckedChange={normalization => updateSettings({ normalization })} aria-label="Toggle volume normalization" />
        </Row>
      </label>
    </div>
  )

  const renderAudio = () => (
    <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
      <Link to="/equalizer" className="no-underline block">
        <Row icon="sliders" label="Equalizer & Audio" desc="EQ presets, bass boost, virtualizer, speed">{chevron}</Row>
      </Link>
    </div>
  )

  const renderLibrary = () => (
    <div className="flex flex-col gap-4">
      <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
        {CAPS.localLibrary && (
          <Link to="/folders" className="no-underline block">
            <Row icon="folder" label="Local music folders" desc="Manage scanned music folders on this device">{chevron}</Row>
          </Link>
        )}
        <button
          className="w-full text-left bg-transparent border-0 cursor-pointer p-0"
          onClick={() => void syncNow()}
          disabled={mode === 'offline'}
        >
          <Row icon="sync" label="Sync now" desc="Push plays and favourites, refresh playlists" />
        </button>
      </div>
    </div>
  )

  const renderConnection = () => (
    <div className="flex flex-col gap-6">
      <div className="surf flex flex-col p-6 gap-5 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-title-l text-t1 font-semibold">Current mode</span>
            <span className="text-body-s text-t3">
              {mode === 'offline' ? 'Offline · nothing fetched from server' : 'Online · streaming from Sonare server'}
            </span>
          </div>
          <Segmented
            options={[
              { id: 'online', label: 'Online', icon: 'cloud' },
              { id: 'offline', label: 'Offline', icon: 'smartphone' },
            ]}
            value={mode}
            onChange={m => {
              if (m === mode) return
              if (m === 'offline') navigate('/mode-switch')
              else setMode('online')
            }}
            color={mode === 'offline' ? 'gold' : 'acc'}
          />
        </div>
        <hr className="border-0 h-px bg-ln" />
        <div className="grid grid-cols-2 @md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-label-s text-t3 font-medium">
              <Icon name="smartphone" size={15} />
              <span>SONGS ON DEVICE</span>
            </span>
            <span className="text-h1 text-gold font-semibold">{totalLocalTracks.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-label-s text-t3 font-medium">
              <Icon name="folder" size={15} />
              <span>SCANNED FOLDERS</span>
            </span>
            <span className="text-h1 text-gold font-semibold">{totalFoldersCount}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-label-s text-t3 font-medium">
              <Icon name="download" size={15} />
              <span>STORAGE USED</span>
            </span>
            <span className="text-h1 text-gold font-semibold">{formatBytes(totalLocalBytes)}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-label-s text-t3 font-medium">
              <Icon name="cloud" size={15} />
              <span>CONNECTION</span>
            </span>
            <span className="text-h1 text-t1 font-semibold capitalize">{mode}</span>
          </div>
        </div>
      </div>

      <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
        <label className="cursor-pointer">
          <Row icon="wifi-off" label="Stay offline until I switch back" desc="Start in Offline mode until I switch back">
            <Switch variant="gold" checked={settings.stayOffline} onCheckedChange={stayOffline => updateSettings({ stayOffline })} aria-label="Stay offline" />
          </Row>
        </label>
      </div>

      {CAPS.localLibrary && (
        <div className="flex items-center gap-3">
          <Button variant="out" icon="folder" onClick={() => navigate('/folders')}>Manage music folders</Button>
        </div>
      )}
    </div>
  )

  const renderAppearance = () => (
    <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
      <Row icon="moon" label="Theme" desc="Dark (always on)" />
    </div>
  )

  const renderAbout = () => (
    <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
      <Row icon="info" label="About Sonare" desc="Version 1.0.0 · Offline-first music player" />
    </div>
  )

  const renderSectionContent = (id: string) => {
    switch (id) {
      case 'account': return renderAccount()
      case 'playback': return renderPlayback()
      case 'audio': return renderAudio()
      case 'library': return renderLibrary()
      case 'connection': return renderConnection()
      case 'appearance': return renderAppearance()
      case 'about': return renderAbout()
      default: return renderAccount()
    }
  }

  return (
    <div className="@container flex flex-col h-full overflow-hidden bg-bg">
      {/* Mobile / Small screen: M15 single scrolling list with overline headers */}
      <div className="flex @[480px]:hidden flex-col p-4 gap-6 overflow-y-auto h-full pb-8">
        <span className="text-title-l text-t1 font-semibold">Settings</span>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Account</span>
          {renderAccount()}
        </div>

        {CAPS.offlineMode && (
          <div className="flex flex-col gap-2">
            <span className="text-overline text-t3 pl-1">Connection mode</span>
            {renderConnection()}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Playback</span>
          {renderPlayback()}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Audio & effects</span>
          {renderAudio()}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Library & scanning</span>
          {renderLibrary()}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Appearance</span>
          {renderAppearance()}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">About</span>
          {renderAbout()}
        </div>
      </div>

      {/* Desktop / Wide: W15 / D15 sub-nav on left + selected section on right */}
      <div className="hidden @[480px]:flex flex-row grow overflow-hidden h-full">
        {/* Left Sub-nav */}
        <div className="flex flex-col flex-none w-56 border-r border-ln p-6 gap-1 overflow-y-auto">
          <span className="text-overline text-t3 px-3 pb-3">Settings</span>
          {activeSections.map(sec => {
            const on = sec.id === currentSection.id
            return (
              <button
                key={sec.id}
                onClick={() => setSection(sec.id)}
                className={`sitem w-full text-left bg-transparent border-0 cursor-pointer ${on ? 'on' : ''}`}
              >
                <Icon name={sec.icon} size={18} />
                <span>{sec.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right Section Content */}
        <div className="flex flex-col grow overflow-y-auto p-8 @[768px]:p-10 gap-7 min-w-0">
          <div className="flex flex-col gap-1">
            <span className="text-display-s text-t1 font-bold tracking-tight">{currentSection.title}</span>
            <span className="text-body-m text-t2">{currentSection.description}</span>
          </div>

          <div className="flex flex-col gap-6 max-w-[800px]">
            {renderSectionContent(currentSection.id)}
          </div>
        </div>
      </div>
    </div>
  )
}
