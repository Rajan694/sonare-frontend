import React from 'react'
import { Link } from 'react-router-dom'
import Artwork from '../music/Artwork'

interface TileProps {
  title: string
  subtitle: string
  artVariant?: any
  to: string
  thumbnail?: string
}

export function Tile({ title, subtitle, artVariant = 'a1', to, thumbnail }: TileProps) {
  return (
    <Link to={to} className="tile no-underline text-inherit">
      <Artwork src={thumbnail} variant={artVariant} size={44} radius="xs" alt={title} />
      <span className="flex flex-col grow min-w-0">
        <span className="text-body-l text-t1 truncate">{title}</span>
        <span className="text-body-s text-t3 truncate">{subtitle}</span>
      </span>
    </Link>
  )
}
