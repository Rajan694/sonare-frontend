import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import Icon from '../components/ui/Icon';
import { DownloadsView } from '../components/music/DownloadsView';

/**
 * Downloads (M-downloads): what's in progress, with pause / resume / delete, and what is on
 * the phone. Deleting a finished song deletes its file from the folder it was saved to; if
 * the file has moved (or can't be deleted), it is only taken off this list.
 */
export const DownloadsScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header
        titleAlign="start"
        title="Downloads"
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
        right={
          <IconButton
            icon={<Icon name="settings" size={20} color="#FFFFFF" />}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Download settings"
          />
        }
      />
      <DownloadsView />
    </Screen>
  );
};
