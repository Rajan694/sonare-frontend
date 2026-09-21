import React, { useMemo } from 'react'
import { cn } from '../../lib/utils'
import { generatePeaks } from '../../lib/utils'

interface WaveformProps {
  peaks?: number[]
  barCount?: number
  positionRatio?: number
  offline?: boolean
  className?: string
  onSeek?: (ratio: number) => void
}

export default function Waveform({
  peaks,
  barCount = 150,
  positionRatio = 0,
  offline = false,
  className,
  onSeek,
}: WaveformProps) {
  const bars = useMemo(() => {
    if (peaks && peaks.length > 0) {
      if (peaks.length === barCount) return peaks
      const out: number[] = []
      for (let i = 0; i < barCount; i++) {
        const idx = (i / barCount) * peaks.length
        const lo = Math.floor(idx)
        const hi = Math.min(lo + 1, peaks.length - 1)
        out.push(Math.round(peaks[lo] * (1 - (idx - lo)) + peaks[hi] * (idx - lo)))
      }
      return out
    }
    return generatePeaks(barCount)
  }, [peaks, barCount])

  const playheadIdx = Math.floor(positionRatio * barCount)

  function handleClick(e: React.MouseEvent<HTMLSpanElement>) {
    if (!onSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek((e.clientX - rect.left) / rect.width)
  }

  return (
    <span
      className={cn('wave', offline && 'wave-gold', onSeek && 'cursor-pointer', className)}
      onClick={handleClick}
    >
      {bars.map((h, i) => {
        const isHead = i === playheadIdx
        const isPlayed = i < playheadIdx
        return (
          <i
            key={i}
            className={isHead ? 'hd' : isPlayed ? 'on' : undefined}
            style={{ height: `${h}px` }}
            aria-hidden
          />
        )
      })}
    </span>
  )
}
