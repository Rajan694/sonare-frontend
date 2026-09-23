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
  if (mins < 1) return 'Scanned just now'
  if (mins < 60) return `Scanned ${mins} min ago`
  const hours = Math.round(mins / 60)
  return hours < 24 ? `Scanned ${hours} h ago` : `Scanned ${new Date(ts).toLocaleDateString()}`
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
    <div className="flex flex-col p-8 gap-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-h1 text-t1">Local Music & Folders</span>
          <span className="text-body-m text-t2">
            {folders.length > 0
              ? `${totalTracks} songs on this device · ${formatBytes(totalBytes)}`
              : 'Sonare scans these folders for music files'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {folders.length > 0 && (
            <Button variant="out" icon="sync" onClick={() => rescan()} disabled={busy || !!scanning}>Rescan all</Button>
          )}
          <Button variant="gold" icon="plus" onClick={addFolder} disabled={busy || !!scanning}>Add folder</Button>
        </div>
      </div>

      {scanning && (
        <div className="surf2 flex flex-col gap-2 p-4 rounded-lg" role="status">
          <span className="text-body-m text-t1">Scanning… {scanning.done} / {scanning.total} files</span>
          <span className="track track-gold">
            <i style={{ width: `${scanning.total ? (scanning.done / scanning.total) * 100 : 0}%` }} />
          </span>
        </div>
      )}

      {!ready ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surf2 h-24 rounded-lg bg-s2/40" />
          ))}
        </div>
      ) : folders.length > 0 ? (
        <div className="flex flex-col gap-2">
          {folders.map(folder => (
            <div key={folder.id} className="surf2 flex items-start gap-3 p-4 rounded-lg">
              <span className={cn('icobox', folder.included && 'bg-goldbg text-gold')}>
                <Icon name={folder.id === 'downloads' ? 'download' : 'folder'} size={16} />
              </span>
              <div className="flex flex-col grow min-w-0">
                <span className="text-title-l text-t1 truncate">{folder.name}</span>
                <span className="text-body-s text-t3 truncate">{folder.path}</span>
                <span className="text-body-s text-t3 mt-0.5">
                  {folder.trackCount} tracks · {formatBytes(folder.bytes)} · {scannedAgo(folder.lastScanAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-body-m text-t2">Include</span>
                  <Switch
                    variant="gold"
                    checked={folder.included}
                    onCheckedChange={included => void localLibrary.setIncluded(folder.id, included)}
                    aria-label={`${folder.included ? 'Exclude' : 'Include'} ${folder.name}`}
                  />
                </label>
                <IconButton
                  icon="external"
                  label="Open in file manager"
                  size={32}
                  onClick={() => void os.open(`file://${folder.path}`)}
                />
                <IconButton
                  icon="sync"
                  label={`Rescan ${folder.name}`}
                  size={32}
                  disabled={busy || !!scanning}
                  onClick={() => rescan(folder.id)}
                />
                {folder.id !== 'downloads' && (
                  <IconButton
                    icon="trash"
                    label={`Remove ${folder.name}`}
                    size={32}
                    className="hover:text-red"
                    onClick={() => void localLibrary.removeFolder(folder.id)}
                  />
                )}
              </div>
            </div>
          ))}
          <span className="text-body-s text-t4">Removing a folder only forgets it — files on disk are never deleted.</span>
        </div>
      ) : (
        <EmptyState
          icon="folder"
          title="No folders added"
          description="Add a folder on your device to listen to local FLAC, MP3, AAC, Opus and WAV files"
          action={<Button variant="gold" icon="plus" onClick={addFolder}>Add folder</Button>}
        />
      )}
    </div>
  )
}
