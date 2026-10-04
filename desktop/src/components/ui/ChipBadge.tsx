import React from 'react';
import { cn } from '../../lib/cn';
import type { IconName } from './Icon';
import Icon from './Icon';

interface BadgeProps {
  variant?: 'local' | 'cloud' | 'dl' | 'neutral';
  icon?: IconName;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span className={cn('badge', `bg-${variant}`, className)}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
