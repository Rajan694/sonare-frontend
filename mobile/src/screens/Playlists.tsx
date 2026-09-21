import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import { mockPlaylists } from '../data/mock';
import { useModeStore } from '../store/mode';

export function PlaylistsScreen() {
  const mode = useModeStore((state) => state.mode);

  const displayPlaylists = mode === 'offline'
    ? mockPlaylists.filter(p => p.kind === 'local' || (p.kind === 'synced' && p.downloadedCount > 0))
    : mockPlaylists;

  return (
    <Screen scrollable={false}>
      <Header title="Playlists" />
      
      <FlatList
        data={displayPlaylists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            className="flex-row items-center px-4 py-3 gap-3"
            accessibilityRole="button"
            accessibilityLabel={item.name}
          >
            <View className="w-16 h-16 rounded-lg bg-s3" />
            <View className="flex-1 gap-1">
              <Text className="text-tm font-medium text-t1">{item.name}</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-bs text-t2">{item.trackCount} songs</Text>
                {item.kind === 'local' && (
                  <Badge label="Local" variant="local" />
                )}
                {item.kind === 'synced' && (
                  <Badge label="Synced" variant="neutral" />
                )}
                {item.kind === 'online' && mode === 'online' && (
                  <Badge label="Online" variant="cloud" />
                )}
              </View>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 128 }}
      />
    </Screen>
  );
}
