import React from 'react'
import { cn } from '../../lib/utils'
import Icon, { type IconName } from './Icon'

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: IconName
  shortcut?: string
  square?: boolean
  children?: React.ReactNode
}

export function Field({ icon, shortcut, square, children, className, ...props }: FieldProps) {
  return (
    <label className={cn('field', square && 'field-sq', className)}>
      {icon && <Icon name={icon} size={16} className="text-t3 flex-none" />}
      <input
        type="text"
        className="border-0 bg-transparent outline-0 text-t1 font-sans text-[14px] w-full p-0 placeholder:text-t3"
        {...props}
      />
      {shortcut && <span className="kbd flex-none">{shortcut}</span>}
      {children}
    </label>
  )
}
