import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '../ui/Text';
import { Artwork } from './Artwork';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import Icon from '../ui/Icon';
import { artworkUrl } from '../../data/config';
import { albumMeta, playlistMeta } from '../../../../shared/catalog/meta';
import { requireAccount } from '../../data/accountGate';
import { useSavedAlbum } from '../../data/savedAlbums';
import { usePlayerStore } from '../../store/player';
import { useCollectionMenuStore, type CollectionTarget } from '../../store/collectionMenu';
import { showSnackbar, songsSubtitle } from '../../store/snackbar';
import { PlaylistPicker } from './TrackMenuHost';
import type { Track } from '../../data/types';

const MenuItem = ({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Button
    variant="ghost"
    className="justify-start px-2 py-3"
    onPress={onPress}
    disabled={disabled}
    accessibilityLabel={label}
  >
    <View className="mr-3 w-[18px] items-center">
      <Icon name={icon} size={18} color={disabled ? '#7E7E8C' : '#FFFFFF'} />
    </View>
    <Text className={`text-tm ${disabled ? 'text-t3' : 'text-t1'}`}>{label}</Text>
  </Button>
);

const CollectionMenu = ({ target }: { target: CollectionTarget }) => {
  const { close, tracks, loading, error, loadTracks } = useCollectionMenuStore();

  const isAlbum = target.kind === 'album';
  const reason = isAlbum
    ? 'Create a free account to save albums you love.'
    : 'Create a free account to save playlists you love.';

  const meta = isAlbum ? albumMeta(target.item) : playlistMeta(target.item);

  const { isSaved, toggle: toggleSaved } = useSavedAlbum(target.item.id, reason, meta);

  const pendingActionRef = React.useRef<((tracks: Track[]) => void) | null>(null);

  const performWithTracks = (action: (tracks: Track[]) => void) => {
    pendingActionRef.current = action;
    loadTracks()
      .then((loaded) => {
        if (pendingActionRef.current) {
          const fn = pendingActionRef.current;
          pendingActionRef.current = null;
          fn(loaded);
        }
      })
      .catch(() => {});
  };

  const handleAddToQueue = () => {
    performWithTracks((loaded) => {
      close();
      usePlayerStore.getState().addToQueue(loaded);
      showSnackbar({
        title: 'Added to queue',
        subtitle: songsSubtitle(loaded),
        icon: 'list',
      });
    });
  };

  const handleAddToPlaylist = () => {
    // Closes first so a guest's sign-in screen isn't hidden under this sheet; signed in,
    // it reopens straight away on the picker. Guests land back here after signing in.
    close();
    requireAccount('Create a free account to make playlists.', () => {
      useCollectionMenuStore.getState().open(target, {
        view: 'playlists',
        tracks: tracks ?? undefined,
      });
    });
  };

  const handleSaveToggle = () => {
    close();
    toggleSaved();
  };

  const handleRetry = () => {
    if (pendingActionRef.current) {
      performWithTracks(pendingActionRef.current);
    } else {
      loadTracks().catch(() => {});
    }
  };

  return (
    <View className="gap-2">
      {loading && (
        <View className="py-4 items-center justify-center flex-row gap-2">
          <ActivityIndicator color="#00E28A" />
          <Text className="text-t2 text-bs">Loading tracks...</Text>
        </View>
      )}
      {error && (
        <View className="flex-row items-center justify-between py-2 px-1">
          <Text className="text-red text-bs flex-1 mr-2">{error}</Text>
          <Button variant="ghost" size="sm" onPress={handleRetry} accessibilityLabel="Retry loading tracks">
            Retry
          </Button>
        </View>
      )}
      <MenuItem icon="playlist" label="Add to queue" disabled={loading} onPress={handleAddToQueue} />
      <MenuItem icon="plus" label="Add to playlist" disabled={loading} onPress={handleAddToPlaylist} />
      <MenuItem
        icon="heart"
        label={
          isSaved
            ? isAlbum
              ? 'Remove saved album'
              : 'Remove saved playlist'
            : isAlbum
              ? 'Save album'
              : 'Save playlist'
        }
        disabled={loading}
        onPress={handleSaveToggle}
      />
    </View>
  );
};

const CollectionPlaylistPicker = ({
  target,
  tracks,
  close,
}: {
  target: CollectionTarget;
  tracks: Track[] | null;
  close: () => void;
}) => {
  const loading = useCollectionMenuStore((s) => s.loading);
  const error = useCollectionMenuStore((s) => s.error);
  const loadTracks = useCollectionMenuStore((s) => s.loadTracks);

  React.useEffect(() => {
    if (tracks === null && !loading && !error) {
      loadTracks().catch(() => {});
    }
  }, [tracks, loading, error, loadTracks]);

  if (error) {
    return (
      <View className="py-6 items-center justify-center gap-4">
        <Text className="text-red text-bs text-center px-4">{error}</Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => loadTracks().catch(() => {})}
          accessibilityLabel="Retry loading tracks"
        >
          Retry
        </Button>
      </View>
    );
  }

  if (tracks === null || loading) {
    return (
      <View className="py-8 items-center justify-center flex-row gap-2">
        <ActivityIndicator color="#00E28A" />
        <Text className="text-t2 text-bs">Loading tracks...</Text>
      </View>
    );
  }

  return <PlaylistPicker key={target.item.id} tracks={tracks} onClose={close} />;
};

export const CollectionMenuHost = () => {
  const current = useCollectionMenuStore((s) => s.target);
  const view = useCollectionMenuStore((s) => s.view);
  const tracks = useCollectionMenuStore((s) => s.tracks);
  const close = useCollectionMenuStore((s) => s.close);

  const last = React.useRef<CollectionTarget | null>(null);
  if (current) last.current = current;
  const target = current ?? last.current;

  if (!target) return null;

  const title = target.kind === 'album' ? target.item.title || 'Album' : target.item.name || 'Playlist';

  const subtitle = target.kind === 'album' ? target.item.artist || 'Album' : (target.item.owner ?? 'Playlist');

  return (
    <Sheet visible={!!current} onClose={close}>
      <View className="px-6 pb-6">
        <View className="flex-row items-center gap-4 mb-6">
          <Artwork uri={artworkUrl(target.item, 140)} size={56} />
          <View className="flex-1">
            <Text className="text-t1 text-h2 font-medium" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-t3 text-tl" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>
        {view === 'playlists' ? (
          <CollectionPlaylistPicker target={target} tracks={tracks} close={close} />
        ) : (
          <CollectionMenu target={target} />
        )}
      </View>
    </Sheet>
  );
};
