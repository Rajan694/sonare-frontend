import React from 'react'
import { MOCK_FOLDERS } from '../data/mock'
import Button from '../components/ui/Button'
import { IconButton } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { Switch } from '../components/ui/Switch'
import { EmptyState } from '../components/ui/EmptyState'
import { formatBytes } from '../lib/utils'
import { cn } from '../lib/utils'

export default function Folders() {
  return (
    <div className="flex flex-col p-8 gap-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-h1 text-t1">Local Music & Folders</span>
          <span className="text-body-m text-t2">Sonare scans these folders for music files</span>
        </div>
        <Button variant="acc" icon="plus">Add Folder</Button>
      </div>

      <div className="flex flex-col gap-2">
        {MOCK_FOLDERS.map(folder => (
          <div key={folder.id} className="surf2 flex flex-col gap-3 p-4">
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
                <label className="flex items-center gap-2">
                  <span className="text-body-m text-t2">Include</span>
                  <Switch checked={folder.included} aria-label={`${folder.included ? 'Exclude' : 'Include'} ${folder.name}`} />
                </label>
                <IconButton icon="sync" label="Rescan folder" size={32} />
                <IconButton icon="trash" label="Remove folder" size={32} className="hover:text-red" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <EmptyState
        icon="folder"
        title="Add a folder to get started"
        description="Sonare supports FLAC, AAC, MP3, ALAC and more"
        action={<Button variant="out" icon="plus">Add Folder</Button>}
      />
    </div>
  )
}
