import React from 'react'
import { cn } from '../../lib/utils'
import { CAPS } from '../../lib/caps'
import Icon from './Icon'

interface SourceGlyphProps {
  source: 'local' | 'server'
  className?: string
}

export function SourceGlyph({ source, className }: SourceGlyphProps) {
  const isLocal = CAPS.localLibrary && source === 'local'
  return (
    <span className={cn('src', isLocal ? 'src-local' : 'src-cloud', className)}>
      <Icon name={isLocal ? 'smartphone' : 'cloud'} size={12} />
    </span>
  )
}
