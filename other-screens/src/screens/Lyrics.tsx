import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayerStore } from '../store/playerStore'
import { useModeStore } from '../store/modeStore'
import { showToast } from '../store/toastStore'
import { useAsync, useLyrics } from '../data/hooks'
import { localLibrary } from '../data/local'
import { api } from '../data/api'
import { requireAccount } from '../data/accountGate'
import { isAuthenticated } from '../data/auth'
import Artwork, { trackArtwork } from '../components/music/Artwork'
import Button, { IconButton } from '../components/ui/Button'
import { Badge, Chip } from '../components/ui/ChipBadge'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { EmptyState } from '../components/ui/EmptyState'
import { cn, formatDuration } from '../lib/utils'

const OFFSET_STEP_MS = 250
const AUTOSCROLL_KEY = 'sonare_lyrics_autoscroll'

const PROVIDERS: Record<string, string> = { lrclib: 'LRCLIB', genius: 'Genius', tags: 'File tags', user: 'Your edit' }

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

/** FLOWS D11: artwork and lyric actions on the left, time-stamped lines on the right. */
export default function Lyrics() {
  const { state, currentTrack, seek } = usePlayerStore()
  const { mode } = useModeStore()
  const isOffline = mode === 'offline'

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
  // Synced lyrics can also be read as plain text, without timestamps or the moving highlight.
  const [view, setView] = useState<'synced' | 'plain'>('synced')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setOffsetMs(lyricsData?.offsetMs ?? currentTrack?.lyrics?.offsetMs ?? 0)
  }, [lyricsData, currentTrack?.id])

  const showSynced = synced && lines.length > 0 && view === 'synced'
  const position = state.positionMs - offsetMs
  const currentLine = showSynced
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
          icon="lyrics"
          title="No track selected"
          description="Start playing a song to view lyrics"
          action={<Link to="/home" className="btn btn-acc">Go to Home</Link>}
        />
      </div>
    )
  }

  const trackId = currentTrack.id
  const plainText = lyricsData?.plain ?? (lines.length > 0 ? lines.map(l => l.text).join('\n') : '')
  const hasLyrics = lines.length > 0 || !!plainText
  const source =
    lyricsData?.provider === 'lrc'
      ? `${(currentTrack.localPath?.split(/[\\/]/).pop() ?? currentTrack.title).replace(/\.[^.]+$/, '')}.lrc`
      : lyricsData?.provider && PROVIDERS[lyricsData.provider]

  // Server lyrics are saved to the account; a guest signs in first and then carries on here.
  const needsAccount = !isLocal && !isAuthenticated()
  const askToSignIn = () => requireAccount('Create a free account to fix lyrics and their timing.', () => {})

  function changeOffset(delta: number) {
    if (needsAccount) return askToSignIn()
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
    if (needsAccount) return askToSignIn()
    setDraft(synced ? toLrc(lines) : plainText)
    setEditing(true)
  }

  function importFile() {
    if (needsAccount) return askToSignIn()
    fileInput.current?.click()
  }

  // An imported .lrc (or .txt) opens in the editor, to check before saving.
  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setDraft(await file.text())
      setEditing(true)
    } catch {
      showToast({ title: 'Could not read that file', icon: 'info' })
    }
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

  const glow = isOffline ? '0 0 30px rgba(255,194,77,.35)' : '0 0 30px rgba(0,226,138,.35)'

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Inline opacity: `.ambient i` in sonare.css would outrank a utility class. */}
      <div className="ambient" aria-hidden>
        <i className={cn(isOffline ? 'bg-gold' : 'bg-acc', 'w-[620px] h-[620px] -top-[300px] -left-[180px]')} style={{ opacity: 0.16 }} />
        <i className="bg-s2 w-[460px] h-[460px] -top-[120px] -right-[120px]" />
      </div>

      <div className="relative flex grow gap-10 px-10 pt-8 overflow-hidden">
        {/* Short windows scroll this column; the artwork shrinks to fit beside the scrollbar. */}
        <aside className="flex flex-col flex-none w-[340px] gap-5 pb-8 overflow-y-auto overflow-x-hidden">
          <Artwork
            src={trackArtwork(currentTrack, 640)}
            alt={currentTrack.title}
            variant="a1"
            radius="lg"
            rings
            className="shadow-e4 flex-none w-full aspect-square"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-h2 text-t1">{currentTrack.title}</span>
            <span className="text-body-m text-t2">
              {[currentTrack.artist, currentTrack.album].filter(Boolean).join(' · ')}
            </span>
          </div>
          {hasLyrics && (
            <div className="flex flex-wrap items-center gap-2">
              {source && (
                <Badge variant={isLocal ? 'local' : 'cloud'} icon={isLocal ? 'smartphone' : 'cloud'}>{source}</Badge>
              )}
              <Badge>{synced && lines.length > 0 ? 'Synced' : 'Plain text'}</Badge>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="out" size="sm" icon={hasLyrics ? 'edit' : 'plus'} onClick={startEditing} disabled={editing || loading}>
              {hasLyrics ? 'Edit lyrics' : 'Add lyrics'}
            </Button>
            <Button variant="out" size="sm" icon="download" onClick={importFile} disabled={editing || loading}>
              Import .lrc file
            </Button>
            <input ref={fileInput} type="file" accept=".lrc,.txt,text/plain" className="hidden" onChange={onFileChosen} />
            {synced && lines.length > 0 && (
              <div className="flex items-center justify-between gap-2 h-8 pl-[14px] pr-1 rounded-full border border-ln2">
                <span className="text-[13px] font-semibold text-t1">
                  Sync offset <span className="text-mono-m text-t3">{offsetMs > 0 ? '+' : offsetMs < 0 ? '−' : ''}{(Math.abs(offsetMs) / 1000).toFixed(2)}s</span>
                </span>
                <span className="flex items-center gap-1">
                  <IconButton icon="minus" label="Show lyrics earlier" size={28} onClick={() => changeOffset(-OFFSET_STEP_MS)} />
                  <IconButton icon="plus" label="Show lyrics later" size={28} onClick={() => changeOffset(OFFSET_STEP_MS)} />
                </span>
              </div>
            )}
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-body-m text-t1">Auto-scroll</span>
            <Switch checked={autoScroll} onCheckedChange={toggleAutoScroll} aria-label="Toggle auto-scroll" />
          </label>
        </aside>

        <section className="flex flex-col grow gap-5 min-w-0 overflow-hidden" aria-label="Lyrics">
          {hasLyrics && !editing && (
            <div className="flex items-center gap-2 flex-none">
              <Chip size="sm" icon="sync" active={showSynced} disabled={!synced || lines.length === 0} onClick={() => setView('synced')}>
                Synced
              </Chip>
              <Chip size="sm" active={!showSynced} onClick={() => setView('plain')}>
                Plain text
              </Chip>
            </div>
          )}

          <div className="flex flex-col grow overflow-y-auto pr-5 pb-10">
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
              <div className="flex flex-col gap-6 animate-pulse">
                <div className="h-8 bg-s2/40 rounded w-3/4" />
                <div className="h-8 bg-s2/40 rounded w-1/2" />
                <div className="h-8 bg-s2/40 rounded w-2/3" />
                <div className="h-8 bg-s2/40 rounded w-3/5" />
              </div>
            ) : showSynced ? (
              <div className="flex flex-col gap-[22px]">
                {lines.map((line, i) => {
                  const active = i === currentLine
                  return (
                    <button
                      key={i}
                      ref={el => {
                        lineRefs.current[i] = el
                      }}
                      className="flex items-start gap-4 text-left bg-transparent border-0 p-0 cursor-pointer group"
                      aria-current={active}
                      data-tip={`Jump to ${formatDuration(line.atMs + offsetMs)}`}
                      onClick={() => seek(Math.max(0, line.atMs + offsetMs))}
                    >
                      <span className={cn('text-mono-m w-[38px] pt-2.5 flex-none', active ? (isOffline ? 'text-gold' : 'text-acc') : 'text-t4')}>
                        {formatDuration(line.atMs + offsetMs)}
                      </span>
                      <span
                        className={cn(
                          'text-display-m transition-opacity duration-300',
                          active ? 'text-t1' : 'text-t3 opacity-[0.42] group-hover:opacity-70'
                        )}
                        style={active ? { textShadow: glow } : undefined}
                      >
                        {line.text || '♪'}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : plainText ? (
              <p className="text-h2 text-t2 whitespace-pre-line leading-[1.6]">{plainText}</p>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 grow text-center">
                <Icon name="lyrics" size={32} className="text-t4" />
                <span className="text-title-l text-t2">No lyrics available for this track</span>
                <span className="text-body-s text-t3">Add them yourself, or import an .lrc file.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
