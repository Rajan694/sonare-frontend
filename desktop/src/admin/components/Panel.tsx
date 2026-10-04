import React from 'react';
import { cn } from '../../lib/cn';

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('bg-s1 border border-ln rounded-lg p-5 min-w-0', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h2 className="text-title-m text-t1">{title}</h2>}
            {subtitle && <p className="text-label-m text-t3 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
