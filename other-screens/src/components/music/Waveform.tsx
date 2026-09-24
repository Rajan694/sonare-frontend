import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn, formatDuration, generatePeaks } from '../../lib/utils'

/** `.wave` bars are 2px wide with a 2px gap (sonare.css); the playhead bar is 1px wider. */
const BAR_PITCH_PX = 4

interface WaveformProps {
  peaks?: number[]
  /** The most bars to draw; fewer are drawn when the rail is too narrow to fit them. */
  barCount?: number
  positionRatio?: number
  /** Used for the hover / scrub timecode. */
  durationMs?: number
  offline?: boolean
  className?: string
  /** Called once on release with the chosen fraction of the track (0..1). */
  onSeek?: (ratio: number) => void
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
  const ref = useRef<HTMLSpanElement>(null)
  // Bars have a fixed width, so a rail narrower than barCount of them would spill its
  // bars over whatever sits next to it (the bottom player's duration label). Draw only
  // as many as fit; measured before paint so the overflow never shows.
  const [fitCount, setFitCount] = useState(barCount)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // n bars take n * pitch - 1px (no trailing gap, one wider playhead bar).
    const measure = () => setFitCount(Math.max(1, Math.floor((el.getBoundingClientRect().width + 1) / BAR_PITCH_PX)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const count = Math.min(barCount, fitCount)

  // Bars as a fraction of the rail height. Server peaks arrive normalised to 0..1 and the
  // generated placeholder is in pixels, so scale whichever we have by its own maximum.
  const bars = useMemo(() => {
    let raw: number[] = peaks && peaks.length > 0 ? peaks : generatePeaks(count)
    if (raw.length !== count) {
      const src = raw
      raw = Array.from({ length: count }, (_, i) => {
        const idx = (i / count) * src.length
        const lo = Math.floor(idx)
        const hi = Math.min(lo + 1, src.length - 1)
        return src[lo] * (1 - (idx - lo)) + src[hi] * (idx - lo)
      })
    }
    const max = Math.max(...raw) || 1
    return raw.map(v => Math.max(0.12, v / max))
  }, [peaks, count])

  const [hoverRatio, setHoverRatio] = useState<number | null>(null)
  const [scrubRatio, setScrubRatio] = useState<number | null>(null)

  const shownRatio = scrubRatio ?? positionRatio
  const playheadIdx = Math.floor(Math.max(0, Math.min(1, shownRatio)) * count)

  function ratioAt(e: React.PointerEvent) {
    const rect = ref.current!.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }

  function onPointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    if (!onSeek || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubRatio(ratioAt(e))
  }

  function onPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (!onSeek) return
    const r = ratioAt(e)
    setHoverRatio(r)
    if (scrubRatio !== null) setScrubRatio(r)
  }

  function onPointerUp(e: React.PointerEvent<HTMLSpanElement>) {
    if (scrubRatio === null) return
    onSeek?.(ratioAt(e))
    setScrubRatio(null)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!onSeek || durationMs <= 0) return
    const stepRatio = 5000 / durationMs
    if (e.key === 'ArrowRight') onSeek(Math.min(1, positionRatio + stepRatio))
    else if (e.key === 'ArrowLeft') onSeek(Math.max(0, positionRatio - stepRatio))
    else return
    e.preventDefault()
  }

  const tipRatio = scrubRatio ?? hoverRatio

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
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setScrubRatio(null)}
      onPointerLeave={() => setHoverRatio(null)}
      onKeyDown={onKeyDown}
    >
      {bars.map((h, i) => {
        const isHead = i === playheadIdx
        const isPlayed = i < playheadIdx
        return (
          <i
            key={i}
            className={isHead ? 'hd' : isPlayed ? 'on' : undefined}
            style={{ height: `${h * 100}%` }}
            aria-hidden
          />
        )
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
  )
}
