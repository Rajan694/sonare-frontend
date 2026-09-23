import React from 'react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { Slider } from '../components/ui/Slider'
import { Badge, Chip } from '../components/ui/ChipBadge'
import { cn } from '../lib/utils'
import {
  useDsp,
  setDsp,
  setBandGain,
  applyPreset,
  commitPreset,
  EQ_LABELS,
  EQ_PRESETS,
  EQ_MIN_DB,
  EQ_MAX_DB,
  CUSTOM_PRESET,
} from '../data/dsp'
import { useSettings, updateSettings } from '../data/settings'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function formatDb(db: number) {
  return `${db > 0 ? '+' : ''}${db % 1 === 0 ? db : db.toFixed(1)}`
}

export default function Equalizer() {
  const { mode } = useModeStore()
  const isOffline = mode === 'offline'
  const dsp = useDsp()
  const settings = useSettings()
  const variant = isOffline ? 'gold' : 'acc'

  return (
    <div className="flex flex-col p-8 gap-6 overflow-auto h-full">
      <span className="text-h1 text-t1">Equalizer & Audio</span>

      <div className="surf p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="text-title-l text-t1">Graphic EQ</span>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-body-m text-t2">{dsp.enabled ? 'On' : 'Bypassed'}</span>
            <Switch
              variant={variant}
              checked={dsp.enabled}
              onCheckedChange={enabled => setDsp({ enabled })}
              aria-label="Toggle equalizer"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(EQ_PRESETS).map(name => (
            <Chip
              key={name}
              size="sm"
              active={dsp.preset === name}
              disabled={!dsp.enabled}
              onClick={() => applyPreset(name)}
            >
              {name}
            </Chip>
          ))}
          {dsp.preset === CUSTOM_PRESET && <span className="chip chip-sm chip-on" aria-live="polite">{CUSTOM_PRESET}</span>}
        </div>

        <div className={cn('flex items-end gap-6 justify-center', !dsp.enabled && 'opacity-40')}>
          {EQ_LABELS.map((band, i) => (
            <div key={band} className="flex flex-col items-center gap-2.5">
              <Slider
                vertical
                bipolar
                min={EQ_MIN_DB}
                max={EQ_MAX_DB}
                step={0.5}
                value={dsp.gains[i]}
                resetValue={0}
                label={formatDb(dsp.gains[i])}
                ariaLabel={`${band} Hz gain`}
                disabled={!dsp.enabled}
                onChange={v => setBandGain(i, v)}
                onCommit={commitPreset}
              />
              <span className="text-label-s text-t3">{band}</span>
            </div>
          ))}
        </div>
        <span className="text-body-s text-t4 text-center">Drag a fader to adjust · double-click to reset to 0 dB</span>
      </div>

      <div className="surf2 flex flex-col divide-y divide-ln2">
        <div className="lrow">
          <span className="icobox icobox-acc"><Icon name="music" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Bass Boost</span><span className="text-body-s text-t3">Low shelf at 80 Hz</span></span>
          <Slider
            value={dsp.bassBoost}
            variant={variant}
            ariaLabel="Bass boost"
            disabled={!dsp.enabled}
            onChange={bassBoost => setDsp({ bassBoost })}
            className="w-40"
          />
          <span className="text-mono-s text-t2 w-10 text-right">{Math.round(dsp.bassBoost)}%</span>
        </div>
        <div className="lrow">
          <span className="icobox"><Icon name="radio" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Virtualizer</span><span className="text-body-s text-t3">Stereo widening</span></span>
          <Slider
            value={dsp.virtualizer}
            variant={variant}
            ariaLabel="Virtualizer"
            disabled={!dsp.enabled}
            onChange={virtualizer => setDsp({ virtualizer })}
            className="w-40"
          />
          <span className="text-mono-s text-t2 w-10 text-right">{Math.round(dsp.virtualizer)}%</span>
        </div>
        <label className="lrow cursor-pointer">
          <span className="icobox"><Icon name="volume" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Volume Normalization</span><span className="text-body-s text-t3">Evens out loud and quiet tracks</span></span>
          <Switch
            variant={variant}
            checked={settings.normalization}
            onCheckedChange={normalization => updateSettings({ normalization })}
            aria-label="Toggle volume normalization"
          />
        </label>
        <label className="lrow cursor-pointer">
          <span className="icobox"><Icon name="music2" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Gapless Playback</span><span className="text-body-s text-t3">Seamless album transitions</span></span>
          <Switch
            variant={variant}
            checked={settings.gapless}
            onCheckedChange={gapless => updateSettings({ gapless })}
            aria-label="Toggle gapless playback"
          />
        </label>
        <div className="lrow">
          <span className="icobox"><Icon name="play" size={16} /></span>
          <span className="flex flex-col grow"><span className="text-body-m text-t1">Playback Speed</span><span className="text-body-s text-t3">With pitch preservation</span></span>
          <select
            className="chip text-t1 bg-s2 border-ln2 appearance-none"
            aria-label="Playback speed"
            value={dsp.speed}
            onChange={e => setDsp({ speed: Number(e.target.value) })}
          >
            {SPEEDS.map(s => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
        </div>
      </div>

      <div className="surf flex flex-col gap-3 p-4">
        <span className="text-title-l text-t1">Output Device</span>
        <div className="lrow">
          <span className="icobox"><Icon name="volume" size={16} /></span>
          <span className="text-body-m grow text-t1">System default output</span>
          <Badge variant="neutral">Active</Badge>
        </div>
        {CAPS.offlineMode && (
          <div className="lrow">
            <span className="icobox"><Icon name="radio" size={16} /></span>
            <span className="text-body-m grow text-t4">Cast to device</span>
            <Badge variant="neutral">{isOffline ? 'Requires Online Mode' : 'Coming soon'}</Badge>
          </div>
        )}
      </div>
    </div>
  )
}
