import React, { useRef, useState } from 'react'
import { cn } from '../../lib/utils'

interface SliderProps {
  value: number
  min?: number
  max?: number
  /** Values snap to this increment. */
  step?: number
  variant?: 'acc' | 'gold'
  vertical?: boolean
  /** Fill from the centre of the rail instead of the start — for ±dB faders. */
  bipolar?: boolean
  label?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
  onChange?: (val: number) => void
  /** Fires once on pointer release — use for persisting, not for live updates. */
  onCommit?: (val: number) => void
  /** Double-clicking the rail resets to this value (FLOWS 1.2). */
  resetValue?: number
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  variant = 'acc',
  vertical = false,
  bipolar = false,
  label,
  ariaLabel,
  className,
  disabled,
  onChange,
  onCommit,
  resetValue,
}: SliderProps) {
  const railRef = useRef<HTMLSpanElement>(null)
  const [dragging, setDragging] = useState(false)
  const interactive = !!onChange && !disabled

  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  const snap = (v: number) => clamp(Math.round((v - min) / step) * step + min)
  const pct = ((clamp(value) - min) / (max - min)) * 100

  function valueAt(e: React.PointerEvent) {
    const rect = railRef.current!.getBoundingClientRect()
    const ratio = vertical
      ? 1 - (e.clientY - rect.top) / rect.height
      : (e.clientX - rect.left) / rect.width
    return snap(min + Math.max(0, Math.min(1, ratio)) * (max - min))
  }

  function onPointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    if (!interactive || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    onChange!(valueAt(e))
  }

  function onPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (!dragging) return
    onChange!(valueAt(e))
  }

  function onPointerUp(e: React.PointerEvent<HTMLSpanElement>) {
    if (!dragging) return
    setDragging(false)
    onCommit?.(valueAt(e))
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!interactive) return
    const big = (max - min) / 10
    const delta = {
      ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step,
      PageUp: big, PageDown: -big,
    }[e.key]
    let next: number | undefined
    if (delta !== undefined) next = snap(value + delta)
    else if (e.key === 'Home') next = min
    else if (e.key === 'End') next = max
    if (next === undefined) return
    e.preventDefault()
    onChange!(next)
    onCommit?.(next)
  }

  function onDoubleClick() {
    if (!interactive || resetValue === undefined) return
    onChange!(resetValue)
    onCommit?.(resetValue)
  }

  const fillStart = bipolar ? Math.min(50, pct) : 0
  const fillEnd = bipolar ? Math.max(50, pct) : pct

  // The visible rail is 4px; the handlers sit on a padded wrapper so it can be grabbed.
  const handlers = {
    role: 'slider',
    tabIndex: interactive ? 0 : -1,
    'aria-label': ariaLabel ?? label,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': Math.round(value * 100) / 100,
    'aria-orientation': vertical ? ('vertical' as const) : ('horizontal' as const),
    'aria-disabled': disabled || undefined,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onKeyDown,
    onDoubleClick,
  }

  if (vertical) {
    return (
      <div className={cn('vs', disabled && 'opacity-40', className)}>
        {label && <span className="text-mono-s text-t3">{label}</span>}
        <span
          {...handlers}
          className={cn('flex justify-center px-4 touch-none outline-none focus-visible:ring-2 focus-visible:ring-acc rounded', interactive && 'cursor-pointer')}
        >
          <span ref={railRef} className="vs-rail">
            <i style={{ top: `${100 - fillEnd}%`, bottom: `${fillStart}%` }} aria-hidden />
            <b style={{ top: `${100 - pct}%` }} aria-hidden />
          </span>
        </span>
      </div>
    )
  }

  return (
    <span
      {...handlers}
      className={cn(
        'flex items-center py-2 touch-none outline-none focus-visible:ring-2 focus-visible:ring-acc rounded',
        interactive && 'cursor-pointer',
        disabled && 'opacity-40',
        className
      )}
    >
      <span ref={railRef} className={cn('track', variant === 'gold' && 'track-gold')}>
        <i style={{ left: `${fillStart}%`, width: `${fillEnd - fillStart}%` }} aria-hidden />
        <b style={{ left: `${pct}%` }} aria-hidden />
      </span>
    </span>
  )
}
