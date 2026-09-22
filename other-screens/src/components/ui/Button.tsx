import React from 'react'
import { cn } from '../../lib/utils'
import type { IconName } from './Icon'
import Icon from './Icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'acc' | 'solid' | 'out' | 'ghost' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  children: React.ReactNode
}

const variantClasses = {
  acc: 'bg-acc text-black shadow-glow hover:bg-acc2',
  solid: 'bg-s3 text-t1 border-ln2 hover:bg-s4',
  out: 'border-ln2 text-t1 bg-transparent hover:bg-s3 hover:border-ln3',
  ghost: 'text-t2 hover:bg-s3 hover:text-t1',
  gold: 'bg-gold text-black shadow-glow-g',
}

const sizeClasses = {
  sm: 'h-8 px-[14px] text-[13px]',
  md: 'h-10 px-[18px] text-[14px]',
  lg: 'h-12 px-[24px] text-[15px]',
}

export default function Button({ variant = 'solid', size = 'md', icon, children, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold tracking-[-0.1px] border border-transparent cursor-pointer no-underline transition-colors duration-150',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
    </button>
  )
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  size?: 28 | 32 | 40 | 44
  active?: boolean
  bordered?: boolean
}

export function IconButton({ icon, label, size = 40, active, bordered, className, ...props }: IconButtonProps) {
  const dim = { 28: 'w-7 h-7', 32: 'w-8 h-8', 40: 'w-10 h-10', 44: 'w-11 h-11' }[size]
  const iconSize = { 28: 14, 32: 16, 40: 18, 44: 20 }[size]
  return (
    <button
      aria-label={label}
      className={cn(
        'ib',
        dim,
        active && 'ib-on',
        bordered && 'ib-bord',
        className
      )}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  )
}
