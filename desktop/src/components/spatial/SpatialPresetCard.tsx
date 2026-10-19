import React from 'react';
import { cn } from '../../lib/cn';
import Icon from '../ui/Icon';
import { ROOMS, SPATIAL_PRESETS, type SpatialPresetId } from '../../../../shared/spatial';

/** A small top-down sketch of each space: the listener is the filled dot near the bottom. */
const Preview = ({ preset }: { preset: SpatialPresetId }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 64 40" className="w-16 h-10 flex-none text-t4" aria-hidden>
      {preset === 'concert' && (
        <>
          {/* Stage with its lights, the crowd, and the listener in it */}
          <path d="M10 10 Q32 2 54 10" {...common} />
          <path d="M22 6 L18 16 M32 4 L32 15 M42 6 L46 16" {...common} strokeOpacity={0.5} />
          {[14, 22, 42, 50].map((x) => (
            <circle key={x} cx={x} cy={26} r={1.2} fill="currentColor" />
          ))}
          <circle cx={32} cy={30} r={2.6} className="fill-[var(--spatial-accent)]" />
        </>
      )}
      {preset === 'cafe' && (
        <>
          {/* A small room with speakers in its corners and a table */}
          <rect x={12} y={4} width={40} height={32} rx={4} {...common} />
          {[
            [16, 8],
            [48, 8],
            [16, 32],
            [48, 32],
          ].map(([x, y]) => (
            <rect key={`${x}${y}`} x={x - 1.5} y={y - 1.5} width={3} height={3} rx={0.8} fill="currentColor" />
          ))}
          <circle cx={24} cy={18} r={3} {...common} strokeOpacity={0.5} />
          <circle cx={36} cy={24} r={2.6} className="fill-[var(--spatial-accent)]" />
        </>
      )}
      {preset === 'hall' && (
        <>
          {/* A deep hall and the long way its reflections travel */}
          <path d="M14 36 L8 4 L56 4 L50 36 Z" {...common} />
          <path d="M20 28 Q32 10 44 28" {...common} strokeOpacity={0.5} />
          <path d="M16 30 Q32 2 48 30" {...common} strokeOpacity={0.3} />
          <circle cx={32} cy={31} r={2.6} className="fill-[var(--spatial-accent)]" />
        </>
      )}
    </svg>
  );
};

interface SpatialPresetCardProps {
  preset: SpatialPresetId;
  active: boolean;
  disabled?: boolean;
  variant?: 'acc' | 'gold';
  onSelect: (preset: SpatialPresetId) => void;
}

export const SpatialPresetCard: React.FC<SpatialPresetCardProps> = ({
  preset,
  active,
  disabled = false,
  variant = 'acc',
  onSelect,
}) => {
  const info = SPATIAL_PRESETS[preset];
  const room = ROOMS[info.room];
  const gold = variant === 'gold';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onSelect(preset)}
      style={{ '--spatial-accent': gold ? 'var(--color-gold)' : 'var(--color-acc)' } as React.CSSProperties}
      className={cn(
        'group relative flex flex-col text-left p-4 rounded-xl border transition-colors duration-200 select-none cursor-pointer outline-none',
        'bg-s2 border-ln hover:border-ln3 focus-visible:ring-2',
        gold ? 'focus-visible:ring-gold/50' : 'focus-visible:ring-acc/50',
        active && (gold ? 'border-gold bg-goldbg' : 'border-acc bg-accbg'),
        disabled && 'opacity-40 pointer-events-none cursor-not-allowed',
      )}
    >
      <div className="flex items-start justify-between w-full gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-body-m font-semibold text-t1">{info.label}</span>
            {active && <Icon name="check" size={14} className={gold ? 'text-gold' : 'text-acc'} />}
          </div>
          <span className="text-mono-s text-t3">{room.rt60Low.toFixed(1)} s decay</span>
        </div>
        <Preview preset={preset} />
      </div>
      <p className="text-label-s text-t3 leading-relaxed mt-2">{info.description}</p>
    </button>
  );
};
