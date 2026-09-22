import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../lib/utils'
import Icon, { type IconName } from './Icon'

interface ToastProps {
  show: boolean
  title: string
  description?: string
  icon?: IconName
  variant?: 'neutral' | 'acc' | 'gold'
  onClose?: () => void
}

const variants = {
  neutral: 'bg-s2 border-ln2 text-t1',
  acc: 'bg-s2 border-ln2 text-t1',
  gold: 'bg-s2 border-ln2 text-t1',
}

const iconVariants = {
  neutral: 'text-t3 bg-s3',
  acc: 'text-acc bg-accbg',
  gold: 'text-gold bg-goldbg',
}

export function Toast({ show, title, description, icon, variant = 'neutral', onClose }: ToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'flex items-center gap-3 p-3 pl-4 pr-4 rounded-lg shadow-e3 border min-w-[280px]',
            variants[variant]
          )}
        >
          {icon && (
            <span className={cn('flex-none w-8 h-8 rounded-full flex items-center justify-center', iconVariants[variant])}>
              <Icon name={icon} size={16} />
            </span>
          )}
          <div className="flex flex-col grow min-w-0">
            <span className="text-body-m font-medium truncate">{title}</span>
            {description && <span className="text-body-s text-t3 truncate">{description}</span>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ib ib-28 flex-none ml-2"
              aria-label="Close message"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
