import React, { useCallback, useState } from 'react';
import { View, FlatList, Pressable, RefreshControl } from 'react-native';
import { Text } from '../components/ui/Text';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Sheet } from '../components/ui/Sheet';
import { IconButton } from '../components/ui/IconButton';
import { Artwork } from '../components/music/Artwork';
import { StateView } from '../components/ui/StateView';
import { useModeStore } from '../store/mode';
import { useLibraryStore } from '../store/library';
import { usePhoneTracks } from '../store/localMusic';
import { playablePlaylistTracks, useOfflinePlaylistsStore } from '../store/offlinePlaylists';
import { artworkUrl } from '../data/config';
import { useAuthStore } from '../data/auth';
import { requireAccount } from '../data/accountGate';
import { GuestPrompt } from '../components/ui/GuestPrompt';
import { songCount } from '../lib/format';
import { cn } from '../lib/cn';
import { confirmDeletePlaylist } from '../lib/confirmDeletePlaylist';
import type { Playlist } from '../data/types';
import Icon from '../components/ui/Icon';

export const PlaylistsScreen = () => {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
  const net = useNetInfo();
  const playlists = useLibraryStore((state) => state.playlists);
  const [error, setError] = useState<Error | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  // The options sheet keeps its playlist while it slides away, so the title doesn't blank out.
  const [options, setOptions] = useState<Playlist | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const openOptions = (playlist: Playlist) => {
    setOptions(playlist);
    setOptionsOpen(true);
  };
  const deleteFromOptions = () => {
    setOptionsOpen(false);
    if (options) confirmDeletePlaylist(options);
  };

  const signedIn = useAuthStore((state) => state.status === 'signedIn');
  const reload = useCallback(() => {
    if (useAuthStore.getState().status !== 'signedIn') return;
    useLibraryStore
      .getState()
      .reloadPlaylists()
      .then(() => setError(null), setError);
  }, []);
  const startCreating = () => requireAccount('Create a free account to make playlists.', () => setCreating(true));
  useFocusEffect(reload);

  // Submitting from the keyboard passes the field's text: state can lag the last keystrokes.
  const create = async (text: string = name) => {
    if (!text.trim()) return;
    try {
      const playlist = await useLibraryStore.getState().createPlaylist(text.trim());
      setCreating(false);
      setName('');
      navigation.navigate('Playlist', { id: playlist.id });
    } catch (e: any) {
      setError(e);
    }
  };

  const online = mode === 'online' && !!net.isConnected && net.isInternetReachable !== false;
  // Offline, the playlists this phone saved are listed, showing what plays without a network.
  const savedPlaylists = useOfflinePlaylistsStore((state) => state.playlists);
  const savedTracks = useOfflinePlaylistsStore((state) => state.tracks);
  const phoneTracks = usePhoneTracks();
  const playableCount = (playlist: Playlist) =>
    playablePlaylistTracks(savedTracks[playlist.id] ?? [], phoneTracks).playable.length;
  const lists = online ? playlists : savedPlaylists;

  return (
    <Screen scrollable={false}>
      <Header
        left={
          <Text className="text-h1 font-semibold text-t1" numberOfLines={1}>
            Playlists
          </Text>
        }
        right={
          online ? (
            <IconButton
              icon={<Icon name="plus" size={20} color="#FFFFFF" />}
              onPress={startCreating}
              accessibilityLabel="New playlist"
            />
          ) : undefined
        }
      />

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const playable = playableCount(item);
          const total = item.trackCount ?? savedTracks[item.id]?.length ?? 0;
          // A playlist with nothing on the phone still shows, dimmed.
          const dim = !online && playable === 0;
          return (
            <Pressable
              onPress={() => navigation.navigate('Playlist', { id: item.id })}
              onLongPress={online ? () => openOptions(item) : undefined}
              className={cn('flex-row items-center px-2.5 py-2.5 rounded-md gap-3', dim && 'opacity-60')}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityHint={online ? 'Long press for options' : undefined}
            >
              <Artwork
                uri={
                  item.thumbnail
                    ? artworkUrl(item, 140)
                    : item.trackCount
                      ? artworkUrl({ thumbnail: `/api/v1/playlists/${item.id}/artwork` }, 140)
                      : undefined
                }
                size={56}
                rings
                className="rounded-md"
              />
              <View className="flex-1 gap-1 min-w-0">
                <Text className="text-tm font-medium text-t1 truncate" numberOfLines={1}>
                  {item.name}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-bs text-t2">
                    {online
                      ? songCount(item.trackCount)
                      : playable === 0
                        ? 'No songs on this phone'
                        : `${playable} of ${total} songs on this phone`}
                  </Text>
                  {online && item.kind === 'synced' && (
                    <Badge label="Synced" variant="neutral" icon={<Icon name="refresh" size={10} color="#9A9AA8" />} />
                  )}
                  {online && item.kind === 'local' && (
                    <Badge label="Local" variant="local" icon={<Icon name="smartphone" size={10} color="#FFC24D" />} />
                  )}
                  {online && item.kind === 'online' && (
                    <Badge label="Online" variant="cloud" icon={<Icon name="cloud" size={10} color="#00E28A" />} />
                  )}
                </View>
              </View>
              {online && (
                <IconButton
                  icon={<Icon name="more" size={18} color="#7E7E8C" />}
                  size={32}
                  onPress={() => openOptions(item)}
                  accessibilityLabel={`Options for ${item.name}`}
                />
              )}
            </Pressable>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={reload} tintColor="#00E28A" colors={['#00E28A']} />
        }
        ListEmptyComponent={
          online && !signedIn ? (
            <GuestPrompt
              icon="playlist"
              title="Make playlists with an account"
              body="Create a free account to build playlists and keep them in sync across your devices."
            />
          ) : online ? (
            <View className="items-center py-8">
              <StateView error={error} onRetry={reload} empty="No playlists yet." />
              {!error && (
                <Button variant="outline" size="sm" onPress={startCreating} className="mt-4">
                  New playlist
                </Button>
              )}
            </View>
          ) : (
            <StateView empty="No playlists on this phone. Go online to load your playlists." />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 140 }}
      />

      <Sheet visible={creating} onClose={() => setCreating(false)}>
        <View className="px-6 pb-6 gap-4">
          <Text className="text-t1 text-h2 font-medium">New playlist</Text>
          <Field
            placeholder="Playlist name"
            value={name}
            onChangeText={setName}
            autoFocus
            onSubmitEditing={(e) => create(e.nativeEvent.text)}
            returnKeyType="done"
            accessibilityLabel="Playlist name"
          />
          <Button variant="accent" onPress={() => create()} disabled={!name.trim()}>
            Create
          </Button>
        </View>
      </Sheet>

      <Sheet visible={optionsOpen} onClose={() => setOptionsOpen(false)}>
        <View className="px-6 pb-6 gap-2">
          <Text className="text-t1 text-h2 font-medium" numberOfLines={1}>
            {options?.name}
          </Text>
          <Button
            variant="ghost"
            className="justify-start px-2 py-3"
            onPress={deleteFromOptions}
            accessibilityLabel="Delete playlist"
          >
            <Text className="text-red text-tm">Delete playlist</Text>
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
};
