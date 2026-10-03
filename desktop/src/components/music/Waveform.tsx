import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { formatDuration, generatePeaks } from '../../lib/format';

/** `.wave` bars have a 2px gap (sonare.css); the playhead bar is 1px wider than the rest. */
const BAR_GAP_PX = 2;
/** Narrowest a bar may get before we draw fewer of them. */
const MIN_BAR_PX = 2;

interface WaveformProps {
  peaks?: number[];
  /** The most bars to draw; fewer are drawn when the rail is too narrow to fit them. */
  barCount?: number;
  positionRatio?: number;
  /** Used for the hover / scrub timecode. */
  durationMs?: number;
  offline?: boolean;
  className?: string;
  /** Called once on release with the chosen fraction of the track (0..1). */
  onSeek?: (ratio: number) => void;
}

export default function Waveform({
  peaks,
  barCount = 150,
  positionRatio = 0,
  durationMs = 0,
  offline = false,
  className,
  onSeek,
}: WaveformProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Bars are sized to fill the rail: availableWidth / count. A rail too narrow for barCount
  // bars of MIN_BAR_PX draws fewer, so they never spill over whatever sits next to it (the
  // bottom player's duration label). Measured before paint so the overflow never shows.
  const [railWidth, setRailWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setRailWidth(el.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // n bars take n * (bar + gap) - gap + 1px for the wider playhead bar.
  const fitCount = Math.max(1, Math.floor((railWidth - 1 + BAR_GAP_PX) / (MIN_BAR_PX + BAR_GAP_PX)));
  const count = railWidth > 0 ? Math.min(barCount, fitCount) : barCount;
  const barWidth = railWidth > 0 ? (railWidth - 1 - BAR_GAP_PX * (count - 1)) / count : MIN_BAR_PX;

  // Bars as a fraction of the rail height. Server peaks arrive normalised to 0..1 and the
  // generated placeholder is in pixels, so scale whichever we have by its own maximum.
  const bars = useMemo(() => {
    let raw: number[] = peaks && peaks.length > 0 ? peaks : generatePeaks(count);
    if (raw.length !== count) {
      const src = raw;
      raw = Array.from({ length: count }, (_, i) => {
        const idx = (i / count) * src.length;
        const lo = Math.floor(idx);
        const hi = Math.min(lo + 1, src.length - 1);
        return src[lo] * (1 - (idx - lo)) + src[hi] * (idx - lo);
      });
    }
    const max = Math.max(...raw) || 1;
    return raw.map((v) => Math.max(0.12, v / max));
  }, [peaks, count]);

  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);

  const shownRatio = scrubRatio ?? positionRatio;
  const playheadIdx = Math.floor(Math.max(0, Math.min(1, shownRatio)) * count);

  function ratioAt(e: React.PointerEvent) {
    const rect = ref.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }

  function onPointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    if (!onSeek || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubRatio(ratioAt(e));
  }

  function onPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (!onSeek) return;
    const r = ratioAt(e);
    setHoverRatio(r);
    if (scrubRatio !== null) setScrubRatio(r);
  }

  function onPointerUp(e: React.PointerEvent<HTMLSpanElement>) {
    if (scrubRatio === null) return;
    onSeek?.(ratioAt(e));
    setScrubRatio(null);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!onSeek || durationMs <= 0) return;
    const stepRatio = 5000 / durationMs;
    if (e.key === 'ArrowRight') onSeek(Math.min(1, positionRatio + stepRatio));
    else if (e.key === 'ArrowLeft') onSeek(Math.max(0, positionRatio - stepRatio));
    else return;
    e.preventDefault();
  }

  const tipRatio = scrubRatio ?? hoverRatio;

  return (
    <span
      ref={ref}
      role={onSeek ? 'slider' : undefined}
      tabIndex={onSeek ? 0 : undefined}
      aria-label={onSeek ? 'Seek' : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? Math.round(durationMs / 1000) : undefined}
      aria-valuenow={onSeek ? Math.round((positionRatio * durationMs) / 1000) : undefined}
      aria-valuetext={onSeek ? formatDuration(positionRatio * durationMs) : undefined}
      className={cn(
        // min-w-0: the rail takes its width from its container, never from its bars.
        'wave relative min-w-0 touch-none outline-none',
        offline && 'wave-gold',
        onSeek && 'cursor-pointer',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setScrubRatio(null)}
      onPointerLeave={() => setHoverRatio(null)}
      onKeyDown={onKeyDown}
    >
      {bars.map((h, i) => {
        const isHead = i === playheadIdx;
        const isPlayed = i < playheadIdx;
        return (
          <i
            key={i}
            className={isHead ? 'hd' : isPlayed ? 'on' : undefined}
            style={{ height: `${h * 100}%`, width: isHead ? barWidth + 1 : barWidth }}
            aria-hidden
          />
        );
      })}
      {onSeek && tipRatio !== null && durationMs > 0 && (
        <span
          className="absolute bottom-full mb-1.5 -translate-x-1/2 px-1.5 py-0.5 rounded bg-s3 border border-ln2 text-mono-s text-t1 pointer-events-none whitespace-nowrap"
          style={{ left: `${tipRatio * 100}%` }}
          aria-hidden
        >
          {formatDuration(tipRatio * durationMs)}
        </span>
      )}
    </span>
  );
}
