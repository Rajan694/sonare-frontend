import React from 'react'
import { Link } from 'react-router-dom'
import { useModeStore } from '../store/modeStore'
import { usePlayerStore } from '../store/playerStore'
import SongRow from '../components/music/SongRow'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export default function Queue() {
  const { mode } = useModeStore()
  const { state, setState, playTrack } = usePlayerStore()
  const isOffline = mode === 'offline'
  
  const queue = isOffline ? state.queue.filter(t => t.source === 'local') : state.queue

  const handleClear = () => {
    setState({ queue: [], index: 0, positionMs: 0 })
  }

  const handleShuffle = () => {
    setState({ shuffle: !state.shuffle })
  }

  if (queue.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <EmptyState
          icon="list"
          title="Queue is empty"
          description="Add songs or play an album to start queueing tracks"
          action={<Link to="/home" className="btn btn-acc">Discover Music</Link>}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col grow overflow-auto p-8 gap-6">
        <div className="flex items-center justify-between">
          <span className="text-h1 text-t1">Queue</span>
          <div className="flex items-center gap-2">
            <IconButton icon="shuffle" label="Shuffle queue" size={32} active={state.shuffle} onClick={handleShuffle} />
            <Button variant="ghost" onClick={handleClear}>Clear queue</Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-0.5">
            {queue.slice(0, state.index + 1).map((track, i) => (
              <SongRow
                key={track.id}
                track={track}
                index={i + 1}
                isActive={i === state.index}
                isPlaying={i === state.index}
                onClick={() => setState({ index: i, positionMs: 0 })}
              />
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
                {queue.slice(state.index + 1).map((track, i) => {
                  const actualIdx = state.index + 1 + i
                  return (
                    <SongRow
                      key={track.id}
                      track={track}
                      index={actualIdx + 1}
                      onClick={() => setState({ index: actualIdx, positionMs: 0 })}
                    />
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
