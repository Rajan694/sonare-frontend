import React from 'react'
import Icon, { type IconName } from './Icon'

interface EmptyStateProps {
  icon: IconName
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty-ic"><Icon name={icon} size={24} /></span>
      <span className="text-title-l text-t1">{title}</span>
      <span className="text-body-m text-t3">{description}</span>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
