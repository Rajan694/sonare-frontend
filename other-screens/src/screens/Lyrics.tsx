import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export default function Lyrics() {
  const navigate = useNavigate()
  const exit = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/now-playing'))
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
  const activeLineIndex = showSynced
    ? lines.findIndex((line, i) => {
        const next = lines[i + 1]
        return position >= line.atMs && (!next || position < next.atMs)
      })
    : -1

  useEffect(() => {
    if (!autoScroll || activeLineIndex < 0) return
    lineRefs.current[activeLineIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeLineIndex, autoScroll])

  if (!currentTrack) {
    return (
      <div className="@container flex items-center justify-center h-full p-8">
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
    <div className="@container relative flex flex-col w-full h-full overflow-hidden bg-bg text-t1 select-none">
      {/* Ambient background glow */}
      <div className="ambient pointer-events-none" aria-hidden>
        <i
          className={cn(
            isOffline ? 'bg-gold' : 'bg-[#2A5AA8]',
            'w-[400px] h-[400px] @3xl:w-[560px] @3xl:h-[560px] -top-[160px] @3xl:-top-[280px] -left-[100px] @3xl:-left-[180px]'
          )}
          style={{ opacity: isOffline ? 0.16 : 0.45 }}
        />
        <i
          className="bg-[#6B3FA0] w-[350px] h-[350px] @3xl:w-[420px] @3xl:h-[420px] -top-[80px] @3xl:-top-[100px] -right-[100px] @3xl:-right-[120px]"
          style={{ opacity: 0.3 }}
        />
      </div>

      {/* Mobile Top bar (< 3xl) */}
      <header className="relative z-10 flex @3xl:hidden items-center justify-between flex-none h-14 px-4 border-b border-ln bg-s0/40 backdrop-blur-md">
        <button onClick={exit} className="ib ib-32 text-t2 hover:text-t1 flex items-center justify-center" aria-label="Back">
          <Icon name="chevron-left" size={20} />
        </button>
        <span className="text-title-m font-semibold text-t1">Lyrics</span>
        <div className="w-8" />
      </header>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col @3xl:flex-row grow gap-6 @3xl:gap-10 px-5 @sm:px-8 @3xl:px-10 pt-4 @3xl:pt-8 pb-4 overflow-hidden">
        {/* Left Column: Artwork + Metadata + Actions */}
        <aside className="flex flex-col flex-none w-full @3xl:w-[300px] @4xl:w-[320px] gap-4 @3xl:gap-5 overflow-y-auto overflow-x-hidden">
          <div className="flex @3xl:flex-col items-center @3xl:items-start gap-4">
            <Artwork
              src={trackArtwork(currentTrack, 640)}
              alt={currentTrack.title}
              variant="a1"
              radius="lg"
              rings
              className="shadow-e4 flex-none w-16 h-16 @sm:w-20 @sm:h-20 @3xl:w-[300px] @3xl:h-[300px] rounded-lg @3xl:rounded-xl"
            />
            <div className="flex flex-col min-w-0 gap-1 grow">
              <span className="text-h3 @3xl:text-h2 font-semibold text-t1 truncate">{currentTrack.title}</span>
              <span className="text-body-s @3xl:text-body-m text-t2 truncate">
                {[currentTrack.artist, currentTrack.album].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>

          {hasLyrics && (
            <div className="flex flex-wrap items-center gap-2">
              {source && (
                <span
                  className={cn(
                    'badge',
                    isLocal ? 'bg-local' : 'bg-cloud'
                  )}
                >
                  <Icon name={isLocal ? 'smartphone' : 'cloud'} size={10} />
                  <span>{source}</span>
                </span>
              )}
              <span className="badge bg-neutral">{synced && lines.length > 0 ? 'Synced' : 'Plain text'}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="out"
                size="sm"
                icon={hasLyrics ? 'edit' : 'plus'}
                onClick={startEditing}
                disabled={editing || loading}
                className="flex-1"
              >
                {hasLyrics ? 'Edit lyrics' : 'Add lyrics'}
              </Button>
              <Button
                variant="out"
                size="sm"
                icon="download"
                onClick={importFile}
                disabled={editing || loading}
                className="flex-1"
              >
                Import .lrc
              </Button>
            </div>
            <input ref={fileInput} type="file" accept=".lrc,.txt,text/plain" className="hidden" onChange={onFileChosen} />

            {/* Sync offset control */}
            {synced && lines.length > 0 && (
              <div className="flex items-center justify-between gap-2 h-8.5 pl-3.5 pr-1 rounded-full border border-ln2 bg-s1/60">
                <span className="text-label-s font-semibold text-t1 flex items-center gap-1.5">
                  <span>Offset</span>
                  <span className="text-mono-s text-t3">
                    {offsetMs > 0 ? '+' : offsetMs < 0 ? '−' : ''}
                    {(Math.abs(offsetMs) / 1000).toFixed(1)}s
                  </span>
                </span>
                <span className="flex items-center gap-0.5">
                  <IconButton icon="minus" label="Show lyrics earlier" size={28} onClick={() => changeOffset(-OFFSET_STEP_MS)} />
                  <IconButton icon="plus" label="Show lyrics later" size={28} onClick={() => changeOffset(OFFSET_STEP_MS)} />
                </span>
              </div>
            )}
          </div>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-body-m text-t1">Auto-scroll</span>
            <Switch checked={autoScroll} onCheckedChange={toggleAutoScroll} aria-label="Toggle auto-scroll" />
          </label>
        </aside>

        {/* Right Column: Lyrics Viewport & Chips */}
        <section className="flex flex-col grow gap-4 @3xl:gap-5 min-w-0 overflow-hidden" aria-label="Lyrics">
          {hasLyrics && !editing && (
            <div className="flex items-center justify-between gap-2 flex-none shrink-0 min-h-8">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap shrink-0">
                <button
                  className={cn('chip chip-sm flex-none shrink-0 h-8 whitespace-nowrap inline-flex items-center', showSynced && 'chip-on')}
                  disabled={!synced || lines.length === 0}
                  onClick={() => setView('synced')}
                >
                  <Icon name="sync" size={13} />
                  <span>Synced</span>
                </button>
                <button
                  className={cn('chip chip-sm flex-none shrink-0 h-8 whitespace-nowrap inline-flex items-center', !showSynced && 'chip-on')}
                  onClick={() => setView('plain')}
                >
                  <span>Plain text</span>
                </button>
                {synced && lines.length > 0 && (
                  <span className="chip chip-sm text-t3 flex-none shrink-0 h-8 whitespace-nowrap inline-flex items-center">
                    <Icon name="clock" size={13} />
                    <span>Offset {offsetMs > 0 ? '+' : offsetMs < 0 ? '−' : ''}{(Math.abs(offsetMs) / 1000).toFixed(1)}s</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col grow overflow-y-auto pr-2 @3xl:pr-6 pb-12">
            {editing ? (
              <div className="flex flex-col gap-3">
                <span className="text-body-s text-t3">
                  Paste LRC (<span className="kbd">[mm:ss.xx]</span> per line) for synced lyrics, or plain text.
                </span>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  className="surf2 min-h-[380px] p-4 text-body-m text-t1 font-mono bg-s1 border border-ln2 rounded-lg outline-none focus:border-acc resize-y"
                  aria-label="Lyrics editor"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="acc" onClick={saveEdit} disabled={!draft.trim()}>
                    Save lyrics
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <div className="flex flex-col gap-6 animate-pulse pt-4">
                <div className="h-8 bg-s2/40 rounded w-3/4" />
                <div className="h-8 bg-s2/40 rounded w-1/2" />
                <div className="h-8 bg-s2/40 rounded w-2/3" />
                <div className="h-8 bg-s2/40 rounded w-3/5" />
              </div>
            ) : showSynced ? (
              <div className="flex flex-col gap-4 @3xl:gap-5 pt-2">
                {lines.map((line, i) => {
                  const isActive = i === activeLineIndex
                  return (
                    <button
                      key={i}
                      ref={el => {
                        lineRefs.current[i] = el
                      }}
                      className="flex items-start gap-3.5 @3xl:gap-4 text-left bg-transparent border-0 p-0 cursor-pointer group"
                      aria-current={isActive}
                      data-tip={`Jump to ${formatDuration(line.atMs + offsetMs)}`}
                      onClick={() => seek(Math.max(0, line.atMs + offsetMs))}
                    >
                      <span
                        className={cn(
                          'text-mono-s @3xl:text-mono-m w-9 pt-1.5 flex-none font-medium',
                          isActive ? (isOffline ? 'text-gold' : 'text-acc') : 'text-t4'
                        )}
                      >
                        {formatDuration(line.atMs + offsetMs)}
                      </span>
                      <span
                        className={cn(
                          'text-h2 @sm:text-display-m @3xl:text-display-m font-bold leading-tight transition-all duration-300',
                          isActive
                            ? 'text-t1 opacity-100 scale-[1.01] origin-left'
                            : 'text-t3 opacity-[0.42] group-hover:opacity-75'
                        )}
                        style={isActive ? { textShadow: glow } : undefined}
                      >
                        {line.text || '♪'}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : plainText ? (
              <p className="text-h2 text-t2 whitespace-pre-line leading-[1.7] pt-2">{plainText}</p>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 grow text-center py-16">
                <Icon name="lyrics" size={36} className="text-t4" />
                <span className="text-title-l text-t2 font-semibold">No lyrics available for this track</span>
                <span className="text-body-s text-t3">Add them yourself, or import an .lrc file.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

