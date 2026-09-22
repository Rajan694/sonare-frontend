import React from 'react'
import { cn } from '../../lib/utils'

interface SliderProps {
  value: number
  max?: number
  variant?: 'acc' | 'gold'
  vertical?: boolean
  label?: string
  className?: string
  onChange?: (val: number) => void
}

export function Slider({ value, max = 100, variant = 'acc', vertical = false, label, className, onChange }: SliderProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))

  function handleClick(e: React.MouseEvent<HTMLSpanElement>) {
    if (!onChange) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (vertical) {
      const clickY = e.clientY - rect.top
      const newPct = Math.max(0, Math.min(1, 1 - clickY / rect.height))
      onChange(newPct * max)
    } else {
      const clickX = e.clientX - rect.left
      const newPct = Math.max(0, Math.min(1, clickX / rect.width))
      onChange(newPct * max)
    }
  }

  if (vertical) {
    return (
      <div className={cn('vs', className)}>
        {label && <span className="text-mono-s text-t3">{label}</span>}
        <span 
          className={cn('vs-rail', onChange && 'cursor-pointer')}
          onClick={handleClick}
        >
          <i style={{ top: `${100 - pct}%`, bottom: 0 }} aria-hidden />
          <b style={{ top: `${100 - pct}%` }} aria-hidden />
        </span>
      </div>
    )
  }

  return (
    <span 
      className={cn('track', variant === 'gold' && 'track-gold', onChange && 'cursor-pointer', className)}
      onClick={handleClick}
    >
      <i className="w-[var(--slider-pct)]" style={{ '--slider-pct': `${pct}%` } as React.CSSProperties} aria-hidden />
      <b className="left-[var(--slider-pct)]" style={{ '--slider-pct': `${pct}%` } as React.CSSProperties} aria-hidden />
    </span>
  )
}
