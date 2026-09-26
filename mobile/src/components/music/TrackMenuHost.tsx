import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Artwork } from './Artwork';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import Icon from '../ui/Icon';
import { artworkUrl } from '../../data/config';
import { requireAccount } from '../../data/accountGate';
import { songCount } from '../../lib/format';
import { usePlayerStore } from '../../store/player';
import { useLibraryStore } from '../../store/library';
import { useTrackMenuStore } from '../../store/trackMenu';
import type { Track } from '../../data/types';

function MenuItem({ icon, label, onPress }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; onPress: () => void }) {
  return (
    <Button variant="ghost" className="justify-start px-2 py-3" onPress={onPress} accessibilityLabel={label}>
      <View className="mr-3 w-[18px] items-center">
        <Icon name={icon} size={18} color="#FFFFFF" />
      </View>
      <Text className="text-t1 text-tm">{label}</Text>
    </Button>
  );
}

function PlaylistPicker({ track }: { track: Track }) {
  const close = useTrackMenuStore(s => s.close);
  const playlists = useLibraryStore(s => s.playlists);
  const [newName, setNewName] = React.useState('');
  const [note, setNote] = React.useState<string | null>(null);

  const addTo = async (playlistId: string) => {
    try {
      await useLibraryStore.getState().addToPlaylist(playlistId, track);
      close();
    } catch (e: any) {
      setNote(e?.message || 'Could not add to playlist');
    }
  };

  // Submitting from the keyboard passes the field's text: state can lag the last keystrokes.
  const createAndAdd = async (text: string = newName) => {
    if (!text.trim()) return;
    try {
      const playlist = await useLibraryStore.getState().createPlaylist(text.trim());
      await addTo(playlist.id);
    } catch (e: any) {
      setNote(e?.message || 'Could not create playlist');
    }
  };

  return (
    <View className="gap-2">
      <Text className="text-t2 text-bm mb-1">Add to playlist</Text>
      <View className="flex-row gap-2 mb-2">
        <Field
          className="flex-1"
          placeholder="New playlist name"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={e => createAndAdd(e.nativeEvent.text)}
          returnKeyType="done"
          accessibilityLabel="New playlist name"
        />
        <Button variant="accent" onPress={() => createAndAdd()} disabled={!newName.trim()} accessibilityLabel="Create playlist">
          Create
        </Button>
      </View>
      <ScrollView style={{ maxHeight: 260 }}>
        {playlists.map(p => (
          <Pressable key={p.id} onPress={() => addTo(p.id)} className="flex-row items-center gap-3 py-2.5" accessibilityRole="button" accessibilityLabel={`Add to ${p.name}`}>
            <Artwork uri={p.trackCount ? artworkUrl({ thumbnail: `/api/v1/playlists/${p.id}/artwork` }, 64) : undefined} size={40} />
            <View className="flex-1">
              <Text className="text-t1 text-tm" numberOfLines={1}>{p.name}</Text>
              <Text className="text-t3 text-bs">{songCount(p.trackCount)}</Text>
            </View>
          </Pressable>
        ))}
        {playlists.length === 0 && <Text className="text-t3 text-bm py-2">No playlists yet — name one above.</Text>}
      </ScrollView>
      {note && <Text className="text-red text-bs">{note}</Text>}
    </View>
  );
}

function Menu({ track }: { track: Track }) {
  const { close, open, extraAction } = useTrackMenuStore();
  const favourite = useLibraryStore(s => !!s.favouriteIds[track.id]);

  const run = (fn: () => unknown) => () => {
    close();
    fn();
  };

  return (
    <View className="gap-2">
      <MenuItem icon="play" label="Play next" onPress={run(() => usePlayerStore.getState().playNextInQueue(track))} />
      <MenuItem icon="playlist" label="Add to queue" onPress={run(() => usePlayerStore.getState().addToQueue(track))} />
      <MenuItem
        icon="heart"
        label={favourite ? 'Remove from favourites' : 'Add to favourites'}
        onPress={run(() =>
          requireAccount('Create a free account to save songs you love.', () =>
            useLibraryStore.getState().toggleFavourite(track).catch(() => {}),
          ),
        )}
      />
      <MenuItem
        icon="plus"
        label="Add to playlist"
        // Closes first so a guest's sign-in screen isn't hidden under this sheet; signed in,
        // it reopens straight away on the picker. Guests land back here after signing in.
        onPress={run(() =>
          requireAccount('Create a free account to make playlists.', () => open(track, { view: 'playlists' })),
        )}
      />
      {extraAction && <MenuItem icon="more" label={extraAction.label} onPress={run(extraAction.onPress)} />}
    </View>
  );
}

/** The one long-press sheet for songs; open it with useTrackMenuStore().open(track). */
export function TrackMenuHost() {
  const current = useTrackMenuStore(s => s.track);
  const view = useTrackMenuStore(s => s.view);
  const close = useTrackMenuStore(s => s.close);
  // Keep showing the last track while the sheet slides away.
  const last = React.useRef<Track | null>(null);
  if (current) last.current = current;
  const track = current ?? last.current;

  return (
    <Sheet visible={!!current} onClose={close}>
      {track && (
        <View className="px-6 pb-6">
          <View className="flex-row items-center gap-4 mb-6">
            <Artwork uri={artworkUrl(track, 140)} size={56} />
            <View className="flex-1">
              <Text className="text-t1 text-h2 font-medium" numberOfLines={1}>{track.title}</Text>
              <Text className="text-t3 text-tl" numberOfLines={1}>{track.artist}</Text>
            </View>
          </View>
          {view === 'playlists' ? <PlaylistPicker key={track.id} track={track} /> : <Menu track={track} />}
        </View>
      )}
    </Sheet>
  );
}
