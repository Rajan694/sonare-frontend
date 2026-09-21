import React from 'react';
import { cn } from './utils';

export default function Icon({ name, className }: { name: string, className?: string }) {
  return <img src={`/assets/${name}.svg`} className={cn("inline-block flex-none", className)} alt={name} />;
}
