import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, MenuItem } from '../ui/Menu';
import Icon from '../ui/Icon';
import { usePlayerStore } from '../../store/playerContext';
import { showToast } from '../../store/toasts';
import { useMyPlaylists, useLibraryAlbums, useSavedPlaylists, notifyPlaylistsChanged } from '../../api/hooks';
import { fetchAllPages } from '../../../../shared/api/pages';
import { api } from '../../api/api';
import { requireAccount } from '../../api/accountGate';
import { isAuthenticated } from '../../api/auth';
import { useFavourite } from '../../api/favourites';
import type { Track, Album, Playlist } from '../../types';
import { CAPS } from '../../lib/caps';
import { localLibrary } from '../../storage/local';
import { downloads, useDownload } from '../../storage/downloads';
import { useModeStore } from '../../store/modeContext';
import { deleteTrackDownload, startTrackDownload } from './TrackDownloadButton';
import { addTracksWithToast, createPlaylistWithPrompt, renamePlaylistWithPrompt } from '../../api/newPlaylist';
import { addToPlaylistDialog, confirmDialog } from '../../store/dialogs';

/**
 * One context menu for every track list (FLOWS §3 D05): right-click a row, or press its
 * "more" button. A module-level store keeps rows free of menu state. The same menu serves
 * the user's own playlists, adding "Delete playlist".
 */

export interface CollectionTarget {
  kind: 'album' | 'playlist';
  id: string;
  title: string;
  raw?: Album | Playlist;
  loadTracks?: () => Promise<Track[]>;
}

interface MenuTarget {
  tracks: Track[];
  /** One of the user's playlists: the menu ends with "Delete playlist". */
  playlist?: { id: string; name: string };
  collection?: CollectionTarget;
  x: number;
  y: number;
}

let target: MenuTarget | null = null;
const listeners = new Set<() => void>();

const set = (next: MenuTarget | null) => {
  target = next;
  for (const l of listeners) l();
};

/** Open for an album or playlist (a search result) whose songs aren't loaded yet. */
export const openCollectionMenu = (collection: CollectionTarget, e: React.MouseEvent): void => {
  e.preventDefault();
  e.stopPropagation();
  if (e.type === 'contextmenu') {
    set({ tracks: [], collection, x: e.clientX, y: e.clientY });
  } else {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    set({ tracks: [], collection, x: r.right, y: r.bottom + 4 });
  }
};

/** Open at the pointer (right-click) or under the clicked button. */
export const openTrackMenu = (
  tracks: Track | Track[],
  e: React.MouseEvent,
  playlist?: MenuTarget['playlist'],
): void => {
  e.preventDefault();
  e.stopPropagation();
  const list = Array.isArray(tracks) ? tracks : [tracks];
  if (list.length === 0 && !playlist) return;
  if (e.type === 'contextmenu') {
    set({ tracks: list, playlist, x: e.clientX, y: e.clientY });
  } else {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    set({ tracks: list, playlist, x: r.right, y: r.bottom + 4 });
  }
};

/** A playlist whose tracks aren't loaded (sidebar, playlist cards): only playlist actions. */
export const openPlaylistMenu = (playlist: { id: string; name: string }, e: React.MouseEvent): void => {
  openTrackMenu([], e, playlist);
};

export const closeTrackMenu = (): void => {
  set(null);
};

const TrackMenu = () => {
  const current = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => target,
  );
  const location = useLocation();

  useEffect(() => {
    closeTrackMenu();
  }, [location.pathname]);

  if (!current) return null;
  return <OpenMenu key={`${current.x},${current.y}`} target={current} />;
};
export default TrackMenu;

