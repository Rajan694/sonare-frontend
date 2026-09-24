import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from './Button';
import Icon from './Icon';

interface GuestPromptProps {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  body: string;
}

/** Stands in for account-only content (library, playlists) while listening as a guest. */
export function GuestPrompt({ icon, title, body }: GuestPromptProps) {
  const navigation = useNavigation<any>();
  return (
    <View className="px-8 py-16 items-center">
      <View className="w-16 h-16 rounded-full bg-s2 items-center justify-center mb-5">
        <Icon name={icon} size={28} color="#9A9AA8" />
      </View>
      <Text className="text-t1 text-h2 font-semibold text-center mb-2">{title}</Text>
      <Text className="text-t2 text-bm text-center mb-6">{body}</Text>
      <View className="flex-row gap-3">
        <Button variant="accent" onPress={() => navigation.navigate('SignIn', { mode: 'signup' })}>
          Create account
        </Button>
        <Button variant="outline" onPress={() => navigation.navigate('SignIn', { mode: 'signin' })}>
          Sign in
        </Button>
      </View>
    </View>
  );
}
