import React from 'react'
import { Link } from 'react-router-dom'
import Artwork from '../music/Artwork'

interface CardProps {
  title: string
  subtitle: string
  artVariant: any
  to: string
  width?: number
}

export function Card({ title, subtitle, artVariant, to, width = 160 }: CardProps) {
  return (
    <Link to={to} className="acard no-underline text-inherit" style={{ width: `${width}px` } as React.CSSProperties}>
      <Artwork variant={artVariant} size={width} radius="md" />
      <div className="flex flex-col gap-1">
        <span className="text-label-l text-t1 truncate">{title}</span>
        <span className="text-label-s text-t3 truncate">{subtitle}</span>
      </div>
    </Link>
  )
}
