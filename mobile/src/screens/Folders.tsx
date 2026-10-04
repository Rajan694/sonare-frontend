import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/ui/Text';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import Icon from '../components/ui/Icon';

/**
 * Music folders on the phone. The app cannot scan device storage yet, so there are no
 * folders to list or manage; this says so instead of showing example folders and buttons
 * that do nothing. Songs you download from Sonare appear under Downloads.
 */
export function FoldersScreen() {
  const navigation = useNavigation<any>();

  return (
    <Screen scrollable={false} className="bg-s0">
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
      />

      <View className="flex-1 items-center justify-center px-8 pb-40 gap-3">
        <View className="w-14 h-14 rounded-full bg-gold/10 items-center justify-center mb-1">
          <Icon name="folder" size={22} color="#FFC24D" />
        </View>
        <Text className="text-t1 text-tl font-medium">No music folders yet</Text>
        <Text className="text-t3 text-bm text-center max-w-[300px]">
          Sonare can't scan this phone's storage yet. Songs you download appear in Downloads.
        </Text>
      </View>
    </Screen>
  );
}
