import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Switch } from '../components/ui/Switch';
import Icon from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../data/auth';

function SettingsGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <View className="mb-8">
      <Text className="text-t2 text-bm font-medium uppercase tracking-widest px-4 mb-2">{title}</Text>
      <View className="bg-s0 border-y border-ln">
        {children}
      </View>
    </View>
  );
}

function SettingsRow({ title, subtitle, right }: { title: string, subtitle?: string, right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-ln last:border-b-0 min-h-[56px]">
      <View className="flex-1 pr-4">
        <Text className="text-t1 text-tl">{title}</Text>
        {subtitle && <Text className="text-t3 text-bm mt-0.5">{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your favourites and playlists stay saved to your account. You can keep listening as a guest.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <Screen>
      <Header
        title="Settings"
        left={<IconButton icon={<Icon name="back" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Go back" />}
      />

      <ScrollView className="flex-1 pt-6 pb-20">
        <SettingsGroup title="Account">
          {user ? (
            <>
              <SettingsRow
                title={user.displayName}
                subtitle={user.email}
                right={
                  <View className="w-10 h-10 rounded-full bg-acc items-center justify-center">
                    <Text className="text-black text-tm font-semibold">{user.displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                }
              />
              <View className="px-4 py-3">
                <Button variant="outline" onPress={confirmSignOut} accessibilityLabel="Sign out">
                  <Text className="text-red text-tm font-medium">Sign out</Text>
                </Button>
              </View>
            </>
          ) : (
            <>
              <SettingsRow
                title="Listening as a guest"
                subtitle="Create a free account to save favourites and playlists, and pick them up on any device."
              />
              <View className="px-4 py-3 flex-row gap-3">
                <Button variant="accent" className="flex-1" onPress={() => navigation.navigate('SignIn', { mode: 'signup' })}>
                  Create account
                </Button>
                <Button variant="outline" className="flex-1" onPress={() => navigation.navigate('SignIn', { mode: 'signin' })}>
                  Sign in
                </Button>
              </View>
            </>
          )}
        </SettingsGroup>

        <SettingsGroup title="Playback">
          <SettingsRow 
            title="Gapless Playback" 
            subtitle="Eliminate silence between tracks"
            right={<Switch value={true} onValueChange={() => {}} accessibilityLabel="Gapless Playback" />}
          />
          <SettingsRow 
            title="Volume Normalization" 
            subtitle="Play all tracks at the same volume level"
            right={<Switch value={false} onValueChange={() => {}} accessibilityLabel="Volume Normalization" />}
          />
          <SettingsRow 
            title="Crossfade" 
            right={<Text className="text-t2 text-tl">4s ›</Text>}
          />
        </SettingsGroup>

        <SettingsGroup title="Library & Downloads">
          <SettingsRow 
            title="Local Folders" 
            subtitle="Manage where Sonare looks for music"
            right={<Text className="text-t2 text-tl">2 folders ›</Text>}
          />
          <SettingsRow 
            title="Auto-Sync Library" 
            subtitle="Keep metadata updated when online"
            right={<Switch value={true} onValueChange={() => {}} accessibilityLabel="Auto-Sync Library" />}
          />
          <SettingsRow 
            title="Download Quality" 
            right={<Text className="text-t2 text-tl">Original ›</Text>}
          />
        </SettingsGroup>

        <SettingsGroup title="Data & Storage">
          <SettingsRow 
            title="Clear Cache" 
            subtitle="Free up space used by artwork and lyrics"
            right={<Text className="text-t2 text-tl">184 MB</Text>}
          />
        </SettingsGroup>
      </ScrollView>
    </Screen>
  );
}
