import React from 'react'
import { cn } from '../../lib/utils'

type ArtVariant = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9' | 'a10' | 'a11' | 'a12'

interface ArtworkProps {
  variant?: ArtVariant
  size?: number
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'circ'
  rings?: boolean
  className?: string
}

const radiusClass = {
  xs: 'art-r-xs',
  sm: 'art-r-sm',
  md: '',
  lg: 'art-r-lg',
  xl: 'art-r-xl',
  circ: 'art-circ',
}

export default function Artwork({ variant = 'a1', size, radius = 'md', rings = false, className }: ArtworkProps) {
  return (
    <span
      className={cn('art', variant, radiusClass[radius], rings && 'art-rings', className)}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
      aria-hidden
    />
  )
}
