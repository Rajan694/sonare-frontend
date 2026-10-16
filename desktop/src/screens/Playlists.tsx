import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useModeStore } from '../store/modeContext';
import { useMyPlaylists, useAuth } from '../api/hooks';
import { useOfflinePlaylists } from '../storage/offlinePlaylists';
import { localLibrary } from '../storage/local';
import { requireAccount } from '../api/accountGate';
import { createPlaylistWithPrompt } from '../api/newPlaylist';
import { AiPlaylistDialog } from '../components/ai/AiPlaylistDialog';
import { useAiEnabled } from '../components/ai/useAi';
import Artwork from '../components/music/Artwork';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { staggerContainer, staggerItem, transition } from '../lib/motion';
import { cn } from '../lib/cn';
import type { Playlist } from '../types';

const Playlists = () => {
  const { mode } = useModeStore();
  const isOffline = mode === 'offline';
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: playlistsData, loading: playlistsLoading } = useMyPlaylists(!isOffline);
  const offline = useOfflinePlaylists();

  // Offline: the playlists saved on this device, without asking the server. Online: the
  // server's list.
  const rawPlaylists: Playlist[] = isOffline
    ? offline.playlists.filter((p) => p.id.startsWith('sonare:'))
    : playlistsData?.items || [];

  /** What of a playlist can play here: songs whose file is on this device or downloaded. */
  const onDevice = (id: string): { have: number; total: number } => {
    const songs = offline.songs.get(id) ?? [];
    const total = songs.length || rawPlaylists.find((p) => p.id === id)?.trackCount || 0;
    return { have: songs.filter((t) => localLibrary.localIdFor(t.id) !== null).length, total };
  };

  const playlists = rawPlaylists;

  const totalCount = playlists.length + 1;
  const countLabel = `${totalCount.toLocaleString()} ${totalCount === 1 ? 'playlist' : 'playlists'}`;

  const handleCreatePlaylist = () => requireAccount('Create a free account to make playlists.', createPlaylist);
  const aiEnabled = useAiEnabled();
  const [aiOpen, setAiOpen] = React.useState(false);

  const createPlaylist = async () => {
    const created = await createPlaylistWithPrompt();
    if (created) navigate(`/playlist/${created.id}`);
  };

  const artVariants = ['a1', 'a5', 'a3', 'a6', 'a2', 'a4', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12'] as const;

  return (
    <motion.div
      className="@container flex flex-col gap-6 p-4 @[480px]:p-8 pb-8 overflow-auto h-full"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header section */}
      <motion.div
        className="flex flex-col @[480px]:flex-row @[480px]:items-center justify-between gap-4"
        variants={staggerItem}
        transition={transition.normal}
      >
        <div className="flex flex-col gap-1">
          <span className="text-display-m text-t1 font-semibold">Playlists</span>
          <span className="text-body-m text-t2">
            {countLabel} {isOffline ? 'available offline' : 'in your collection'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {!isOffline && aiEnabled && (
            <Button variant="out" icon="sparkles" onClick={() => setAiOpen(true)}>
              Create with AI
            </Button>
          )}
          {!isOffline && (
            <Button variant="acc" icon="plus" onClick={handleCreatePlaylist}>
              New playlist
            </Button>
          )}
        </div>
      </motion.div>

      {/* Guest banner if unauthenticated and online */}
      {!user && !isOffline && (
        <motion.div className="onstrip gap-3" variants={staggerItem} transition={transition.normal}>
          <Icon name="info" size={16} className="text-acc flex-none" />
          <span className="flex flex-col grow gap-px">
            <span className="text-label-l text-acc">Create and sync playlists</span>
            <span className="text-body-s text-t2">
              Sign in or create an account to organize your music library into custom playlists.
            </span>
          </span>
          <Link to="/signin" state={{ mode: 'signup' }} className="no-underline">
            <Button variant="acc" size="sm">
              Create account
            </Button>
          </Link>
          <Link to="/signin" state={{ mode: 'signin' }} className="no-underline">
            <Button variant="out" size="sm">
              Sign in
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Responsive Grid of Playlist Cards */}
      <motion.div
        className="grid grid-cols-2 @[640px]:grid-cols-3 @[960px]:grid-cols-4 @[1200px]:grid-cols-5 gap-4 pt-2"
        variants={staggerItem}
        transition={transition.normal}
      >
        {/* Liked Songs Card (Always First) */}
        <Link
          to="/library?view=favourites"
          className="surf2 p-3.5 rounded-xl no-underline text-inherit flex flex-col gap-3 group hover:border-ln3 transition-colors w-full"
        >
          <div className="aspect-square w-full rounded-lg bg-gradient-to-br from-[#4A3B89] to-[#1E123F] flex items-center justify-center relative overflow-hidden shadow-lg">
            <Icon name="heart" size={36} className="text-acc" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-title-m font-semibold text-t1 truncate">Liked Songs</span>
            <span className="text-body-s text-t2 truncate">Auto playlist</span>
            <div className="mt-1">
              <span className="badge bg-neutral text-[10px]">FAVOURITES</span>
            </div>
          </div>
        </Link>

        {/* User / Catalog Playlists */}
        {playlistsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surf2 p-3.5 rounded-xl flex flex-col gap-3 animate-pulse w-full">
                <div className="aspect-square w-full bg-s2/40 rounded-lg" />
                <div className="h-4 bg-s2/40 rounded w-3/4" />
                <div className="h-3 bg-s2/40 rounded w-1/2" />
              </div>
            ))
          : playlists.map((playlist, i) => {
              const artVariant = artVariants[i % artVariants.length];
              const device = isOffline ? onDevice(playlist.id) : null;
              const emptyOffline = !!device && device.have === 0;
              return (
                <Link
                  key={playlist.id}
                  to={`/playlist/${playlist.id}`}
                  className={cn(
                    'surf2 p-3.5 rounded-xl no-underline text-inherit flex flex-col gap-3 group hover:border-ln3 transition-colors w-full',
                    emptyOffline && 'opacity-60',
                  )}
                >
                  <div className="aspect-square w-full rounded-lg relative overflow-hidden shadow-lg">
                    <Artwork
                      src={playlist.thumbnail}
                      variant={artVariant}
                      size={240}
                      radius="sm"
                      rings
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-title-m font-semibold text-t1 truncate group-hover:text-acc transition-colors">
                      {playlist.name}
                    </span>
                    <span className="text-body-s text-t2 truncate">
                      {device
                        ? device.have === 0
                          ? 'No songs on this device'
                          : `${device.have} of ${device.total} songs on this device`
                        : playlist.trackCount
                          ? `${playlist.trackCount} ${playlist.trackCount === 1 ? 'song' : 'songs'}`
                          : 'Playlist'}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {playlist.kind === 'local' ? (
                        <span className="badge bg-local text-[10px] inline-flex items-center gap-1">
                          <Icon name="smartphone" size={8} />
                          <span>ON DEVICE</span>
                        </span>
                      ) : playlist.kind === 'synced' ? (
                        <span className="badge bg-dl text-[10px] inline-flex items-center gap-1">
                          <Icon name="sync" size={8} />
                          <span>SYNCED</span>
                        </span>
                      ) : (
                        <span className="badge bg-cloud text-[10px] inline-flex items-center gap-1">
                          <Icon name="cloud" size={8} />
                          <span>ONLINE</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
      </motion.div>
      <AiPlaylistDialog open={aiOpen} onClose={() => setAiOpen(false)} />
    </motion.div>
  );
};
export default Playlists;
