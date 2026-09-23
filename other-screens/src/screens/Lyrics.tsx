import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayerStore } from '../store/playerStore'
import { showToast } from '../store/toastStore'
import { useAsync, useLyrics } from '../data/hooks'
import { localLibrary } from '../data/local'
import { api } from '../data/api'
import Artwork, { trackArtwork } from '../components/music/Artwork'
import Button, { IconButton } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { EmptyState } from '../components/ui/EmptyState'
import { cn, formatDuration } from '../lib/utils'

const OFFSET_STEP_MS = 250
const AUTOSCROLL_KEY = 'sonare_lyrics_autoscroll'

function readAutoScroll(): boolean {
  try {
    return localStorage.getItem(AUTOSCROLL_KEY) !== 'false'
  } catch {
    return true
  }
}

function toLrc(lines: { atMs: number; text: string }[]): string {
  return lines
    .map(l => {
      const m = Math.floor(l.atMs / 60000)
      const s = ((l.atMs % 60000) / 1000).toFixed(2).padStart(5, '0')
      return `[${String(m).padStart(2, '0')}:${s}]${l.text}`
    })
    .join('\n')
}

export default function Lyrics() {
  const { state, currentTrack, seek } = usePlayerStore()

  // Local files keep lyrics on the device (saved edits or a sidecar .lrc); the server
  // only knows catalog tracks.
  const isLocal = currentTrack?.source === 'local'
  const server = useLyrics(currentTrack?.id)
  const local = useAsync(() => localLibrary.lyrics(currentTrack!.id), [currentTrack?.id], { enabled: !!isLocal })
  const { data: lyricsData, loading, refetch } = isLocal ? local : server
  const lines = lyricsData?.lines || currentTrack?.lyrics?.lines || []
  const synced = lyricsData?.synced ?? currentTrack?.lyrics?.synced ?? lines.length > 0

  // Positive offset shows each line later; negative, earlier.
  const [offsetMs, setOffsetMs] = useState(0)
  const [autoScroll, setAutoScroll] = useState(readAutoScroll)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    setOffsetMs(lyricsData?.offsetMs ?? currentTrack?.lyrics?.offsetMs ?? 0)
  }, [lyricsData, currentTrack?.id])

  const position = state.positionMs - offsetMs
  const currentLine = synced
    ? lines.findIndex((line, i) => {
        const next = lines[i + 1]
        return position >= line.atMs && (!next || position < next.atMs)
      })
    : -1

  useEffect(() => {
    if (!autoScroll || currentLine < 0) return
    lineRefs.current[currentLine]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentLine, autoScroll])

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

  const trackId = currentTrack.id

  function changeOffset(delta: number) {
    const next = offsetMs + delta
    setOffsetMs(next)
    const save = isLocal ? localLibrary.setLyricsOffset(trackId, next) : api.updateLyricsOffset(trackId, next)
    void save.catch(() => {
      showToast({ title: 'Could not save lyric offset', icon: 'info' })
    })
  }

  function toggleAutoScroll(on: boolean) {
    setAutoScroll(on)
    try {
      localStorage.setItem(AUTOSCROLL_KEY, String(on))
    } catch {
      // Preference just won't persist.
    }
  }

  function startEditing() {
    setDraft(synced ? toLrc(lines) : lyricsData?.plain ?? lines.map(l => l.text).join('\n'))
    setEditing(true)
  }

  async function saveEdit() {
    const text = draft.trim()
    const isLrc = /^\[\d{1,2}:\d{2}(\.\d+)?\]/m.test(text)
    try {
      const body = isLrc ? { lrc: text } : { plain: text }
      await (isLocal ? localLibrary.saveLyrics(trackId, body) : api.saveLyrics(trackId, body))
      setEditing(false)
      refetch()
      showToast({ title: 'Lyrics saved', icon: 'check', variant: 'acc' })
    } catch {
      showToast({ title: 'Could not save lyrics', icon: 'info' })
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col grow items-center p-8 overflow-auto">
        <div className="flex flex-col gap-6 w-full max-w-[560px] my-auto">
          {editing ? (
            <div className="flex flex-col gap-3">
              <span className="text-body-s text-t3">Paste LRC (<span className="kbd">[mm:ss.xx]</span> per line) for synced lyrics, or plain text.</span>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="surf2 min-h-[420px] p-4 text-body-m text-t1 font-mono bg-s1 border border-ln2 rounded-lg outline-none focus:border-acc resize-y"
                aria-label="Lyrics editor"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button variant="acc" onClick={saveEdit} disabled={!draft.trim()}>Save lyrics</Button>
              </div>
            </div>
          ) : loading ? (
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
                ref={el => {
                  lineRefs.current[i] = el
                }}
                className={cn(
                  'text-display-m text-left bg-transparent border-0 p-0 transition-opacity duration-300',
                  synced ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                  i === currentLine ? 'text-t1 font-bold opacity-100' : 'text-t3 font-normal opacity-50'
                )}
                aria-current={i === currentLine}
                title={synced ? `Jump to ${formatDuration(line.atMs + offsetMs)}` : undefined}
                onClick={synced ? () => seek(Math.max(0, line.atMs + offsetMs)) : undefined}
              >
                {line.text}
              </button>
            ))
          ) : lyricsData?.plain ? (
            <p className="text-title-l text-t2 whitespace-pre-line">{lyricsData.plain}</p>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center text-t3 text-title-l">
              No lyrics available for this track
              <Button variant="out" icon="plus" onClick={startEditing}>Add lyrics</Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-none p-8 gap-4 border-l border-ln w-[280px]">
        <Artwork
          src={trackArtwork(currentTrack, 300)}
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
          <Button variant="out" size="sm" icon="download" onClick={startEditing} disabled={editing}>
            {lines.length > 0 ? 'Edit lyrics' : 'Import lyrics'}
          </Button>
        </div>
        {synced && lines.length > 0 && (
          <div className="flex items-center justify-between lrow border-t border-ln pt-4">
            <span className="flex flex-col">
              <span className="text-body-m text-t1">Sync offset</span>
              <span className="text-body-s text-t3">{offsetMs > 0 ? '+' : ''}{(offsetMs / 1000).toFixed(2)}s</span>
            </span>
            <span className="flex items-center gap-1">
              <IconButton icon="minus" label="Show lyrics earlier" size={28} bordered onClick={() => changeOffset(-OFFSET_STEP_MS)} />
              <IconButton icon="plus" label="Show lyrics later" size={28} bordered onClick={() => changeOffset(OFFSET_STEP_MS)} />
            </span>
          </div>
        )}
        <label className="flex items-center justify-between lrow border-t border-ln pt-4 cursor-pointer">
          <span className="text-body-m text-t1">Auto-scroll</span>
          <Switch checked={autoScroll} onCheckedChange={toggleAutoScroll} aria-label="Toggle auto-scroll" />
        </label>
      </div>
    </div>
  )
}
