import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Text } from '../components/ui/Text';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import Icon from '../components/ui/Icon';
import { DOWNLOADS_FOLDER, musicFolders, useLocalMusicStore } from '../store/localMusic';
import { openAppSettings } from '../lib/musicPermission';
import { formatBytes } from '../lib/format';

/**
 * Music folders on the phone: every folder Android knows holds music, with a switch to show or
 * hide its songs in Offline Mode (Library, Home, Search). Reading them needs the music and
 * audio permission; this screen asks for it, or sends the user to the app's settings once
 * Android won't ask again.
 */
export const FoldersScreen = () => {
  const navigation = useNavigation<any>();
  const permission = useLocalMusicStore((state) => state.permission);
  const songs = useLocalMusicStore((state) => state.songs);
  const hidden = useLocalMusicStore((state) => state.hidden);
  const scanning = useLocalMusicStore((state) => state.scanning);
  const error = useLocalMusicStore((state) => state.error);
  const scan = useLocalMusicStore((state) => state.scan);
  const requestAccess = useLocalMusicStore((state) => state.requestAccess);
  const setHidden = useLocalMusicStore((state) => state.setHidden);
  const folders = useMemo(() => musicFolders({ songs, hidden }), [songs, hidden]);

  const header = (
    <Header
      titleAlign="start"
      title="Music folders"
      left={
        <IconButton
          icon={<Icon name="back" size={20} color="#FFFFFF" />}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        />
      }
      right={
        permission === 'granted' ? (
          <IconButton
            icon={
              scanning ? (
                <ActivityIndicator size="small" color="#9A9AA8" />
              ) : (
                <Icon name="refresh" size={18} color="#9A9AA8" />
              )
            }
            onPress={() => void scan()}
            disabled={scanning}
            accessibilityLabel="Scan again"
          />
        ) : undefined
      }
    />
  );

  if (permission !== 'granted') {
    const blocked = permission === 'blocked';
    return (
      <Screen scrollable={false} className="bg-s0">
        {header}
        <View className="flex-1 items-center justify-center px-8 pb-40 gap-3">
          <View className="w-14 h-14 rounded-full bg-gold/10 items-center justify-center mb-1">
            <Icon name="folder" size={22} color="#FFC24D" />
          </View>
          <Text className="text-t1 text-tl font-medium text-center">See the music on this phone</Text>
          <Text className="text-t3 text-bm text-center max-w-[300px]">
            {blocked
              ? "Sonare isn't allowed to read music and audio. Turn it on in the app's settings under Permissions."
              : 'Allow access to music and audio to play the songs in your music folders in Offline Mode. Your downloads play either way.'}
          </Text>
          <Button
            variant="accent"
            className="mt-2"
            onPress={() => void (blocked ? openAppSettings() : requestAccess())}
          >
            {blocked ? 'Open settings' : 'Allow access'}
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} className="bg-s0">
      {header}
      <ScrollView contentContainerClassName="px-[22px] pb-40 gap-3">
        <Text className="text-t3 text-bs">
          Songs in these folders play in Offline Mode. Switch a folder off to leave its songs out.
        </Text>
        {error && (
          <View className="flex-row items-center gap-3 p-3 rounded-md bg-s1 border border-ln">
            <Text className="flex-1 text-t2 text-bs">{error}</Text>
            <Button variant="outline" size="sm" onPress={() => void scan()}>
              Try again
            </Button>
          </View>
        )}
        {folders.length === 0 && !scanning && !error ? (
          <View className="items-center py-16 gap-2">
            <Text className="text-t1 text-tm font-medium">No music on this phone yet</Text>
            <Text className="text-t3 text-bs text-center max-w-[280px]">
              Songs you copy to the phone, and Sonare's downloads, show up here.
            </Text>
          </View>
        ) : (
          <View className="bg-s1 border border-ln rounded-lg overflow-hidden">
            {folders.map((folder, i) => (
              <View
                key={folder.path}
                className={`flex-row items-center gap-3.5 px-4 py-3 ${i > 0 ? 'border-t border-ln' : ''}`}
              >
                <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                  <Icon name="folder" size={18} color={folder.hidden ? '#5A5A66' : '#FFC24D'} />
                </View>
                <View className="flex-1 min-w-0 gap-0.5">
                  <Text numberOfLines={1} className="text-tm font-medium text-t1">
                    {folder.path === DOWNLOADS_FOLDER ? 'Sonare downloads' : folder.name}
                  </Text>
                  <Text numberOfLines={1} className="text-bs text-t3">
                    {folder.path} · {folder.songCount} {folder.songCount === 1 ? 'song' : 'songs'} ·{' '}
                    {formatBytes(folder.bytes)}
                  </Text>
                </View>
                <Switch
                  value={!folder.hidden}
                  onValueChange={(on) => setHidden(folder.path, !on)}
                  accessibilityLabel={`Show ${folder.name}`}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};
