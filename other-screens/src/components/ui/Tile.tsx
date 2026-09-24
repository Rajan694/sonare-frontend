import React from 'react'
import { Link } from 'react-router-dom'
import Artwork from '../music/Artwork'
import Icon from './Icon'

interface TileProps {
  title: string
  subtitle: string
  artVariant?: any
  /** Where the tile navigates. Without it, clicking the tile plays. */
  to?: string
  thumbnail?: string
  /** Plays in place without leaving the screen (FLOWS M01 inner Play button). */
  onPlay?: () => void
}

export function Tile({ title, subtitle, artVariant = 'a1', to, thumbnail, onPlay }: TileProps) {
  const body = (
    <>
      <Artwork src={thumbnail} variant={artVariant} size={44} radius="xs" alt={title} />
      <span className="flex flex-col grow min-w-0">
        <span className="text-body-l text-t1 truncate">{title}</span>
        <span className="text-body-s text-t3 truncate">{subtitle}</span>
      </span>
    </>
  )

  return (
    <div className="relative group">
      {to ? (
        <Link to={to} className="tile no-underline text-inherit">{body}</Link>
      ) : (
        <button className="tile w-full text-left text-inherit cursor-pointer" onClick={onPlay}>{body}</button>
      )}
      {onPlay && to && (
        <button
          className="playbtn w-8 h-8 bg-acc absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label={`Play ${title}`}
          data-tip="Play"
          onClick={onPlay}
        >
          <Icon name="play" size={14} />
        </button>
      )}
    </div>
  )
}
