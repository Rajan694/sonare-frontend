import React from 'react'
import { cn } from '../../lib/utils'
import type { IconName } from './Icon'
import Icon from './Icon'

export interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  children: React.ReactNode
}

export function MenuItem({ icon, shortcut, danger, disabled, children, className, ...props }: MenuItemProps) {
  return (
    <button
      className={cn(
        'mi w-full bg-transparent border-0 cursor-pointer',
        danger && 'danger',
        disabled && 'dis',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon && <Icon name={icon} size={16} />}
      <span className="grow text-left">{children}</span>
      {shortcut && <span className="kbd">{shortcut}</span>}
    </button>
  )
}

export function Menu({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('menu', className)}>{children}</div>
}
