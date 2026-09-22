import React from 'react'
import { motion, LayoutGroup } from 'motion/react'
import { cn } from '../../lib/utils'
import Icon, { type IconName } from './Icon'
import { transition } from '../../lib/motion'

interface SegmentOptions {
  id: string
  label: string
  icon?: IconName
}

interface SegmentedProps {
  options: SegmentOptions[]
  value: string
  onChange: (id: string) => void
  color?: 'acc' | 'gold'
  className?: string
}

export function Segmented({ options, value, onChange, color = 'acc', className }: SegmentedProps) {
  const activeClass = color === 'acc' ? 'seg-on-cloud' : 'seg-on-dev'
  return (
    <LayoutGroup>
      <span className={cn('seg', className)}>
        {options.map(opt => {
          const isActive = value === opt.id
          return (
            <button
              key={opt.id}
              className={cn('seg-i relative', isActive && activeClass)}
              onClick={() => onChange(opt.id)}
              aria-pressed={isActive}
            >
              {opt.icon && <Icon name={opt.icon} size={14} className="relative z-10" />}
              <span className="relative z-10">{opt.label}</span>
              {isActive && (
                <motion.span
                  className="absolute inset-0 rounded-full -z-10"
                  layoutId="seg-pill-bg"
                  transition={transition.spring}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </span>
    </LayoutGroup>
  )
}
