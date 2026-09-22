import React from 'react'
import { motion, Reorder } from 'motion/react'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import SongRow from '../components/music/SongRow'
import Artwork from '../components/music/Artwork'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { formatDuration } from '../lib/utils'
import { MOCK_TRACKS } from '../data/mock'
import { cn } from '../lib/utils'

export default function Queue() {
  const { mode } = useModeStore()
  const { state } = usePlayerStore()
  const isOffline = mode === 'offline'
  const queue = isOffline ? MOCK_TRACKS.filter(t => t.source === 'local') : MOCK_TRACKS

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col grow overflow-auto p-8 gap-6">
        <div className="flex items-center justify-between">
          <span className="text-h1 text-t1">Queue</span>
          <div className="flex items-center gap-2">
            <IconButton icon="shuffle" label="Shuffle queue" size={32} active={state.shuffle} />
            <Button variant="ghost">Clear queue</Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-0.5">
            {queue.slice(0, state.index + 1).map((track, i) => (
              <SongRow key={track.id} track={track} index={i + 1} isActive={i === state.index} isPlaying={i === state.index} />
            ))}
          </div>

          {state.index < queue.length - 1 && (
            <>
              <div className="flex items-center gap-3 py-3 px-3">
                <hr className="hr grow" />
                <span className="text-overline text-t3">Up next</span>
                <hr className="hr grow" />
              </div>
              <div className="flex flex-col gap-0.5">
                {queue.slice(state.index + 1).map((track, i) => (
                  <SongRow key={track.id} track={track} index={state.index + i + 2} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
