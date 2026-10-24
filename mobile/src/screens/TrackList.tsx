import React from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text } from '../components/ui/Text';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { GuestPrompt } from '../components/ui/GuestPrompt';
import { TrackListView } from '../components/music/TrackListView';
import { useTrackList, type TrackListKind } from '../hooks/useTrackList';
import { useAuthStore } from '../data/auth';

export const TrackListScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const folder: string | undefined = route.params?.folder;
  const folderTitle: string | undefined = route.params?.title;
  const kind: TrackListKind = route.params?.kind ?? (folder ? 'folder' : 'liked');
  const userId = useAuthStore((state) => state.user?.id);

  const state = useTrackList({ kind, folder });
  const title =
    kind === 'mostPlayed'
      ? 'Most played'
      : kind === 'folder' || folder
        ? (folderTitle ?? folder ?? 'Folder')
        : 'Liked Songs';

  return (
    <Screen scrollable={false} className="bg-bg">
      {state.selectionMode ? (
        <Header
          left={
            <Text className="text-h1 font-semibold text-t1" numberOfLines={1}>
              {`${state.selectedCount} selected`}
            </Text>
          }
          right={
            <View className="flex-row items-center gap-2">
              <Button variant="ghost" size="sm" onPress={state.onSelectAll} accessibilityLabel="Select all">
                Select all
              </Button>
              <Button variant="ghost" size="sm" onPress={state.onCancelSelection} accessibilityLabel="Cancel selection">
                Cancel
              </Button>
            </View>
          }
        />
      ) : (
        <Header
          titleAlign="start"
          title={title}
          left={
            <IconButton
              icon={<Icon name="back" size={20} color="#FFFFFF" />}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
            />
          }
        />
      )}

      {state.online && !userId && kind !== 'folder' && !folder ? (
        <GuestPrompt
          icon={kind === 'mostPlayed' ? 'trending' : 'heart'}
          title={kind === 'mostPlayed' ? 'Most played lives in your account' : 'Your liked songs live in your account'}
          body={
            kind === 'mostPlayed'
              ? 'Create a free account to track what you play most across your devices.'
              : 'Create a free account and every song you favourite is saved here, on this phone and your other devices.'
          }
        />
      ) : (
        <TrackListView state={state} />
      )}
    </Screen>
  );
};
