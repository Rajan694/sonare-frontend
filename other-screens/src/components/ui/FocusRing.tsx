import React from 'react'
import { cn } from '../../lib/utils'

interface FocusRingProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactElement<{ className?: string }> | React.ReactNode
  offset?: boolean
  className?: string
  asChild?: boolean
}

export function FocusRing({ children, offset = true, className, asChild, ...props }: FocusRingProps) {
  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    const childProps = children.props;
    const mergedClassName = cn(childProps.className, 'focus-visible:focusring', className);
    return React.cloneElement(children, { className: mergedClassName });
  }

  return (
    <span className={cn('focus-visible:focusring', className)} {...props}>
      {children}
    </span>
  )
}
