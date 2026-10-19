import React from 'react';
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
        return 'Stereo Stage';
      case 'pending':
        return 'Detecting…';
      case 'none':
        return 'Direct';
      default:
        return 'HRTF';
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
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-mono font-medium',
                support === 'hrtf'
                  ? 'bg-acc/10 text-acc border border-acc/20'
                  : 'bg-surf-3 text-t3 border border-ln/40',
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', support === 'hrtf' ? 'bg-acc' : 'bg-t4')} />
              {getRendererLabel()}
            </span>
            {/* Headphones recommendation badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption text-t3 bg-surf-3/60 border border-ln/30">
              <Icon name="headphones" size={11} />
              <span>Headphones recommended</span>
            </span>
          </div>
          <span className="text-body-s text-t3">Binaural 3D stage and acoustic environment modeling</span>
        </div>

        {/* Master toggles: Compare (Bypass) and Master Enable */}
        <div className="flex items-center gap-3 self-end @sm:self-auto flex-none">
          {spatial.enabled && (
            <button
              type="button"
              aria-pressed={bypass}
              onClick={() => setSpatialBypass(!bypass)}
              className={cn(
                'chip chip-xs h-8 px-3 text-caption font-medium transition-colors cursor-pointer',
                bypass
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-surf-3 text-t2 hover:text-t1 border-ln',
              )}
              title="Temporarily bypass spatial processing to compare with original audio"
            >
              {bypass ? 'Bypassed (Original)' : 'Compare'}
            </button>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-label-m font-medium text-t2">Enabled</span>
            <Switch
              variant={variant}
              checked={spatial.enabled}
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
          <span className="text-caption text-amber-400 font-medium animate-pulse">
            Spatial processing currently bypassed for A/B comparison
          </span>
        )}
      </div>

      {/* Mode Content */}
      {spatial.mode === 'presets' ? (
        <div className="grid grid-cols-1 @md:grid-cols-3 gap-3.5">
          <SpatialPresetCard
            preset="concert"
            active={spatial.preset === 'concert'}
            disabled={!spatial.enabled}
            onSelect={handlePresetSelect}
          />
          <SpatialPresetCard
            preset="cafe"
            active={spatial.preset === 'cafe'}
            disabled={!spatial.enabled}
            onSelect={handlePresetSelect}
          />
          <SpatialPresetCard
            preset="hall"
            active={spatial.preset === 'hall'}
            disabled={!spatial.enabled}
            onSelect={handlePresetSelect}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 @2xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          <Soundstage custom={spatial.custom} disabled={!spatial.enabled} onChange={setSpatialCustom} />
          <SpatialControls
            custom={spatial.custom}
            disabled={!spatial.enabled}
            variant={variant}
            onChange={setSpatialCustom}
          />
        </div>
      )}
    </div>
  );
};
