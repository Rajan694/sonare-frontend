import React from 'react'
import { cn } from '../../lib/utils'

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  variant?: 'acc' | 'gold'
}

export function Switch({ checked, onCheckedChange, variant = 'acc', className, ...props }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn('sw', checked && 'on', variant === 'gold' && 'gold', className)}
      {...props}
    >
      <i aria-hidden />
    </button>
  )
}
