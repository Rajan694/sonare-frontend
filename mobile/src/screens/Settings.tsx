import React from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { SegmentedControl } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { useModeStore } from '../store/mode';
import { useAuthStore } from '../data/auth';
import { useSyncStatus } from '../data/sync';
import {
  useSettingsStore,
  type AudioQuality,
  type DownloadFormat,
} from '../data/settings';
import { useDownloadsStore } from '../store/downloads';
import { cn } from '../lib/cn';
import Icon from '../components/ui/Icon';

const plays = (n: number) => `${n} ${n === 1 ? 'play' : 'plays'}`;

export function SettingsScreen() {
  const sync = useSyncStatus();
  const navigation = useNavigation<any>();
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const mode = useModeStore(s => s.mode);
  const setMode = useModeStore(s => s.setMode);

  const confirmSignOut = () =>
    Alert.alert(
      'Sign out?',
      'Your favourites and playlists stay saved to your account. You can keep listening as a guest.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
      ],
    );

  const isGold = mode === 'offline';
  const downloadQuality = useSettingsStore(s => s.downloadQuality);
  const downloadFormat = useSettingsStore(s => s.downloadFormat);
  const updateSettings = useSettingsStore(s => s.update);
  const location = useDownloadsStore(s => s.location);
  const doneCount = useDownloadsStore(
    s => Object.values(s.items).filter(d => d.status === 'done').length,
  );
  const activeCount = useDownloadsStore(
    s =>
      Object.values(s.items).filter(
        d => d.status === 'queued' || d.status === 'downloading',
      ).length,
  );

  const changeLocation = async () => {
    try {
      await useDownloadsStore.getState().chooseLocation();
    } catch (e: any) {
      Alert.alert('Could not change the folder', e?.message);
    }
  };

  const locationOptions = () =>
    Alert.alert(
      'Download location',
      `New downloads are saved to ${location.label}. Songs already downloaded stay where they are.`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...(location.treeUri
          ? [
              {
                text: 'Use Music/Sonare',
                onPress: () =>
                  void useDownloadsStore.getState().resetLocation(),
              },
            ]
          : []),
        { text: 'Choose folder', onPress: () => void changeLocation() },
      ],
    );

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header
        title={<Text className="text-tl font-semibold text-t1">Settings</Text>}
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
      />

      <ScrollView
        className="flex-1 px-5 pt-2"
        contentContainerStyle={{ paddingBottom: 120, gap: 18 }}
      >
        {/* Account Profile Card */}
        <View className="bg-s1 border border-ln rounded-xl p-3.5 flex-row items-center gap-3.5">
          <View className="w-[52px] h-[52px] rounded-full bg-s3 items-center justify-center overflow-hidden">
            {user?.displayName ? (
              <Text className="text-t1 text-h2 font-semibold">
                {user.displayName.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Icon name="user" size={24} color="#9A9AA8" />
            )}
          </View>
          <View className="flex-1 gap-0.5 min-w-0">
            <Text
              className="text-tl font-semibold text-t1 truncate"
              numberOfLines={1}
            >
              {user?.displayName || 'Listening as a guest'}
            </Text>
            <Text className="text-bs text-t2 truncate" numberOfLines={1}>
              {user?.email || 'Sign in to sync your library across devices'}
            </Text>
          </View>
          <View
            className={cn(
              'h-[26px] px-2.5 rounded-full flex-row items-center gap-1.5',
              isGold ? 'bg-goldbg' : 'bg-accbg',
            )}
          >
            <View
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isGold ? 'bg-gold' : 'bg-acc',
              )}
            />
            <Text
              className={cn(
                'text-ls font-semibold uppercase',
                isGold ? 'text-gold' : 'text-acc',
              )}
            >
              {isGold ? 'OFFLINE' : 'ONLINE'}
            </Text>
          </View>
        </View>

        {/* Guest / Account actions */}
        {!user ? (
          <View className="flex-row gap-2.5">
            <Button
              variant="accent"
              size="sm"
              className="flex-1"
              onPress={() => navigation.navigate('SignIn', { mode: 'signup' })}
            >
              Create account
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onPress={() => navigation.navigate('SignIn', { mode: 'signin' })}
            >
              Sign in
            </Button>
          </View>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onPress={confirmSignOut}
            accessibilityLabel="Sign out"
          >
            <Text className="text-red text-bm font-medium">Sign out</Text>
          </Button>
        )}

        {/* Connection Mode Section */}
        <View className="bg-s1 border border-ln rounded-xl p-3.5 gap-3">
          <View className="gap-0.5">
            <Text className="text-tm font-semibold text-t1">
              Connection mode
            </Text>
            <Text className="text-bs text-t3">
              Controls what the whole app shows
            </Text>
          </View>
          <SegmentedControl
            options={[
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
            ]}
            value={mode}
            onChange={value => {
              if (value === 'offline' && mode === 'online') {
                navigation.navigate('ModeSwitch', { targetMode: 'offline' });
              } else {
                setMode(value as 'online' | 'offline');
              }
            }}
            variant="cloud-device"
          />
          {isGold ? (
            <View className="flex-row items-center gap-2 p-2.5 px-3 bg-goldbg border border-[rgba(255,194,77,0.22)] rounded-md">
              <View className="w-1.5 h-1.5 rounded-full bg-gold" />
              <Text className="text-bs text-t2 flex-1">
                {sync.pending
                  ? `Offline mode active · ${plays(
                      sync.pending,
                    )} will sync when you're back online`
                  : 'Offline mode active · nothing fetched from server'}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2 p-2.5 px-3 bg-accbg border border-[rgba(0,226,138,0.22)] rounded-md">
              <View className="w-1.5 h-1.5 rounded-full bg-acc" />
              <Text className="text-bs text-t2 flex-1">
                {sync.syncing
                  ? `Online mode active · syncing ${plays(sync.pending)}`
                  : sync.pending
                  ? `Online mode active · ${plays(
                      sync.pending,
                    )} waiting to sync`
                  : 'Online mode active · streaming & sync enabled'}
              </Text>
            </View>
          )}
        </View>

        {/* Downloads */}
        <View className="gap-2">
          <Text className="text-ov font-semibold text-t3 uppercase pl-1">
            Downloads
          </Text>
          <View className="bg-s1 border border-ln rounded-xl overflow-hidden">
            <View className="px-4 py-3.5 gap-2.5 border-b border-ln">
              <View className="gap-0.5">
                <Text className="text-tm font-medium text-t1">
                  Download quality
                </Text>
                <Text className="text-bs text-t3">
                  {downloadFormat === 'm4a'
                    ? 'Low ≈ 50 kbps · Normal and High = 128 kbps (AAC has two steps)'
                    : 'Low ≈ 60 kbps · Normal ≈ 75 kbps · High ≈ 150 kbps'}
                </Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                ]}
                value={downloadQuality}
                onChange={v =>
                  updateSettings({ downloadQuality: v as AudioQuality })
                }
              />
            </View>
            <View className="px-4 py-3.5 gap-2.5 border-b border-ln">
              <View className="gap-0.5">
                <Text className="text-tm font-medium text-t1">File format</Text>
                <Text className="text-bs text-t3">
                  Saved as YouTube serves it, never re-encoded. AAC plays in
                  more apps.
                </Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'opus', label: 'Opus (.mka)' },
                  { value: 'm4a', label: 'AAC (.m4a)' },
                ]}
                value={downloadFormat}
                onChange={v =>
                  updateSettings({ downloadFormat: v as DownloadFormat })
                }
              />
            </View>
            <Pressable
              onPress={locationOptions}
              className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln"
              accessibilityRole="button"
              accessibilityLabel="Download location"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="folder" size={18} color="#7E7E8C" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">
                  Download location
                </Text>
                <Text className="text-bs text-t3" numberOfLines={1}>
                  {location.label}
                </Text>
              </View>
              <Text className="text-bs text-acc">Change</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Downloads')}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
              accessibilityRole="button"
              accessibilityLabel="Manage downloads"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="download" size={18} color="#7E7E8C" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">
                  Manage downloads
                </Text>
                <Text className="text-bs text-t3">
                  {activeCount > 0
                    ? `${activeCount} in progress · ${doneCount} downloaded`
                    : `${doneCount} downloaded`}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color="#7E7E8C" />
            </Pressable>
          </View>
        </View>

        {/* Playback Settings Group */}
        <View className="gap-2">
          <Text className="text-ov font-semibold text-t3 uppercase pl-1">
            Playback
          </Text>
          <View className="bg-s1 border border-ln rounded-xl py-1 overflow-hidden">
            <Pressable
              onPress={() => navigation.navigate('Equalizer')}
              className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="equalizer" size={18} color="#7E7E8C" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">
                  Equalizer & effects
                </Text>
                <Text className="text-bs text-t3 truncate">
                  DSP, 7-band EQ & speed
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color="#7E7E8C" />
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Folders')}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="folder" size={18} color="#7E7E8C" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">
                  Music folders
                </Text>
                <Text className="text-bs text-t3 truncate">
                  Manage device scanned storage
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color="#7E7E8C" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
