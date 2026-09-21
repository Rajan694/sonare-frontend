import React from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import { cn } from '../lib/utils'

interface SettingsItem {
  icon: import('../components/ui/Icon').IconName
  label: string
  to: string
  desc: string
  danger?: boolean
}

interface SettingsSection {
  title: string
  items: SettingsItem[]
}

const SECTIONS: SettingsSection[] = [
  {
    title: 'Audio & Playback',
    items: [
      { icon: 'sliders', label: 'Equalizer & Audio', to: '/equalizer', desc: 'EQ, bass boost, speed' },
      { icon: 'volume', label: 'Audio Output', to: '/equalizer', desc: 'Speakers, Bluetooth' },
      { icon: 'music', label: 'Music Quality', to: '/equalizer', desc: 'Bitrate, format fallback' },
    ],
  },
  {
    title: 'Library',
    items: [
      { icon: 'folder', label: 'Local Folders', to: '/folders', desc: 'Manage scanned folders' },
      { icon: 'sync', label: 'Sync & Download', to: '/folders', desc: 'Offline cache, auto-download' },
    ],
  },
  {
    title: 'Appearance',
    items: [
      { icon: 'moon', label: 'Theme', to: '/settings', desc: 'Dark (always on)' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'info', label: 'About Sonare', to: '/settings', desc: 'Version 1.0.0' },
      { icon: 'logout', label: 'Sign out', to: '/settings', desc: '', danger: true },
    ],
  },
]

export default function SettingsScreen() {
  return (
    <div className="flex flex-col p-8 gap-6 overflow-auto h-full">
      <span className="text-h1 text-t1">Settings</span>
      {SECTIONS.map(section => (
        <div key={section.title} className="flex flex-col gap-1">
          <span className="text-overline text-t3 pb-1">{section.title}</span>
          <div className="surf2 flex flex-col divide-y divide-ln2">
            {section.items.map(item => (
              <Link
                key={item.label}
                to={item.to}
                className={cn('lrow no-underline', item.danger ? 'text-red' : 'text-t1')}
              >
                <span className={cn('icobox', item.danger && 'bg-red/10 text-red')}><Icon name={item.icon} size={16} /></span>
                <span className="flex flex-col grow">
                  <span className={cn('text-body-m', item.danger ? 'text-red' : 'text-t1')}>{item.label}</span>
                  {item.desc && <span className="text-body-s text-t3">{item.desc}</span>}
                </span>
                {!item.danger && <Icon name="chevron-right" size={16} className="text-t4 flex-none" />}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
