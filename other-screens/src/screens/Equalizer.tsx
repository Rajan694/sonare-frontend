import React from 'react'
import { CAPS } from '../lib/caps'
import { useModeStore } from '../store/modeStore'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { Slider } from '../components/ui/Slider'
import { Badge } from '../components/ui/ChipBadge'
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
    <div className="@container flex flex-col p-5 @sm:p-8 @3xl:p-10 gap-6 overflow-y-auto h-full w-full max-w-[1280px] mx-auto select-none">
      {/* Header with Title and EQ Bypass Switch */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 @sm:text-display-m font-bold text-t1 tracking-tight">Audio</h1>
          <span className="text-body-s @sm:text-body-m text-t2">
            Equalizer, effects and audio configuration
          </span>
        </div>
        <label className="flex items-center gap-3 cursor-pointer flex-none">
          <span className="text-label-m @sm:text-title-m font-medium text-t2">Equalizer</span>
          <Switch
            variant={variant}
            checked={dsp.enabled}
            onCheckedChange={enabled => setDsp({ enabled })}
            aria-label="Toggle equalizer"
          />
        </label>
      </div>

      {/* Preset Chips Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {Object.keys(EQ_PRESETS).map(name => (
          <button
            key={name}
            type="button"
            className={cn(
              'chip chip-sm flex-none transition-colors',
              dsp.preset === name && 'chip-on'
            )}
            disabled={!dsp.enabled}
            onClick={() => applyPreset(name)}
          >
            {name}
          </button>
        ))}
        {dsp.preset === CUSTOM_PRESET && (
          <span className="chip chip-sm chip-on flex-none" aria-live="polite">
            {CUSTOM_PRESET}
          </span>
        )}
      </div>

      {/* Main Grid: EQ card (left) + Settings Toggles & Output card (right) */}
      <div className="grid grid-cols-1 @4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Graphic EQ + Bass Boost & Virtualizer */}
        <div className="surf p-5 @sm:p-6 flex flex-col gap-6 w-full">
          <div className="flex items-center justify-between">
            <span className="text-title-m font-semibold text-t1">8-band graphic equalizer</span>
            <span className="text-mono-s text-t3">Range ±12 dB</span>
          </div>

          {/* Vertical EQ Sliders */}
          <div
            className={cn(
              'flex items-end justify-between px-2 @sm:px-4 py-2 transition-opacity duration-200 overflow-x-auto gap-2',
              !dsp.enabled && 'opacity-40 pointer-events-none'
            )}
          >
            {EQ_LABELS.map((band, i) => (
              <div key={band} className="flex flex-col items-center gap-3 min-w-[36px] flex-1">
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
                <span className="text-label-s font-medium text-t3">{band}</span>
              </div>
            ))}
          </div>

          <span className="text-caption text-t4 text-center">
            Drag a fader to adjust · double-click to reset to 0 dB
          </span>

          <hr className="hr border-ln" />

          {/* Bass Boost & Virtualizer bottom sliders */}
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-6 pt-1">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-label-m font-medium text-t2">Bass boost</span>
                <span className="text-mono-s text-t1">{Math.round(dsp.bassBoost)}%</span>
              </div>
              <Slider
                value={dsp.bassBoost}
                variant={variant}
                ariaLabel="Bass boost"
                disabled={!dsp.enabled}
                onChange={bassBoost => setDsp({ bassBoost })}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-label-m font-medium text-t2">Virtualizer</span>
                <span className="text-mono-s text-t1">{Math.round(dsp.virtualizer)}%</span>
              </div>
              <Slider
                value={dsp.virtualizer}
                variant={variant}
                ariaLabel="Virtualizer"
                disabled={!dsp.enabled}
                onChange={virtualizer => setDsp({ virtualizer })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Audio Options & Output */}
        <div className="flex flex-col gap-5 w-full">
          {/* Toggles list */}
          <div className="surf flex flex-col divide-y divide-ln">
            <label className="lrow cursor-pointer flex items-center justify-between p-4">
              <span className="icobox">
                <Icon name="music" size={16} />
              </span>
              <span className="flex flex-col grow min-w-0 pr-2">
                <span className="text-body-m font-medium text-t1 truncate">Gapless playback</span>
                <span className="text-body-s text-t3 truncate">Seamless album transitions</span>
              </span>
              <Switch
                variant={variant}
                checked={settings.gapless}
                onCheckedChange={gapless => updateSettings({ gapless })}
                aria-label="Toggle gapless playback"
              />
            </label>

            <label className="lrow cursor-pointer flex items-center justify-between p-4">
              <span className="icobox">
                <Icon name="volume" size={16} />
              </span>
              <span className="flex flex-col grow min-w-0 pr-2">
                <span className="text-body-m font-medium text-t1 truncate">Volume normalization</span>
                <span className="text-body-s text-t3 truncate">Even loudness across library</span>
              </span>
              <Switch
                variant={variant}
                checked={settings.normalization}
                onCheckedChange={normalization => updateSettings({ normalization })}
                aria-label="Toggle volume normalization"
              />
            </label>

            <div className="lrow flex items-center justify-between p-4">
              <span className="icobox">
                <Icon name="play" size={16} />
              </span>
              <span className="flex flex-col grow min-w-0 pr-2">
                <span className="text-body-m font-medium text-t1 truncate">Playback speed</span>
                <span className="text-body-s text-t3 truncate">Pitch preserved</span>
              </span>
              <select
                className="chip chip-sm text-t1 bg-s2 border-ln2 appearance-none cursor-pointer pr-3"
                aria-label="Playback speed"
                value={dsp.speed}
                onChange={e => setDsp({ speed: Number(e.target.value) })}
              >
                {SPEEDS.map(s => (
                  <option key={s} value={s} className="bg-s2 text-t1">
                    {s}×
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Output Device */}
          <div className="surf flex flex-col gap-3 p-5">
            <span className="text-overline text-t3 font-semibold uppercase tracking-wider">Audio output</span>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-s2/50 border border-ln">
              <span className={cn('icobox', isOffline ? 'icobox-gold' : 'icobox-acc')}>
                <Icon name="volume" size={16} />
              </span>
              <div className="flex flex-col min-w-0 grow">
                <span className="text-body-m font-medium text-t1 truncate">System default output</span>
                <span className="text-body-s text-t3 truncate">Active · EQ applies here</span>
              </div>
              <Badge variant={isOffline ? 'local' : 'cloud'}>Active</Badge>
            </div>
            {CAPS.offlineMode && (
              <div className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                <span className="icobox">
                  <Icon name="radio" size={16} />
                </span>
                <div className="flex flex-col min-w-0 grow">
                  <span className="text-body-m text-t4 truncate">Cast to device</span>
                  <span className="text-body-s text-t4 truncate">Network audio</span>
                </div>
                <Badge variant="neutral">{isOffline ? 'Requires Online Mode' : 'Coming soon'}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

