import React from 'react'
import { Link } from 'react-router-dom'
import Artwork from '../music/Artwork'
import Icon from './Icon'

interface CardProps {
  title: string
  subtitle: string
  artVariant?: any
  /** Where the card navigates. Without it, clicking the card plays. */
  to?: string
  thumbnail?: string
  width?: number
  /** Plays in place without leaving the screen. */
  onPlay?: () => void
  /** Opens the item's menu: from a "More options" button on hover, or a right-click. */
  onMore?: (e: React.MouseEvent) => void
}

export function Card({ title, subtitle, artVariant = 'a1', to, thumbnail, width = 160, onPlay, onMore }: CardProps) {
  const body = (
    <>
      <Artwork src={thumbnail} variant={artVariant} size={width} radius="md" alt={title} />
      <div className="flex flex-col gap-1">
        <span className="text-label-l text-t1 truncate">{title}</span>
        <span className="text-label-s text-t3 truncate">{subtitle}</span>
      </div>
    </>
  )
  const style = { width: `${width}px` } as React.CSSProperties

  return (
    <div className="relative group flex-none" style={style} onContextMenu={onMore}>
      {to ? (
        <Link to={to} className="acard no-underline text-inherit" style={style}>{body}</Link>
      ) : (
        <button className="acard text-left text-inherit bg-transparent border-0 p-0 cursor-pointer" style={style} onClick={onPlay}>{body}</button>
      )}
      {onPlay && (
        <button
          className="playbtn playbtn-40 bg-acc shadow-glow-s absolute opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          style={{ top: width - 48, right: 8 }}
          aria-label={`Play ${title}`}
          data-tip="Play"
          onClick={onPlay}
        >
          <Icon name="play" size={16} />
        </button>
      )}
      {onMore && (
        <button
          className="ib ib-28 absolute top-2 right-2 bg-black/60 text-t1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label={`More options for ${title}`}
          data-tip="More options"
          onClick={onMore}
        >
          <Icon name="more" size={14} />
        </button>
      )}
    </div>
  )
}
