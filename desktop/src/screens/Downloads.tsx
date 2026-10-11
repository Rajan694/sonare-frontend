import React, { useEffect, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { CAPS } from '../lib/caps';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';
import { downloads, downloadProgress, useDownloads, type DownloadItem } from '../storage/downloads';
import { getLocation, loadLocation, subscribeLocation } from '../storage/downloadTargets';
import { showPathInFolder, useLocalLibrary } from '../storage/local';
import { usePlayerStore } from '../store/playerContext';
import { useModeStore } from '../store/modeContext';
import { showToast } from '../store/toasts';
import Artwork, { trackArtwork } from '../components/music/Artwork';
import Button, { IconButton } from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { EmptyState } from '../components/ui/EmptyState';
import { confirmDialog } from '../store/dialogs';

/**
 * Downloads (desktop and web): what's in progress, with pause / resume / delete, and what
 * has been saved. Deleting a saved song deletes its file from the folder it was saved to;
 * if the file has moved (or the browser saved it), it's only taken off this list.
 */

const sizeLine = (d: DownloadItem): string => {
  const pct = downloadProgress(d);
  if (d.totalBytes > 0)
    return `${formatBytes(d.receivedBytes)} of ${formatBytes(d.totalBytes)} · ${Math.round((pct ?? 0) * 100)}%`;
  return d.receivedBytes > 0 ? formatBytes(d.receivedBytes) : '';
};

const statusLine = (d: DownloadItem): string => {
  const size = sizeLine(d);
  switch (d.status) {
    case 'queued':
      return size ? `Waiting · ${size}` : 'Waiting';
    case 'downloading':
      return size || 'Starting…';
    case 'paused':
      return d.error ?? (size ? `Paused · ${size}` : 'Paused');
    case 'failed':
      return d.error ? `Failed · ${d.error}` : 'Failed';
    default:
      return '';
  }
};

const fileLine = (d: DownloadItem): string => {
  const parts = [
    d.codec && d.bitrateKbps ? `${d.codec} ${d.bitrateKbps} kbps` : d.codec,
    d.totalBytes ? formatBytes(d.totalBytes) : null,
    d.completedAt ? new Date(d.completedAt).toLocaleDateString() : null,
  ];
  return parts.filter(Boolean).join(' · ');
};

const confirmDelete = async (items: DownloadItem[]) => {
  const done = items.filter((d) => d.status === 'done');
  const what = items.length === 1 ? `"${items[0].title}"` : `${items.length} downloads`;
  const note =
    done.length === 0
      ? ''
      : done.every((d) => d.target === 'browser')
        ? " Sonare can't delete files the browser saved; remove them from your Downloads folder."
        : ' The file will be deleted from the folder it was saved to.';
  const ok = await confirmDialog({
    title: `Delete ${what}?`,
    description: note.trim() || undefined,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  let kept = 0;
  let reason: string | undefined;
  for (const d of items) {
    const r = await downloads.remove(d.id);
    if (!r.fileDeleted && d.status === 'done') {
      kept++;
      reason = r.reason;
    }
  }
  if (kept === 0) showToast({ title: items.length === 1 ? 'Download deleted' : 'Downloads deleted', icon: 'trash' });
  else if (items.length === 1) showToast({ title: 'Removed from downloads', description: reason, icon: 'info' });
  else
    showToast({
      title: 'Downloads removed',
      description: `${kept} files had moved or couldn't be deleted, so they were only removed from the list`,
      icon: 'info',
    });
};

const saveAgain = async (d: DownloadItem) => {
  if (!(await downloads.saveAgain(d.id))) {
    showToast({
      title: "Couldn't save it again",
      description: 'This browser no longer has a copy. Delete it here and download it again.',
      icon: 'info',
    });
  }
};

const Row = ({
  d,
  index,
  children,
  sub,
  subClass,
}: {
  d: DownloadItem;
  index: number;
  children: React.ReactNode;
  sub: React.ReactNode;
  subClass?: string;
}) => {
  return (
    <div className="flex items-center gap-3 px-3 @[480px]:px-4 py-2.5 min-h-[62px] hover:bg-s2/50 transition-colors">
      <Artwork
        src={trackArtwork({ id: d.id, source: 'server', thumbnail: d.thumbnail })}
        alt={d.title}
        variant={`a${(index % 12 || 12) as 1}`}
        size={44}
        radius="sm"
      />
      <div className="flex flex-col gap-1 grow min-w-0">
        <span className="text-title-m text-t1 font-medium truncate">{d.title}</span>
        <span className="text-body-s text-t2 truncate">{d.artist}</span>
        <div className={cn('text-body-s truncate', subClass ?? 'text-t3')}>{sub}</div>
      </div>
      <div className="flex items-center gap-1 flex-none">{children}</div>
    </div>
  );
};

const Downloads = () => {
  const { ready, items } = useDownloads();
  const local = useLocalLibrary();
  const { playTrack, currentTrack } = usePlayerStore();
  const { mode } = useModeStore();
  useEffect(() => {
    void loadLocation();
  }, []);
  const location = useSyncExternalStore(subscribeLocation, getLocation);

  const active = items.filter((d) => d.status !== 'done');
  const done = items.filter((d) => d.status === 'done');
  const running = active.filter((d) => d.status === 'queued' || d.status === 'downloading');
  const stopped = active.filter((d) => d.status === 'paused' || d.status === 'failed');
  const doneBytes = done.reduce((n, d) => n + d.totalBytes, 0);

  /** Desktop plays downloads from disk; a file that vanished is marked instead. */
  const missing = (d: DownloadItem) => CAPS.offlineDownloads && local.ready && !local.downloads.has(d.id);
  const playable = (d: DownloadItem) => mode === 'online' || !missing(d);

  const play = (d: DownloadItem) => {
    const queue = done.filter(playable).map(downloads.toTrack);
    const track = queue.find((t) => t.id === d.id);
    if (track) playTrack(track, queue);
  };

  const where = location.kind === 'browser' ? "your browser's Downloads folder" : location.label;

  return (
    <div className="@container flex flex-col p-4 @[480px]:p-8 gap-6 overflow-y-auto h-full bg-bg">
      <div className="flex flex-col @[600px]:flex-row @[600px]:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="phone-shell-hide text-display-s @[600px]:text-display-m text-t1 font-bold tracking-tight">
            Downloads
          </span>
          <span className="text-body-m text-t2 truncate" title={location.label}>
            {done.length} {done.length === 1 ? 'song' : 'songs'}
            {doneBytes > 0 && ` · ${formatBytes(doneBytes)}`} · saving to {where} ·{' '}
            <Link to="/settings?section=downloads" className="text-acc no-underline hover:underline">
              Change
            </Link>
          </span>
        </div>
        <div className="flex items-center gap-2.5 flex-none">
          {running.length > 0 && (
            <Button variant="out" icon="pause" onClick={() => void downloads.pauseAll()}>
              Pause all
            </Button>
          )}
          {stopped.length > 0 && (
            <Button variant="gold" icon="play" onClick={() => void downloads.resumeAll()}>
              Resume all
            </Button>
          )}
        </div>
      </div>

      {!ready ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="surf2 h-16 rounded-xl bg-s2/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="download"
          title="No downloads yet"
          description={
            CAPS.offlineDownloads
              ? 'Download songs, albums and playlists from their menu to play them offline.'
              : 'Download songs, albums and playlists from their menu to save the audio files.'
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-title-l text-t1 font-bold">In progress</span>
                <span className="text-body-s text-t3">
                  {running.length} active · {stopped.length} paused
                </span>
              </div>
              <div className="surf flex flex-col rounded-2xl divide-y divide-ln overflow-hidden">
                {active.map((d, i) => {
                  const pct = downloadProgress(d);
                  return (
                    <Row
                      key={d.id}
                      d={d}
                      index={i + 1}
                      subClass={d.status === 'failed' ? 'text-red' : undefined}
                      sub={
                        <span className="flex flex-col gap-1.5">
                          <span className="truncate">{statusLine(d)}</span>
                          {d.status !== 'failed' && (
                            <span
                              className={cn(
                                'track track-thin max-w-[420px]',
                                d.status === 'downloading' ? '' : 'track-gold opacity-70',
                              )}
                            >
                              <i style={{ width: `${Math.round((pct ?? 0) * 100)}%` }} />
                            </span>
                          )}
                        </span>
                      }
                    >
                      {d.status === 'queued' || d.status === 'downloading' ? (
                        <IconButton
                          icon="pause"
                          label={`Pause ${d.title}`}
                          tip="Pause"
                          size={32}
                          onClick={() => void downloads.pause(d.id)}
                        />
                      ) : (
                        <IconButton
                          icon={d.status === 'failed' ? 'sync' : 'play'}
                          label={`${d.status === 'failed' ? 'Retry' : 'Resume'} ${d.title}`}
                          tip={d.status === 'failed' ? 'Retry' : 'Resume'}
                          size={32}
                          onClick={() => void downloads.resume(d.id)}
                        />
                      )}
                      <IconButton
                        icon="close"
                        label={`Cancel ${d.title}`}
                        tip="Cancel and delete"
                        size={32}
                        onClick={() => void confirmDelete([d])}
                      />
                    </Row>
                  );
                })}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-title-l text-t1 font-bold">Downloaded</span>
                <Button variant="ghost" size="sm" icon="trash" onClick={() => void confirmDelete(done)}>
                  Delete all
                </Button>
              </div>
              <div className="surf flex flex-col rounded-2xl divide-y divide-ln overflow-hidden">
                {done.map((d, i) => {
                  const gone = missing(d);
                  return (
                    <Row
                      key={d.id}
                      d={d}
                      index={i + 1}
                      subClass={gone ? 'text-gold' : undefined}
                      sub={
                        gone
                          ? 'File moved or deleted outside Sonare'
                          : d.target === 'browser'
                            ? `${fileLine(d)} · saved by the browser`
                            : fileLine(d)
                      }
                    >
                      <IconButton
                        icon={currentTrack?.id === d.id ? 'music' : 'play'}
                        label={`Play ${d.title}`}
                        tip="Play"
                        size={32}
                        disabled={!playable(d)}
                        onClick={() => play(d)}
                      />
                      {d.target === 'native' && d.path && !gone && (
                        <IconButton
                          icon="folder"
                          label={`Show ${d.title} in folder`}
                          tip="Show in folder"
                          size={32}
                          onClick={() => void showPathInFolder(d.path!)}
                        />
                      )}
                      {d.target === 'browser' && d.copyKept && (
                        <IconButton
                          icon="download"
                          label={`Save ${d.title} again`}
                          tip="Save again"
                          size={32}
                          onClick={() => void saveAgain(d)}
                        />
                      )}
                      <IconButton
                        icon="trash"
                        label={`Delete ${d.title}`}
                        tip="Delete"
                        size={32}
                        className="hover:text-red"
                        onClick={() => void confirmDelete([d])}
                      />
                    </Row>
                  );
                })}
              </div>
              {done.some((d) => d.target === 'browser') && (
                <span className="text-body-s text-t4 pl-1">
                  <Icon name="info" size={12} className="inline -mt-0.5 mr-1" />
                  If a song didn't reach your Downloads folder (the browser can block several downloads in a row), use
                  Save again. Sonare keeps a copy in this browser until you delete the song here; the saved file itself
                  has to be deleted from your Downloads folder.
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default Downloads;