const OpenMenu = ({ target }: { target: MenuTarget }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { playNext, enqueue } = usePlayerStore();
  const { data: playlists } = useMyPlaylists();
  const { mode } = useModeStore();
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: target.x, top: target.y });

  const { tracks, playlist, collection } = target;
  const [loadedTracks, setLoadedTracks] = useState<Track[]>(tracks);
  const effectiveTracks = loadedTracks.length > 0 ? loadedTracks : tracks;
  const single = effectiveTracks.length === 1 ? effectiveTracks[0] : null;
  const { favourite, toggle: toggleFavourite } = useFavourite(single);
  const download = useDownload(single?.id ?? '');

  // Keep the menu on screen; anchor it to the left of the pointer near the right edge.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(target.x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(target.y, window.innerHeight - height - 8)),
    });
  }, [target.x, target.y, picking, loading]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) closeTrackMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTrackMenu();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', closeTrackMenu);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', closeTrackMenu);
    };
  }, []);

  const run = (fn: () => void) => {
    return () => {
      fn();
      closeTrackMenu();
    };
  };

  const resolveTracks = async (): Promise<Track[]> => {
    if (loadedTracks.length > 0) return loadedTracks;
    if (!collection) return tracks;
    if (collection.loadTracks) {
      const list = await collection.loadTracks();
      setLoadedTracks(list);
      return list;
    }
    const { id } = collection;
    const list =
      collection.kind === 'album'
        ? await fetchAllPages((cursor) => api.getAlbumTracks(id, cursor))
        : id.startsWith('sonare:')
          ? ((await api.getMyPlaylistTracks(id)).items ?? [])
          : await fetchAllPages((cursor) => api.getPlaylistTracks(id, cursor));
    setLoadedTracks(list);
    return list;
  };

  const handleCollectionEnqueue = async () => {
    try {
      setLoading(true);
      const list = await resolveTracks();
      enqueue(list);
      closeTrackMenu();
    } catch {
      showToast({
        title: 'Could not load tracks',
        description: collection?.title,
        icon: 'info',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionAddToPlaylist = async () => {
    try {
      setLoading(true);
      const list = await resolveTracks();
      if (isAuthenticated()) {
        setPicking(true);
      } else {
        closeTrackMenu();
        requireAccount('Create a free account to make playlists.', () => addToPlaylistDialog(list));
      }
    } catch {
      showToast({
        title: 'Could not load tracks',
        description: collection?.title,
        icon: 'info',
      });
    } finally {
      setLoading(false);
    }
  };

  const addToPlaylist = async (id: string, name: string) => {
    closeTrackMenu();
    await addTracksWithToast({ id, name }, effectiveTracks);
  };

  const addToNewPlaylist = async () => {
    closeTrackMenu();
    const created = await createPlaylistWithPrompt({
      initialValue: single ? single.title : collection ? collection.title : 'New playlist',
    });
    if (created) await addTracksWithToast(created, effectiveTracks);
  };

  const deletePlaylist = async (p: { id: string; name: string }) => {
    closeTrackMenu();
    const ok = await confirmDialog({
      title: 'Delete playlist?',
      description: `"${p.name}" is deleted from your account. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteMyPlaylist(p.id);
      notifyPlaylistsChanged();
      showToast({ title: 'Playlist deleted', description: p.name, icon: 'trash' });
      // Deleted from its own page: that page is gone now.
      if (decodeURIComponent(location.pathname) === `/playlist/${p.id}`) navigate('/playlist', { replace: true });
    } catch {
      showToast({ title: 'Could not delete playlist', description: p.name, icon: 'info' });
    }
  };

  const ownPlaylists = playlists?.items ?? [];

  return (
    <div ref={ref} className="fixed z-50" style={pos} role="menu">
      <Menu className="min-w-[220px] max-h-[360px] overflow-auto">
        {picking ? (
          <>
            <MenuItem icon="chevron-left" onClick={() => setPicking(false)}>
              Back
            </MenuItem>
            <MenuItem icon="plus" onClick={addToNewPlaylist}>
              New playlist…
            </MenuItem>
            {ownPlaylists.map((p) => (
              <MenuItem key={p.id} icon="playlist" onClick={() => void addToPlaylist(p.id, p.name)}>
                {p.name}
              </MenuItem>
            ))}
          </>
        ) : collection ? (
          <>
            {loading && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-label-s text-t3 animate-pulse" role="status">
                <Icon name="sync" size={14} className="animate-spin" />
                <span>Loading tracks…</span>
              </div>
            )}
            <MenuItem icon="list" disabled={loading} onClick={handleCollectionEnqueue}>
              Add to queue
            </MenuItem>
            <MenuItem icon="playlist" disabled={loading} onClick={handleCollectionAddToPlaylist}>
              Add to playlist…
            </MenuItem>
            <SaveCollectionItem collection={collection} />
          </>
        ) : (
          <>
            {tracks.length > 0 && (
              <>
                {single && (
                  <MenuItem icon="play" onClick={run(() => playNext(single))}>
                    Play next
                  </MenuItem>
                )}
                <MenuItem icon="list" onClick={run(() => enqueue(tracks))}>
                  Add to queue
                </MenuItem>
                {single && (
                  <MenuItem icon="heart" onClick={run(toggleFavourite)}>
                    {favourite ? 'Remove from favourites' : 'Add to favourites'}
                  </MenuItem>
                )}
                <MenuItem
                  icon="playlist"
                  onClick={() => {
                    // Playlists live in the account: a guest is sent to sign in, then picks one there.
                    if (isAuthenticated()) return setPicking(true);
                    closeTrackMenu();
                    requireAccount('Create a free account to make playlists.', () => addToPlaylistDialog(tracks));
                  }}
                >
                  Add to playlist…
                </MenuItem>
                {CAPS.downloads &&
                  single &&
                  single.source !== 'local' &&
                  (download?.status === 'done' ? (
                    <MenuItem icon="trash" onClick={run(() => void deleteTrackDownload(single))}>
                      Delete download
                    </MenuItem>
                  ) : download?.status === 'queued' || download?.status === 'downloading' ? (
                    <MenuItem icon="pause" onClick={run(() => void downloads.pause(single.id))}>
                      Pause download
                    </MenuItem>
                  ) : download ? (
                    <MenuItem icon="download" onClick={run(() => void downloads.resume(single.id))}>
                      Resume download
                    </MenuItem>
                  ) : (
                    mode === 'online' && (
                      <MenuItem icon="download" onClick={run(() => void startTrackDownload(single))}>
                        Download
                      </MenuItem>
                    )
                  ))}
                {CAPS.localLibrary && single && localLibrary.localIdFor(single.id) && (
                  <MenuItem icon="folder" onClick={run(() => void localLibrary.showInFolder(single.id))}>
                    Show in folder
                  </MenuItem>
                )}
                {single?.albumId && (
                  <MenuItem icon="disc" onClick={run(() => navigate(`/album/${single.albumId}`))}>
                    Go to album
                  </MenuItem>
                )}
                {single?.artistId && (
                  <MenuItem icon="mic" onClick={run(() => navigate(`/artist/${single.artistId}`))}>
                    Go to artist
                  </MenuItem>
                )}
              </>
            )}
            {playlist && (
              <>
                {tracks.length > 0 && <hr className="hr mx-2 my-[5px]" />}
                <MenuItem icon="edit" onClick={run(() => void renamePlaylistWithPrompt(playlist))}>
                  Rename playlist…
                </MenuItem>
                <MenuItem icon="trash" danger onClick={() => void deletePlaylist(playlist)}>
                  Delete playlist
                </MenuItem>
              </>
            )}
          </>
        )}
      </Menu>
    </div>
  );
};

/** Save / Remove for an album or playlist's menu, from the saved lists (fetched only for these menus). */
const SaveCollectionItem = ({ collection }: { collection: CollectionTarget }) => {
  const album = collection.kind === 'album';
  const { data: savedAlbums } = useLibraryAlbums();
  const { data: savedPlaylists } = useSavedPlaylists();
  const [override, setOverride] = useState<boolean | null>(null);
  const saved = override ?? !!(album ? savedAlbums : savedPlaylists)?.items.some((item) => item.id === collection.id);

  const toggle = () =>
    requireAccount(
      album ? 'Create a free account to save albums you love.' : 'Create a free account to save playlists you love.',
      async () => {
        const next = !saved;
        setOverride(next);
        try {
          if (album) await api.setAlbumFavourite(collection.id, next, collection.raw as Album | undefined);
          else await api.setPlaylistFavourite(collection.id, next, collection.raw as Playlist | undefined);
          notifyPlaylistsChanged();
          showToast({
            title: next ? 'Saved to your library' : 'Removed from your library',
            description: collection.title,
            icon: next ? 'check' : 'trash',
          });
        } catch {
          setOverride(!next);
          showToast({
            title: next ? 'Could not save to library' : 'Could not remove from library',
            description: collection.title,
            icon: 'info',
          });
        }
      },
    );

  return (
    <MenuItem icon={saved ? 'trash' : 'library'} onClick={toggle}>
      {saved ? 'Remove from library' : 'Save to library'}
    </MenuItem>
  );
};
