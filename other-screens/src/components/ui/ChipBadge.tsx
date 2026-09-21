import React from 'react'
import { cn } from '../../lib/utils'
import type { IconName } from './Icon'
import Icon from './Icon'

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  size?: 'sm' | 'md'
  icon?: IconName
  suffixIcon?: IconName
  children: React.ReactNode
}

export function Chip({ active, size = 'md', icon, suffixIcon, children, className, ...props }: ChipProps) {
  return (
    <button className={cn('chip', active && 'chip-on', size === 'sm' && 'chip-sm', className)} {...props}>
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 14} />}
      {children}
      {suffixIcon && <Icon name={suffixIcon} size={size === 'sm' ? 13 : 14} />}
    </button>
  )
}

interface BadgeProps {
  variant?: 'local' | 'cloud' | 'dl' | 'neutral'
  icon?: IconName
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span className={cn('badge', `bg-${variant}`, className)}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  )
}
