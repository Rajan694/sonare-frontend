import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { CAPS } from '../../lib/caps';
import { downloads, useDownloads } from '../../storage/downloads';
import { showToast } from '../../store/toasts';
import type { Track } from '../../types';
import { confirmDialog } from '../../store/dialogs';

/**
 * Download for a set of tracks (FLOWS M06 / D06): album, playlist, top result.
 * Songs join the download queue (storage/downloads.ts); progress shows here and on the
 * Downloads screen. Hidden while offline - there is nothing to download from.
 */
const DownloadButton = ({ tracks, offline }: { tracks: Track[]; offline: boolean }) => {
  const { byId } = useDownloads();

  if (!CAPS.downloads) return null;
  const server = tracks.filter((t) => t.source !== 'local');
  if (server.length === 0) return null;

  const mine = server.map((t) => byId.get(t.id));
  const done = mine.filter((d) => d?.status === 'done').length;
  const active = mine.filter((d) => d?.status === 'queued' || d?.status === 'downloading').length;
  const all = done === server.length;

  const downloadAll = async () => {
    await downloads.enqueue(server);
    const left = server.length - done;
    showToast({
      title: 'Added to downloads',
      description: server.length === 1 ? server[0].title : `${left} ${left === 1 ? 'song' : 'songs'}`,
      icon: 'download',
      variant: 'gold',
    });
  };

  const removeAll = async () => {
    const ok = await confirmDialog({
      title: `Delete ${server.length} downloaded songs?`,
      description: 'Sonare removes the files from the folder they were saved to.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    const kept = await downloads.removeMany(server.map((t) => t.id));
    showToast(
      kept
        ? {
            title: 'Downloads removed',
            description: `${kept} files had moved or couldn't be deleted, so they were only removed from the list`,
            icon: 'info',
          }
        : { title: 'Downloads deleted', icon: 'trash' },
    );
  };

  if (active > 0) {
    return (
      <Link to="/downloads" className="no-underline">
        <Button variant="out" icon="loader" className="[&_svg]:animate-spin">
          Downloading {done}/{server.length}
        </Button>
      </Link>
    );
  }
  if (all) {
    return (
      <Button variant="gold" icon="check" onClick={removeAll} data-tip="Delete downloads">
        Downloaded
      </Button>
    );
  }
  if (offline) return null;
  return (
    <Button variant="out" icon="download" onClick={downloadAll}>
      {done > 0 ? `Download ${server.length - done} more` : 'Download'}
    </Button>
  );
};
export default DownloadButton;
