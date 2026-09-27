import { CAPS } from '../../lib/caps';
import { cn } from '../../lib/utils';
import { downloadProgress, downloads, useDownload } from '../../data/downloads';
import { useModeStore } from '../../store/modeStore';
import { showToast } from '../../store/toastStore';
import { IconButton } from '../ui/Button';
import Icon from '../ui/Icon';
import type { Track } from '../../data/types';

export async function startTrackDownload(track: Track): Promise<void> {
  await downloads.enqueue([track]);
  showToast({ title: 'Added to downloads', description: track.title, icon: 'download', variant: 'gold' });
}

export async function deleteTrackDownload(track: Track): Promise<void> {
  const { fileDeleted, reason } = await downloads.remove(track.id);
  showToast(
    fileDeleted
      ? { title: 'Download deleted', description: track.title, icon: 'trash' }
      : { title: 'Removed from downloads', description: reason, icon: 'info' },
  );
}

/**
 * One track's download control for the players: Download → progress ring (click pauses)
 * → gold check (click deletes, after asking). Paused or failed shows Resume. Nothing for
 * local files, or for a song with no download while offline.
 */
export default function TrackDownloadButton({
  track,
  size = 32,
  className,
}: {
  track: Track;
  size?: 32 | 40 | 44;
  className?: string;
}) {
  const download = useDownload(track.id);
  const { mode } = useModeStore();

  if (!CAPS.downloads || track.source === 'local') return null;

  if (download?.status === 'done') {
    return (
      <IconButton
        icon="check"
        label="Downloaded - delete download"
        tip="Downloaded"
        size={size}
        className={cn(className, 'text-gold')}
        onClick={() => {
          if (window.confirm(`Delete the download of "${track.title}"? The file is removed from its folder.`))
            void deleteTrackDownload(track);
        }}
      />
    );
  }

  if (download?.status === 'queued' || download?.status === 'downloading') {
    const ratio = downloadProgress(download) ?? 0;
    const pct = Math.round(ratio * 100);
    const box = { 32: 'w-8 h-8', 40: 'w-10 h-10', 44: 'w-11 h-11' }[size];
    const ring = size - 8;
    const r = ring / 2 - 1.5;
    const circ = 2 * Math.PI * r;
    return (
      <button
        className={cn('ib relative', box, className, 'text-gold')}
        aria-label={`Downloading ${pct}% - pause`}
        data-tip={download.status === 'queued' ? 'Waiting to download' : `Downloading ${pct}%`}
        onClick={() => void downloads.pause(track.id)}
      >
        <svg width={ring} height={ring} className="absolute -rotate-90" aria-hidden>
          <circle cx={ring / 2} cy={ring / 2} r={r} fill="none" stroke="var(--ln2)" strokeWidth={2} />
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - ratio)}
            className="transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        <Icon name="pause" size={size <= 32 ? 10 : 12} />
      </button>
    );
  }

  if (download) {
    return (
      <IconButton
        icon="download"
        label={download.status === 'failed' ? 'Download failed - retry' : 'Resume download'}
        size={size}
        className={cn(className, 'text-gold')}
        onClick={() => void downloads.resume(track.id)}
      />
    );
  }

  if (mode === 'offline') return null;
  return (
    <IconButton
      icon="download"
      label="Download"
      size={size}
      className={className}
      onClick={() => void startTrackDownload(track)}
    />
  );
}
