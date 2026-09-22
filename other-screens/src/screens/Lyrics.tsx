import React from 'react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import Artwork from '../components/music/Artwork'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { cn } from '../lib/utils'

const LINES = [
  { atMs: 0, text: 'The paper lanterns drift above the bay' },
  { atMs: 12000, text: 'Their light dissolves in salt-soaked air' },
  { atMs: 24000, text: 'I hear the echo of a distant train' },
  { atMs: 36000, text: 'And wonder if you feel it too out there' },
  { atMs: 48000, text: 'These hollow coasts that hold our younger days' },
  { atMs: 60000, text: 'In amber and in grey' },
  { atMs: 72000, text: 'The paper lanterns drift above the bay' },
]

export default function Lyrics() {
  const { mode } = useModeStore()
  const { state, currentTrack } = usePlayerStore()
  const currentLine = LINES.findIndex((line, i) => {
    const next = LINES[i + 1]
    return state.positionMs >= line.atMs && (!next || state.positionMs < next.atMs)
  })

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col grow items-center justify-center p-8 overflow-auto">
        <div className="flex flex-col gap-6 w-full max-w-[560px]">
          {LINES.map((line, i) => (
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
          ))}
        </div>
      </div>

      <div className="flex flex-col flex-none p-8 gap-4 border-l border-ln w-[280px]">
        <Artwork variant="a1" size={220} radius="xl" rings />
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
