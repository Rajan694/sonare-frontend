import React, { useRef, useCallback, useState } from 'react';
import { cn } from '../../lib/cn';
import { toPolar, directionLabel, distanceLabel, type SpatialCustom } from '../../../../shared/spatial';

interface SoundstageProps {
  custom: SpatialCustom;
  disabled?: boolean;
  onChange: (patch: Partial<SpatialCustom>, opts?: { commit?: boolean }) => void;
}

const DISC_RADIUS = 95; // SVG coordinate units

export const Soundstage: React.FC<SoundstageProps> = ({ custom, disabled = false, onChange }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Math coordinates: x right (+), y front (+)
  // SVG coordinates: cx + x * R, cy - y * R
  const sourceSvgX = custom.x * DISC_RADIUS;
  const sourceSvgY = -custom.y * DISC_RADIUS;

  const polar = toPolar(custom.x, custom.y);
  const spreadRad = ((custom.width / 100) * 80 * Math.PI) / 360; // half-spread

  // Virtual speaker positions
  const azL = polar.azimuth - spreadRad;
  const azR = polar.azimuth + spreadRad;
  const dist = polar.distance * DISC_RADIUS;

  const spkLX = Math.sin(azL) * dist;
  const spkLY = -Math.cos(azL) * dist;
  const spkRX = Math.sin(azR) * dist;
  const spkRY = -Math.cos(azR) * dist;

  const updateFromPointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>, commit: boolean) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = (e.clientX - centerX) / (rect.width / 2);
      const dy = -(e.clientY - centerY) / (rect.height / 2); // invert Y so front is +

      let r = Math.hypot(dx, dy);
      if (r < 0.1) r = 0.1;
      let nx = dx;
      let ny = dy;
      if (r > 1.0) {
        nx = dx / r;
        ny = dy / r;
      }

      onChange({ x: nx, y: ny }, { commit });
    },
    [onChange],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromPointer(e, false);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || disabled) return;
    updateFromPointer(e, false);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setIsDragging(false);
    updateFromPointer(e, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 0.1 : 0.04;
    let nextX = custom.x;
    let nextY = custom.y;

    if (e.key === 'ArrowUp') nextY += step;
    else if (e.key === 'ArrowDown') nextY -= step;
    else if (e.key === 'ArrowLeft') nextX -= step;
    else if (e.key === 'ArrowRight') nextX += step;
    else return;

    e.preventDefault();
    const r = Math.hypot(nextX, nextY);
    if (r > 1.0) {
      nextX /= r;
      nextY /= r;
    }
    onChange({ x: nextX, y: nextY }, { commit: true });
  };

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-3 rounded-2xl bg-surf-2 border border-ln select-none outline-none focus:ring-1 focus:ring-acc/50',
        disabled && 'opacity-40 pointer-events-none',
      )}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="Soundstage 2D position disc. Use arrow keys to reposition sound source."
    >
      <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox="-120 -120 240 240"
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            {/* Radial glow for sound source */}
            <radialGradient id="sourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-acc, #6366f1)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--color-acc, #6366f1)" stopOpacity="0" />
            </radialGradient>
            {/* Disc background gradient */}
            <radialGradient id="stageBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </radialGradient>
          </defs>

          {/* Outer disc boundary */}
          <circle cx="0" cy="0" r={DISC_RADIUS} fill="url(#stageBg)" className="text-t1 stroke-ln" strokeWidth="1.5" />

          {/* Range rings (Near, Mid, Far) */}
          <circle
            cx="0"
            cy="0"
            r={DISC_RADIUS * 0.33}
            fill="none"
            className="stroke-ln/40"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            cx="0"
            cy="0"
            r={DISC_RADIUS * 0.66}
            fill="none"
            className="stroke-ln/40"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Crosshair axes */}
          <line x1={-DISC_RADIUS} y1="0" x2={DISC_RADIUS} y2="0" className="stroke-ln/30" strokeWidth="1" />
          <line x1="0" y1={-DISC_RADIUS} x2="0" y2={DISC_RADIUS} className="stroke-ln/30" strokeWidth="1" />

          {/* Cardinal direction labels */}
          <text
            x="0"
            y={-DISC_RADIUS - 8}
            textAnchor="middle"
            className="text-[9px] font-bold fill-t3 uppercase tracking-wider select-none"
          >
            Front
          </text>
          <text
            x="0"
            y={DISC_RADIUS + 15}
            textAnchor="middle"
            className="text-[9px] font-bold fill-t3 uppercase tracking-wider select-none"
          >
            Back
          </text>
          <text
            x={-DISC_RADIUS - 8}
            y="3"
            textAnchor="end"
            className="text-[9px] font-bold fill-t3 uppercase tracking-wider select-none"
          >
            L
          </text>
          <text
            x={DISC_RADIUS + 8}
            y="3"
            textAnchor="start"
            className="text-[9px] font-bold fill-t3 uppercase tracking-wider select-none"
          >
            R
          </text>

          {/* Speaker beam triangle from center to L & R speakers */}
          <polygon points={`0,0 ${spkLX},${spkLY} ${spkRX},${spkRY}`} fill="var(--color-acc, #6366f1)" opacity="0.08" />

          {/* Beam arc between speakers */}
          <line
            x1={spkLX}
            y1={spkLY}
            x2={spkRX}
            y2={spkRY}
            stroke="var(--color-acc, #6366f1)"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.4"
          />

          {/* Virtual Left & Right speakers */}
          <circle cx={spkLX} cy={spkLY} r="4" fill="var(--color-acc, #6366f1)" opacity="0.6" />
          <circle cx={spkRX} cy={spkRY} r="4" fill="var(--color-acc, #6366f1)" opacity="0.6" />

          {/* Listener Head at Center */}
          <g transform="translate(0, 0)">
            {/* Listener head circle */}
            <circle cx="0" cy="0" r="11" fill="currentColor" className="text-surf-3 stroke-t2" strokeWidth="1.5" />
            {/* Nose pointing to front */}
            <path d="M -3 -8 L 0 -14 L 3 -8 Z" fill="currentColor" className="text-t2" />
            {/* Left ear */}
            <rect x="-13" y="-4" width="3" height="8" rx="1.5" fill="currentColor" className="text-t3" />
            {/* Right ear */}
            <rect x="10" y="-4" width="3" height="8" rx="1.5" fill="currentColor" className="text-t3" />
          </g>

          {/* Sound Source Puck */}
          <g transform={`translate(${sourceSvgX}, ${sourceSvgY})`}>
            {/* Pulse / halo aura */}
            <circle cx="0" cy="0" r="24" fill="url(#sourceGlow)" />
            {/* Outer puck border */}
            <circle
              cx="0"
              cy="0"
              r="10"
              fill="var(--color-acc, #6366f1)"
              className="drop-shadow-md cursor-grab active:cursor-grabbing"
            />
            {/* Inner white dot */}
            <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* Polar readout info */}
      <div className="flex items-center justify-between w-full px-2 mt-2 pt-2 border-t border-ln/50 text-caption font-mono">
        <span className="text-t2 font-medium">
          {directionLabel(polar.azimuth)} ({polar.azimuthDeg}°)
        </span>
        <span className="text-t3">
          {distanceLabel(polar.distance)} ({Math.round(polar.distance * 100)}%)
        </span>
      </div>
    </div>
  );
};
