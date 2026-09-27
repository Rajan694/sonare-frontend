import React from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IconButton } from '../ui/IconButton';
import Icon from '../ui/Icon';
import { useDownloadsStore, type DownloadItem } from '../../store/downloads';
import { useModeStore } from '../../store/mode';
import { confirmRemoveDownloads } from '../../lib/confirmRemoveDownloads';
import type { Track } from '../../data/types';

/**
 * Download every song of an album or playlist. While any are downloading it opens the
 * Downloads screen; once all are on the phone it offers to delete them.
 */
export function DownloadAllButton({ tracks }: { tracks: Track[] }) {
  const navigation = useNavigation<any>();
  const online = useModeStore(s => s.mode) === 'online';
  const items = useDownloadsStore(s => s.items);
  const server = tracks.filter(t => t.source === 'server');
  if (server.length === 0) return null;

  const mine = server.map(t => items[t.id]);
  const done = mine.filter((d): d is DownloadItem => d?.status === 'done');
  const active = mine.some(
    d => d?.status === 'queued' || d?.status === 'downloading',
  );
  const all = done.length === server.length;

  if (!online && !all) return null;

  const onPress = () => {
    if (active) return navigation.navigate('Downloads');
    if (all) return confirmRemoveDownloads(done);
    useDownloadsStore.getState().enqueue(server);
    const left = server.length - done.length;
    Alert.alert(
      'Added to downloads',
      `${left} ${left === 1 ? 'song' : 'songs'} will be saved to ${
        useDownloadsStore.getState().location.label
      }.`,
    );
  };

  return (
    <IconButton
      icon={
        <Icon
          name={all ? 'check' : 'download'}
          size={20}
          color={all || active ? '#00E28A' : '#9A9AA8'}
        />
      }
      size={44}
      onPress={onPress}
      accessibilityLabel={
        all
          ? 'Delete downloads'
          : active
          ? 'Downloading, open Downloads'
          : 'Download all'
      }
    />
  );
}
