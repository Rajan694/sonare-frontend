import React from 'react'
import { useFolders } from '../data/hooks'
import { localLibrary } from '../data/local'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { EmptyState } from '../components/ui/EmptyState'
import { formatBytes } from '../lib/utils'
import { cn } from '../lib/utils'

// TODO(neutralino): Real Neutralino filesystem selection and local scan will replace this browser fallback.

export default function Folders() {
  const { data: folders, loading, refetch } = useFolders()

  const handleToggleInclude = async (id: string, current: boolean) => {
    await localLibrary.setIncluded(id, !current)
    refetch()
  }

  const handleRemove = async (id: string) => {
    await localLibrary.removeFolder(id)
    refetch()
  }

  const handleAddFolder = async () => {
    const path = window.prompt('Enter folder path to add (e.g. /home/user/Music):')
    if (path) {
      await localLibrary.addFolder(path)
      refetch()
    }
  }

  const handleRescan = async (id: string) => {
    await localLibrary.rescan(id)
    refetch()
  }

  const folderList = folders || []

  return (
    <div className="flex flex-col p-8 gap-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-h1 text-t1">Local Music & Folders</span>
          <span className="text-body-m text-t2">Sonare scans these folders for music files</span>
        </div>
        <Button variant="acc" icon="plus" onClick={handleAddFolder}>Add Folder</Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surf2 h-24 rounded-lg bg-s2/40" />
          ))}
        </div>
      ) : folderList.length > 0 ? (
        <div className="flex flex-col gap-2">
          {folderList.map(folder => (
            <div key={folder.id} className="surf2 flex flex-col gap-3 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <span className={cn('icobox', folder.included ? 'icobox-acc' : '')}>
                  <Icon name="folder" size={16} />
                </span>
                <div className="flex flex-col grow min-w-0">
                  <span className="text-title-l text-t1 truncate">{folder.name}</span>
                  <span className="text-body-s text-t3 truncate">{folder.path}</span>
                  <span className="text-body-s text-t3 mt-0.5">
                    {folder.trackCount} tracks · {formatBytes(folder.bytes)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-body-m text-t2">Include</span>
                    <Switch
                      checked={folder.included}
                      onChange={() => handleToggleInclude(folder.id, folder.included)}
                      aria-label={`${folder.included ? 'Exclude' : 'Include'} ${folder.name}`}
                    />
                  </label>
                  <IconButton
                    icon="sync"
                    label="Rescan folder"
                    size={32}
                    onClick={() => handleRescan(folder.id)}
                  />
                  <IconButton
                    icon="trash"
                    label="Remove folder"
                    size={32}
                    className="hover:text-red"
                    onClick={() => handleRemove(folder.id)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="folder"
          title="No folders added"
          description="Add a folder on your device to listen to local FLAC, MP3, AAC and ALAC files"
          action={<Button variant="out" icon="plus" onClick={handleAddFolder}>Add Folder</Button>}
        />
      )}
    </div>
  )
}
