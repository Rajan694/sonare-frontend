import React from 'react'
import { Link } from 'react-router-dom'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import { useLyrics } from '../data/hooks'
import Artwork from '../components/music/Artwork'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../lib/utils'

export default function Lyrics() {
  const { mode } = useModeStore()
  const { state, currentTrack } = usePlayerStore()

  const { data: lyricsData, loading } = useLyrics(currentTrack?.id)
  const lines = lyricsData?.lines || currentTrack?.lyrics?.lines || []

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="music4"
          title="No track selected"
          description="Start playing a song to view lyrics"
          action={<Link to="/home" className="btn btn-acc">Go to Home</Link>}
        />
      </div>
    )
  }

  const currentLine = lines.findIndex((line, i) => {
    const next = lines[i + 1]
    return state.positionMs >= line.atMs && (!next || state.positionMs < next.atMs)
  })

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col grow items-center justify-center p-8 overflow-auto">
        <div className="flex flex-col gap-6 w-full max-w-[560px]">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-8 bg-s2/40 rounded w-3/4" />
              <div className="h-8 bg-s2/40 rounded w-1/2" />
              <div className="h-8 bg-s2/40 rounded w-2/3" />
              <div className="h-8 bg-s2/40 rounded w-3/5" />
            </div>
          ) : lines.length > 0 ? (
            lines.map((line, i) => (
              <button
                key={i}
                className={cn(
                  'text-display-m text-left bg-transparent border-0 p-0 cursor-default transition-opacity duration-300',
                  i === currentLine ? 'text-t1 font-bold opacity-100' : 'text-t3 font-normal opacity-50'
                )}
                aria-current={i === currentLine}
              >
                {line.text}
              </button>
            ))
          ) : (
            <div className="text-center text-t3 text-title-l">
              No lyrics available for this track
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-none p-8 gap-4 border-l border-ln w-[280px]">
        <Artwork
          src={currentTrack.thumbnail || `/api/v1/tracks/${currentTrack.id}/artwork?size=300`}
          alt={currentTrack.title}
          variant="a1"
          size={220}
          radius="xl"
          rings
        />
        <div className="flex flex-col gap-1">
          <span className="text-title-l text-t1 truncate">{currentTrack.title}</span>
          <span className="text-body-m text-t2 truncate">{currentTrack.artist}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <IconButton icon="download" label="Import lyrics" size={32} bordered />
          <IconButton icon="more" label="Lyrics options" size={32} />
        </div>
        <label className="flex items-center justify-between lrow border-t border-ln pt-4">
          <span className="text-body-m text-t1">Auto-scroll</span>
          <Switch checked={true} aria-label="Toggle auto-scroll" />
        </label>
      </div>
    </div>
  )
}
