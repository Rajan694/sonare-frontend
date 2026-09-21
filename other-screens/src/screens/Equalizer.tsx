import React, { useState } from 'react'
import { useModeStore } from '../store/modeStore'
import { IconButton } from '../components/ui/Button'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { Slider } from '../components/ui/Slider'
import { Badge } from '../components/ui/ChipBadge'
import { cn } from '../lib/utils'

const PRESETS = ['Flat', 'Bass Boost', 'Classical', 'Electronic', 'Hip-Hop', 'Jazz', 'Pop', 'Rock']
const BANDS = ['32', '64', '125', '250', '500', '1K', '2K', '8K', '16K']

const DEFAULT_GAINS = [0, 0, 0, 0, 0, 0, 0, 0, 0]
const BASS_BOOST = [6, 5, 4, 2, 0, 0, 0, 0, 0]

export default function Equalizer() {
  const { mode } = useModeStore()
  const isOffline = mode === 'offline'
  const [preset, setPreset] = useState('Flat')
  const [gains, setGains] = useState(DEFAULT_GAINS)
  const [bassBoost, setBassBoost] = useState(false)
  const [speed, setSpeed] = useState('1.0×')

  function setGain(i: number, v: number) {
    const next = [...gains]
    next[i] = v
    setGains(next)
  }

  return (
    <div className="flex flex-col p-8 gap-6 overflow-auto h-full">
      <span className="text-h1 text-t1">Equalizer & Audio</span>

      <div className="surf p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="text-title-l text-t1">Graphic EQ</span>
          <div className="flex items-center gap-2">
            <select
              className="chip text-t1 bg-s2 border-ln2 appearance-none pr-[14px]"
              value={preset}
              onChange={e => setPreset(e.target.value)}
              aria-label="EQ preset"
            >
              {PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-6 justify-center h-[200px]">
          {BANDS.map((band, i) => {
            const gain = gains[i]
            const val = 50 + (gain / 12) * 50
            return (
              <div key={band} className="flex flex-col items-center gap-2.5">
                <Slider vertical value={val} label={`${gain > 0 ? '+' : ''}${gain}`} />
                <span className="text-label-s text-t3">{band}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="surf2 flex flex-col divide-y divide-ln2">
        <label className="lrow cursor-pointer">
          <span className="icobox icobox-acc"><Icon name="music" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Bass Boost</span><span className="text-body-s text-t3">+6 dB at 60 Hz</span></span>
          <Switch checked={bassBoost} onCheckedChange={setBassBoost} aria-label="Toggle bass boost" />
        </label>
        <label className="lrow cursor-pointer">
          <span className="icobox"><Icon name="volume" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Volume Normalization</span><span className="text-body-s text-t3">Keeps tracks at consistent volume</span></span>
          <Switch checked={true} aria-label="Toggle volume normalization" />
        </label>
        <label className="lrow cursor-pointer">
          <span className="icobox"><Icon name="music2" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Gapless Playback</span><span className="text-body-s text-t3">Seamless album transitions</span></span>
          <Switch checked={true} aria-label="Toggle gapless playback" />
        </label>
        <div className="lrow">
          <span className="icobox"><Icon name="play" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Playback Speed</span><span className="text-body-s text-t3">With pitch preservation</span></span>
          <select className="chip text-t1 bg-s2 border-ln2 appearance-none" aria-label="Playback speed">
            {['0.5×', '0.75×', '1.0×', '1.25×', '1.5×', '2.0×'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="surf flex flex-col gap-3 p-4">
        <span className="text-title-l text-t1">Output Device</span>
        {[
          { name: 'Built-in Speakers', kind: 'speaker', available: true },
          { name: 'Cast to device', kind: 'cast', available: !isOffline },
        ].map(device => (
          <div key={device.name} className="lrow">
            <span className="icobox"><Icon name="volume" size={16} /></span>
            <span className={cn('text-body-m grow', device.available ? 'text-t1' : 'text-t4')}>{device.name}</span>
            {!device.available && <Badge variant="neutral">Requires Online Mode</Badge>}
            {device.available && <IconButton icon="check" label="Selected" size={28} active />}
          </div>
        ))}
      </div>
    </div>
  )
}
