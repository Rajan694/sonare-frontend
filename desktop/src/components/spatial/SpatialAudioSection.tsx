import React, { useEffect } from 'react';
import { cn } from '../../lib/cn';
import Icon from '../ui/Icon';
import { Switch } from '../ui/Switch';
import { Segmented } from '../ui/Segmented';
import {
  useSpatial,
  useSpatialBypass,
  useSpatialSupport,
  setSpatial,
  setSpatialCustom,
  setSpatialBypass,
} from '../../audio/spatial';
import { SpatialPresetCard } from './SpatialPresetCard';
import { Soundstage } from './Soundstage';
import { SpatialControls } from './SpatialControls';
import type { SpatialMode, SpatialPresetId } from '../../../../shared/spatial';

interface SpatialAudioSectionProps {
  variant?: 'acc' | 'gold';
  className?: string;
}

export const SpatialAudioSection: React.FC<SpatialAudioSectionProps> = ({ variant = 'acc', className }) => {
  const spatial = useSpatial();
  const bypass = useSpatialBypass();
  const support = useSpatialSupport();
  const gold = variant === 'gold';
  // Without Web Audio there is nothing to process with.
  const disabled = !spatial.enabled || support === 'none';

  // Compare is a momentary check: leaving the screen ends it, so nobody stays on the original.
  useEffect(() => () => setSpatialBypass(false), []);

  const handleModeChange = (modeId: string) => {
    setSpatial({ mode: modeId as SpatialMode });
  };

  const handlePresetSelect = (preset: SpatialPresetId) => {
    setSpatial({ preset });
  };

  const getRendererLabel = () => {
    switch (support) {
      case 'hrtf':
        return 'HRTF 3D';
      case 'headModel':
        return 'Head model';
      case 'none':
        return 'Unavailable';
      default:
        return 'Starts on play';
    }
  };

  return (
    <div className={cn('surf p-4 @sm:p-6 flex flex-col gap-6 w-full overflow-hidden', className)}>
      {/* Header */}
      <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-title-m font-semibold text-t1">Spatial audio &amp; soundstage</span>
            {/* Renderer indicator badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-mono-s border',
                support === 'hrtf'
                  ? gold
                    ? 'bg-goldbg text-gold border-gold/20'
                    : 'bg-accbg text-acc border-acc/20'
                  : 'bg-s3 text-t3 border-ln',
              )}
            >
              <span
                className={cn('w-1.5 h-1.5 rounded-full', support === 'hrtf' ? (gold ? 'bg-gold' : 'bg-acc') : 'bg-t4')}
              />
              {getRendererLabel()}
            </span>
            {/* Headphones recommendation badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-s text-t3 bg-s3 border border-ln">
              <Icon name="headphones" size={11} />
              <span>Headphones recommended</span>
            </span>
          </div>
          <span className="text-body-s text-t3">Binaural 3D stage and acoustic environment modeling</span>
        </div>

        {/* Master toggles: Compare (Bypass) and Master Enable */}
        <div className="flex items-center gap-3 self-end @sm:self-auto flex-none">
          {spatial.enabled && support !== 'none' && (
            <button
              type="button"
              aria-pressed={bypass}
              onClick={() => setSpatialBypass(!bypass)}
              className={cn('chip chip-sm h-8 transition-colors', bypass && 'chip-on')}
              title="Temporarily bypass spatial processing to compare with original audio"
            >
              {bypass ? 'Hearing original' : 'Compare'}
            </button>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-label-m font-medium text-t2">Enabled</span>
            <Switch
              variant={variant}
              checked={spatial.enabled}
              disabled={support === 'none'}
              onCheckedChange={(enabled) => setSpatial({ enabled })}
              aria-label="Toggle spatial audio"
            />
          </label>
        </div>
      </div>

      {/* Mode Segmented Switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Segmented
          layoutId="spatial-mode-seg"
          value={spatial.mode}
          onChange={handleModeChange}
          color={variant}
          options={[
            { id: 'presets', label: 'Presets', icon: 'music' },
            { id: 'custom', label: 'Custom Soundstage', icon: 'compass' },
          ]}
        />

        {spatial.enabled && bypass && (
          <span className="text-label-s text-t2" aria-live="polite">
            Playing the original sound for comparison
          </span>
        )}
      </div>

      {support === 'none' && (
        <p className="text-body-s text-t3">
          Spatial audio needs Web Audio, which isn't available here, so playback stays unprocessed.
        </p>
      )}
      {support === 'headModel' && spatial.enabled && (
        <p className="text-body-s text-t3">
          Binaural (HRTF) data isn't available on this system, so a simpler head model is used: left and right still
          work, front and back are less distinct.
        </p>
      )}

      {/* Mode Content */}
      {spatial.mode === 'presets' ? (
        <div role="radiogroup" aria-label="Spatial preset" className="grid grid-cols-1 @md:grid-cols-3 gap-3.5">
          {(['concert', 'cafe', 'hall'] as const).map((preset) => (
            <SpatialPresetCard
              key={preset}
              preset={preset}
              active={spatial.preset === preset}
              disabled={disabled}
              variant={variant}
              onSelect={handlePresetSelect}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 @2xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          <Soundstage custom={spatial.custom} disabled={disabled} variant={variant} onChange={setSpatialCustom} />
          <SpatialControls custom={spatial.custom} disabled={disabled} variant={variant} onChange={setSpatialCustom} />
        </div>
      )}
    </div>
  );
};
