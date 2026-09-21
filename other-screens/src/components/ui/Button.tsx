import React from 'react';
import Icon from './Icon';
import { cn } from './utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'acc' | 'solid' | 'out' | 'ghost' | 'gold';
  icon?: string;
  children: React.ReactNode;
}

export default function Button({ variant = 'solid', icon, children, className, ...props }: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center gap-2 h-10 px-[18px] rounded-full font-sans text-[14px] font-semibold tracking-[-0.1px] border border-transparent cursor-pointer no-underline transition-colors";
  
  const variants = {
    acc: "bg-acc text-black shadow-[0_4px_20px_-4px_rgba(0,226,138,0.35)] hover:bg-acc2",
    solid: "bg-s3 text-t1 border-ln2 hover:bg-s4",
    out: "border-ln2 text-t1 bg-transparent hover:bg-s3 hover:border-ln3",
    ghost: "text-t2 hover:bg-s3 hover:text-t1",
    gold: "bg-gold text-black shadow-[0_4px_20px_-4px_rgba(255,194,77,0.32)]"
  };

  return (
    <button className={cn(baseClasses, variants[variant], className)} {...props}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
