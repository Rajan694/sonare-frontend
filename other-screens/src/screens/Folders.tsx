import React, { useState } from 'react'
import { os } from '@neutralinojs/lib'
import { useLocalLibrary, localLibrary } from '../data/local'
import { showToast } from '../store/toastStore'
import Button, { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { EmptyState } from '../components/ui/EmptyState'
import { cn, formatBytes } from '../lib/utils'

function scannedAgo(ts: number) {
  if (!ts) return 'Not scanned yet'
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  return hours < 24 ? `${hours} h ago` : new Date(ts).toLocaleDateString()
}

export default function Folders() {
  const { folders, ready, scanning } = useLocalLibrary()
  const [busy, setBusy] = useState(false)

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      showToast({ title: `${label} failed`, description: e instanceof Error ? e.message : undefined, icon: 'info' })
    } finally {
      setBusy(false)
    }
  }

  const addFolder = () =>
    run('Adding folder', async () => {
      const folder = await localLibrary.addFolder()
      if (folder) showToast({ title: `Added ${folder.name}`, icon: 'folder', variant: 'gold' })
    })

  const rescan = (id?: string) =>
    run('Rescan', async () => {
      const r = await localLibrary.rescan(id)
      showToast({ title: 'Library rescanned', description: `${r.added} added · ${r.removed} removed`, icon: 'sync' })
    })

  const totalBytes = folders.reduce((n, f) => n + f.bytes, 0)
  const totalTracks = folders.filter(f => f.included).reduce((n, f) => n + f.trackCount, 0)

  return (
    <div className="@container flex flex-col p-4 @[480px]:p-8 gap-6 overflow-y-auto h-full bg-bg">
      {/* Header */}
      <div className="flex flex-col @[600px]:flex-row @[600px]:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-display-s @[600px]:text-display-m text-t1 font-bold tracking-tight">Music folders</span>
          <span className="text-body-m text-t2">
            {folders.length > 0
              ? `${totalTracks.toLocaleString()} songs across ${folders.length} folders · ${formatBytes(totalBytes)}`
              : 'Choose which folders Sonare scans on this device'}
          </span>
        </div>
        <div className="flex items-center gap-2.5 flex-none">
          <Button variant="out" icon="plus" onClick={addFolder} disabled={busy || !!scanning}>
            Add folder
          </Button>
          {folders.length > 0 && (
            <Button variant="gold" icon="sync" onClick={() => rescan()} disabled={busy || !!scanning}>
              Scan now
            </Button>
          )}
        </div>
      </div>

      {/* Scanning status banner */}
      {scanning && (
        <div className="surf2 flex flex-col gap-2.5 p-4 rounded-xl border border-ln2" role="status">
          <div className="flex items-center justify-between">
            <span className="text-body-m text-t1 font-medium">Scanning folders…</span>
            <span className="text-mono-s text-gold">{scanning.done} / {scanning.total} files</span>
          </div>
          <span className="track track-gold h-2 rounded-full overflow-hidden">
            <i style={{ width: `${scanning.total ? (scanning.done / scanning.total) * 100 : 0}%` }} />
          </span>
        </div>
      )}

      {!ready ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surf2 h-20 rounded-xl bg-s2/40" />
          ))}
        </div>
      ) : folders.length > 0 ? (
        <div className="flex flex-col gap-6">
          {/* Storage overview row */}
          <div className="grid grid-cols-1 @[840px]:grid-cols-3 gap-4">
            <div className="@[840px]:col-span-2 surf flex flex-col p-5 gap-3.5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-title-m text-t1 font-semibold">Device storage</span>
                  <span className="text-body-s text-t3">
                    {formatBytes(totalBytes)} of music across {folders.length} folders · {totalTracks.toLocaleString()} songs indexed
                  </span>
                </div>
              </div>
              <span className="track track-gold h-2.5 rounded-full overflow-hidden">
                <i style={{ width: `${Math.min(100, Math.max(8, (totalTracks / 2000) * 100))}%` }} />
              </span>
              <div className="flex flex-wrap items-center gap-5 pt-1">
                {folders.slice(0, 4).map((f, i) => {
                  const colors = ['var(--gold)', 'var(--blue)', 'var(--acc)', 'var(--t4)']
                  return (
                    <span key={f.id} className="flex items-center gap-2">
                      <i className="dot" style={{ background: colors[i % colors.length] }} />
                      <span className="text-body-s text-t2 truncate max-w-[120px]">{f.name}</span>
                      <span className="text-body-s text-t3 font-mono">{formatBytes(f.bytes)}</span>
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="empty p-4 @[480px]:p-5 rounded-2xl border-gold/30 bg-goldbg/20 justify-center">
              <span className="empty-ic w-10 h-10 rounded-full bg-gold/15 text-gold flex items-center justify-center mb-1">
                <Icon name="download" size={20} />
              </span>
              <span className="text-title-m text-gold font-semibold">Local audio formats</span>
              <span className="text-body-s text-t2">MP3, FLAC, M4A, AAC, OGG, OPUS, WAV</span>
            </div>
          </div>

          {/* Folders List */}
          <div className="flex flex-col gap-3">
            <span className="text-title-l text-t1 font-bold">Scanned folders</span>

            {/* Desktop Table View */}
            <div className="surf flex flex-col rounded-2xl divide-y divide-ln overflow-hidden">
              {/* Header row on wide screens */}
              <div className="hidden @[680px]:grid grid-cols-[36px_minmax(0,1.8fr)_minmax(0,2.2fr)_80px_80px_100px_140px] gap-4 items-center px-5 py-3 text-label-s text-t3 font-semibold uppercase tracking-wider bg-s0/50">
                <span></span>
                <span>FOLDER</span>
                <span>PATH</span>
                <span className="text-right">SONGS</span>
                <span className="text-right">SIZE</span>
                <span>LAST SCAN</span>
                <span className="text-right">ACTIONS</span>
              </div>

              {/* Rows */}
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className="flex flex-col @[680px]:grid @[680px]:grid-cols-[36px_minmax(0,1.8fr)_minmax(0,2.2fr)_80px_80px_100px_140px] gap-3 @[680px]:gap-4 items-start @[680px]:items-center px-4 @[480px]:px-5 py-3.5 hover:bg-s2/50 transition-colors"
                >
                  <span className={cn('icobox', folder.included ? 'icobox-gold' : '')}>
                    <Icon name={folder.id === 'downloads' ? 'download' : 'folder'} size={18} />
                  </span>

                  <div className="flex flex-col min-w-0">
                    <span className={cn('text-body-m font-medium truncate', folder.included ? 'text-t1' : 'text-t3')}>
                      {folder.name}
                    </span>
                    <span className="@[680px]:hidden text-mono-s text-t3 truncate">{folder.path}</span>
                  </div>

                  <span className="hidden @[680px]:block text-mono-s text-t3 truncate">
                    {folder.path}
                  </span>

                  <span className="hidden @[680px]:block text-mono-s text-t2 text-right">
                    {folder.trackCount.toLocaleString()}
                  </span>

                  <span className="hidden @[680px]:block text-mono-s text-t2 text-right">
                    {formatBytes(folder.bytes)}
                  </span>

                  <span className="hidden @[680px]:block text-body-s text-t3">
                    {scannedAgo(folder.lastScanAt)}
                  </span>

                  <div className="flex items-center justify-between @[680px]:justify-end w-full @[680px]:w-auto gap-2 pt-2 @[680px]:pt-0 border-t @[680px]:border-t-0 border-ln">
                    <span className="@[680px]:hidden text-body-s text-t3 font-mono">
                      {folder.trackCount} songs · {formatBytes(folder.bytes)}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <IconButton
                        icon="external"
                        label="Open folder"
                        size={28}
                        onClick={() => void os.open(`file://${folder.path}`)}
                      />
                      <IconButton
                        icon="sync"
                        label={`Rescan ${folder.name}`}
                        size={28}
                        disabled={busy || !!scanning}
                        onClick={() => rescan(folder.id)}
                      />
                      {folder.id !== 'downloads' && (
                        <IconButton
                          icon="trash"
                          label={`Remove ${folder.name}`}
                          size={28}
                          className="hover:text-red"
                          onClick={() => void localLibrary.removeFolder(folder.id)}
                        />
                      )}
                      <Switch
                        variant="gold"
                        checked={folder.included}
                        onCheckedChange={included => void localLibrary.setIncluded(folder.id, included)}
                        aria-label={`${folder.included ? 'Exclude' : 'Include'} ${folder.name}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <span className="text-body-s text-t4 pl-1">
              Removing a folder only forgets it — files on disk are never deleted.
            </span>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="folder"
          title="No music folders added"
          description="Add a folder on your device to listen to local FLAC, MP3, AAC, Opus and WAV files offline."
          action={<Button variant="gold" icon="plus" onClick={addFolder}>Add folder</Button>}
        />
      )}
    </div>
  )
}
