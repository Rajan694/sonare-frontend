import React from 'react';
import { Slider } from '../ui/Slider';
import Icon from '../ui/Icon';
import { DEFAULT_SPATIAL, toPolar, withDistance, type SpatialCustom } from '../../../../shared/spatial';

interface SpatialControlsProps {
  custom: SpatialCustom;
  disabled?: boolean;
  variant?: 'acc' | 'gold';
  onChange: (patch: Partial<SpatialCustom>, opts?: { commit?: boolean }) => void;
}

export const SpatialControls: React.FC<SpatialControlsProps> = ({
  custom,
  disabled = false,
  variant = 'acc',
  onChange,
}) => {
  const polar = toPolar(custom.x, custom.y);
  const distancePct = Math.round(polar.distance * 100);

  const handleDistanceChange = (pct: number, commit = false) => {
    const d = pct / 100;
    const updated = withDistance(custom, d);
    onChange({ x: updated.x, y: updated.y }, { commit });
  };

  const setCardinal = (x: number, y: number) => {
    onChange({ x, y }, { commit: true });
  };

  // Back to the starting position; the sliders stay as they are.
  const handleReset = () => {
    onChange({ x: DEFAULT_SPATIAL.custom.x, y: DEFAULT_SPATIAL.custom.y }, { commit: true });
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Quick position presets */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-label-s font-medium text-t2">Quick placement</span>
          <button
            type="button"
            disabled={disabled}
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-label-s font-medium text-t3 hover:text-t1 disabled:opacity-40 transition-colors"
          >
            <Icon name="reset" size={12} />
            <span>Reset position</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCardinal(0, 0.5)}
            className="chip chip-sm h-7 disabled:opacity-40"
          >
            Front
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCardinal(-0.5, 0)}
            className="chip chip-sm h-7 disabled:opacity-40"
          >
            Left
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCardinal(0.5, 0)}
            className="chip chip-sm h-7 disabled:opacity-40"
          >
            Right
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCardinal(0, -0.6)}
            className="chip chip-sm h-7 disabled:opacity-40"
          >
            Behind
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCardinal(0, 0.2)}
            className="chip chip-sm h-7 disabled:opacity-40"
          >
            Near Field
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Distance */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-label-s font-medium text-t2">Distance</span>
            <span className="text-mono-s text-t1">{distancePct}%</span>
          </div>
          <Slider
            value={distancePct}
            min={10}
            max={100}
            step={1}
            variant={variant}
            disabled={disabled}
            ariaLabel="Soundstage distance"
            onChange={(val) => handleDistanceChange(val, false)}
            onCommit={(val) => handleDistanceChange(val, true)}
          />
        </div>

        {/* Width */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-label-s font-medium text-t2">Soundstage width</span>
            <span className="text-mono-s text-t1">{Math.round(custom.width)}%</span>
          </div>
          <Slider
            value={custom.width}
            min={0}
            max={100}
            step={1}
            variant={variant}
            disabled={disabled}
            ariaLabel="Soundstage width"
            onChange={(width) => onChange({ width }, { commit: false })}
            onCommit={(width) => onChange({ width }, { commit: true })}
          />
        </div>

        {/* Intensity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-label-s font-medium text-t2">Intensity</span>
            <span className="text-mono-s text-t1">{Math.round(custom.intensity)}%</span>
          </div>
          <Slider
            value={custom.intensity}
            min={0}
            max={100}
            step={1}
            variant={variant}
            disabled={disabled}
            ariaLabel="Spatial intensity"
            onChange={(intensity) => onChange({ intensity }, { commit: false })}
            onCommit={(intensity) => onChange({ intensity }, { commit: true })}
          />
        </div>

        {/* Ambience */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-label-s font-medium text-t2">Ambience</span>
            <span className="text-mono-s text-t1">{Math.round(custom.ambience)}%</span>
          </div>
          <Slider
            value={custom.ambience}
            min={0}
            max={100}
            step={1}
            variant={variant}
            disabled={disabled}
            ariaLabel="Room ambience"
            onChange={(ambience) => onChange({ ambience }, { commit: false })}
            onCommit={(ambience) => onChange({ ambience }, { commit: true })}
          />
        </div>
      </div>
    </div>
  );
};
