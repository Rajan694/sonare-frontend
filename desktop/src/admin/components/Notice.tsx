import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';

export const Notice = ({ tone = 'error', children }: { tone?: 'error' | 'warn'; children: React.ReactNode }) => {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md px-3 py-2.5 text-body-s',
        tone === 'error' ? 'bg-red/10 text-red' : 'bg-goldbg text-gold',
      )}
    >
      <AlertTriangle size={16} className="flex-none mt-0.5" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
};
