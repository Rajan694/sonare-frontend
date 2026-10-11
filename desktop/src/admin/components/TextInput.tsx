import React from 'react';
import { cn } from '../../lib/cn';

export const TextInput = ({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: React.ReactNode;
}) => {
  const id = React.useId();
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      <label htmlFor={id} className="text-label-l text-t2">
        {label}
      </label>
      <input
        id={id}
        className="h-11 px-4 bg-s2 border border-ln2 rounded-md text-t1 text-body-m outline-none focus:border-acc placeholder:text-t4 disabled:opacity-60"
        {...props}
      />
      {hint && <div className="text-label-m text-t3">{hint}</div>}
    </div>
  );
};
