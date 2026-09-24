import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { artworkUrl } from '../data/config';
import { useAuthStore } from '../data/auth';
import { requireAccount } from '../data/accountGate';
import { GuestPrompt } from '../components/ui/GuestPrompt';
import { songCount } from '../lib/format';
import { confirmDeletePlaylist } from '../lib/confirmDeletePlaylist';
import type { Playlist } from '../data/types';
import Icon from '../components/ui/Icon';

export function PlaylistsScreen() {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
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
    if (options) void confirmDeletePlaylist(options);
  };

  const signedIn = useAuthStore((state) => state.status === 'signedIn');
  const reload = useCallback(() => {
    if (useAuthStore.getState().status !== 'signedIn') return;
    useLibraryStore.getState().reloadPlaylists().then(() => setError(null), setError);
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

  const online = mode === 'online';

  return (
    <Screen scrollable={false}>
      <Header
        title="Playlists"
        right={online ? (
          <IconButton icon={<Icon name="plus" size={20} color="#FFFFFF" />} onPress={startCreating} accessibilityLabel="New playlist" />
        ) : undefined}
      />

      <FlatList
        data={online ? playlists : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('Playlist', { id: item.id })}
            onLongPress={() => openOptions(item)}
            className="flex-row items-center px-4 py-3 gap-3"
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityHint="Long press for options"
          >
            <Artwork uri={item.trackCount ? artworkUrl({ thumbnail: `/api/v1/playlists/${item.id}/artwork` }, 140) : undefined} size={64} className="rounded-lg" />
            <View className="flex-1 gap-1">
              <Text className="text-tm font-medium text-t1" numberOfLines={1}>{item.name}</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-bs text-t2">{songCount(item.trackCount)}</Text>
                {item.kind === 'synced' && <Badge label="Synced" variant="neutral" />}
                {item.kind === 'local' && <Badge label="Local" variant="local" />}
              </View>
            </View>
            <IconButton
              icon={<Icon name="more" size={20} color="#7E7E8C" />}
              onPress={() => openOptions(item)}
              accessibilityLabel={`Options for ${item.name}`}
            />
          </Pressable>
        )}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor="#00E28A" colors={['#00E28A']} />}
        ListEmptyComponent={
          online && !signedIn ? (
            <GuestPrompt
              icon="playlist"
              title="Make playlists with an account"
              body="Create a free account to build playlists and keep them in sync across your devices."
            />
          ) : online ? (
            <View className="items-center">
              <StateView error={error} onRetry={reload} empty="No playlists yet." />
              {!error && (
                <Button variant="outline" onPress={startCreating}>New playlist</Button>
              )}
            </View>
          ) : (
            <StateView empty="Playlists sync from the Sonare server — switch back to Online." />
          )
        }
        contentContainerStyle={{ paddingBottom: 128 }}
      />

      <Sheet visible={creating} onClose={() => setCreating(false)}>
        <View className="px-6 pb-6 gap-4">
          <Text className="text-t1 text-h2 font-medium">New playlist</Text>
          <Field
            placeholder="Playlist name"
            value={name}
            onChangeText={setName}
            autoFocus
            onSubmitEditing={e => create(e.nativeEvent.text)}
            returnKeyType="done"
            accessibilityLabel="Playlist name"
          />
          <Button variant="accent" onPress={() => create()} disabled={!name.trim()}>Create</Button>
        </View>
      </Sheet>

      <Sheet visible={optionsOpen} onClose={() => setOptionsOpen(false)}>
        <View className="px-6 pb-6 gap-2">
          <Text className="text-t1 text-h2 font-medium" numberOfLines={1}>{options?.name}</Text>
          <Button variant="ghost" className="justify-start px-2 py-3" onPress={deleteFromOptions} accessibilityLabel="Delete playlist">
            <Text className="text-red text-tm">Delete playlist</Text>
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
}
