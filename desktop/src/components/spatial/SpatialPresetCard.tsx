import React from 'react';
import { cn } from '../../lib/cn';
import Icon from '../ui/Icon';
import type { SpatialPresetId } from '../../../../shared/spatial';

interface PresetInfo {
  name: string;
  tagline: string;
  rt60: string;
  icon: 'music' | 'radio' | 'sparkles';
}

const PRESET_INFO: Record<SpatialPresetId, PresetInfo> = {
  concert: {
    name: 'Concert',
    tagline: 'Natural stage width with balanced early reflections',
    rt60: '1.2s RT60',
    icon: 'music',
  },
  cafe: {
    name: 'Cafe',
    tagline: 'Intimate near-field presence with warm, dampened highs',
    rt60: '0.6s RT60',
    icon: 'sparkles',
  },
  hall: {
    name: 'Cathedral Hall',
    tagline: 'Expansive architecture with long, diffuse reverberance',
    rt60: '2.1s RT60',
    icon: 'radio',
  },
};

interface SpatialPresetCardProps {
  preset: SpatialPresetId;
  active: boolean;
  disabled?: boolean;
  onSelect: (preset: SpatialPresetId) => void;
}

export const SpatialPresetCard: React.FC<SpatialPresetCardProps> = ({ preset, active, disabled = false, onSelect }) => {
  const info = PRESET_INFO[preset];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onSelect(preset)}
      className={cn(
        'group relative flex flex-col text-left p-4 rounded-xl border transition-all duration-200 select-none cursor-pointer',
        'bg-surf-2 border-ln hover:border-ln-strong',
        active && 'border-acc bg-acc/5 ring-1 ring-acc shadow-sm',
        disabled && 'opacity-40 pointer-events-none cursor-not-allowed',
      )}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              active ? 'bg-acc text-black font-semibold' : 'bg-surf-3 text-t2 group-hover:text-t1',
            )}
          >
            <Icon name={active ? 'check' : 'sparkles'} size={14} />
          </span>
          <span className="text-body-m font-semibold text-t1">{info.name}</span>
        </div>
        <span className="text-caption font-mono text-t3 px-2 py-0.5 rounded-md bg-surf-3/60 border border-ln/40">
          {info.rt60}
        </span>
      </div>
      <p className="text-caption text-t3 leading-relaxed mt-1">{info.tagline}</p>
    </button>
  );
};
