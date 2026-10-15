import React, { useCallback, useState } from 'react';
import { View, ScrollView, Alert, Pressable, Dimensions } from 'react-native';
import { Text } from '../components/ui/Text';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { SegmentedControl } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { useModeStore } from '../store/mode';
import { useAuthStore } from '../data/auth';
import { useSyncStatus } from '../data/sync';
import { useSettingsStore, type AudioQuality, type DownloadFormat } from '../data/settings';
import { useDownloadsStore } from '../store/downloads';
import { cn } from '../lib/cn';
import Icon from '../components/ui/Icon';
import { usePlayerSheets } from '../components/music/PlayerSheets';
import { lyricsScriptLabel, useDevicePrefsStore } from '../store/devicePrefs';
import { useAppUpdateStore } from '../store/appUpdate';
import { appVersion } from '../native/SonareBuild';
import { VerifyEmailCode } from '../components/account/VerifyEmailCode';
import { Sheet } from '../components/ui/Sheet';
import { parseReleaseNotes } from '../../../shared/releaseNotes';
import { SonarePlayer } from '../native/SonarePlayer';
import { formatBytes } from '../lib/format';
import type { AppRelease } from '../data/types';
import { musicFolders, useLocalMusicStore } from '../store/localMusic';

const plays = (n: number) => `${n} ${n === 1 ? 'play' : 'plays'}`;

export const SettingsScreen = () => {
  // Music folders: how many, or that Sonare may not read them yet.
  const musicPermission = useLocalMusicStore((state) => state.permission);
  const phoneSongs = useLocalMusicStore((state) => state.songs);
  const hiddenFolders = useLocalMusicStore((state) => state.hidden);
  const foldersSummary = React.useMemo(() => {
    if (musicPermission !== 'granted') return 'Allow access to play the music on this phone';
    const folders = musicFolders({ songs: phoneSongs, hidden: hiddenFolders });
    const shown = folders.filter((f) => !f.hidden).length;
    return folders.length === 0 ? 'No music on this phone yet' : `${shown} of ${folders.length} folders shown`;
  }, [musicPermission, phoneSongs, hiddenFolders]);
  const sync = useSyncStatus();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const mode = useModeStore((s) => s.mode);
  const setMode = useModeStore((s) => s.setMode);

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
  const showSheet = usePlayerSheets((st) => st.show);
  const lyricsScript = useDevicePrefsStore((st) => st.lyricsScript);
  const streamQuality = useSettingsStore((s) => s.streamQuality);
  const downloadQuality = useSettingsStore((s) => s.downloadQuality);
  const downloadFormat = useSettingsStore((s) => s.downloadFormat);
  const updateSettings = useSettingsStore((s) => s.update);
  const location = useDownloadsStore((s) => s.location);
  const doneCount = useDownloadsStore((s) => Object.values(s.items).filter((d) => d.status === 'done').length);
  const activeCount = useDownloadsStore(
    (s) => Object.values(s.items).filter((d) => d.status === 'queued' || d.status === 'downloading').length,
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
                onPress: () => useDownloadsStore.getState().resetLocation(),
              },
            ]
          : []),
        { text: 'Choose folder', onPress: () => changeLocation() },
      ],
    );

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header
        titleAlign="start"
        title={<Text className="text-tl font-semibold text-t1">Settings</Text>}
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
      />

      <ScrollView className="flex-1 px-5 pt-2" contentContainerStyle={{ paddingBottom: 160, gap: 18 }}>
        {/* Account Profile Card */}
        <View className="bg-s1 border border-ln rounded-lg p-3.5 flex-row items-center gap-3.5">
          <View className="w-[52px] h-[52px] rounded-full bg-s3 items-center justify-center overflow-hidden">
            {user?.displayName ? (
              <Text className="text-t1 text-h2 font-semibold">{user.displayName.charAt(0).toUpperCase()}</Text>
            ) : (
              <Icon name="user" size={24} color="#9A9AA8" />
            )}
          </View>
          <View className="flex-1 gap-0.5 min-w-0">
            <Text className="text-tl font-semibold text-t1 truncate" numberOfLines={1}>
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
            <View className={cn('w-1.5 h-1.5 rounded-full', isGold ? 'bg-gold' : 'bg-acc')} />
            <Text className={cn('text-ls font-semibold uppercase', isGold ? 'text-gold' : 'text-acc')}>
              {isGold ? 'OFFLINE' : 'ONLINE'}
            </Text>
          </View>
        </View>

        {/* Guests: the way in (signed-in people find Sign out at the bottom) */}
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
        ) : null}

        {user?.emailVerified === false && (
          <View className="bg-s1 border border-ln rounded-lg p-3.5 gap-3">
            <View className="gap-0.5">
              <Text className="text-tm font-semibold text-t1">Email not verified</Text>
              <Text className="text-bs text-t3">
                Enter the 6-digit code we emailed to {user.email}. A verified email lets you reset your password if you
                forget it.
              </Text>
            </View>
            <VerifyEmailCode
              email={user.email}
              onVerified={() => Alert.alert('Email verified', `${user.email} is verified.`)}
            />
          </View>
        )}

        {/* Connection Mode Section */}
        <View className="bg-s1 border border-ln rounded-lg p-3.5 gap-3">
          <View className="gap-0.5">
            <Text className="text-tm font-semibold text-t1">Connection mode</Text>
            <Text className="text-bs text-t3">Controls what the whole app shows</Text>
          </View>
          <SegmentedControl
            options={[
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
            ]}
            value={mode}
            onChange={(value) => {
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
                  ? `Offline mode active · ${plays(sync.pending)} will sync when you're back online`
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
                    ? `Online mode active · ${plays(sync.pending)} waiting to sync`
                    : 'Online mode active · streaming & sync enabled'}
              </Text>
            </View>
          )}
        </View>

        {/* Playback Settings Group */}
        <View className="gap-2">
          <Text className="text-ov font-semibold text-t3 uppercase pl-1">Playback</Text>
          <View className="bg-s1 border border-ln rounded-lg py-1 overflow-hidden">
            <View className="px-4 py-3.5 gap-2.5 border-b border-ln">
              <View className="gap-0.5">
                <Text className="text-tm font-medium text-t1">Streaming quality</Text>
                <Text className="text-bs text-t3">Applies from the next song · Low saves mobile data</Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                ]}
                value={streamQuality}
                onChange={(v) => updateSettings({ streamQuality: v as AudioQuality })}
              />
            </View>
            <Pressable
              onPress={() => navigation.navigate('Equalizer')}
              className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="equalizer" size={18} color="#9A9AA8" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">Equalizer & effects</Text>
                <Text className="text-bs text-t3 truncate">8-band EQ, effects, speed & crossfade</Text>
              </View>
              <Icon name="chevron-right" size={16} color="#7E7E8C" />
            </Pressable>

            <Pressable
              onPress={() => showSheet('lyrics')}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
              accessibilityRole="button"
              accessibilityLabel="Lyrics language"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="lyrics" size={18} color="#9A9AA8" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">Lyrics language</Text>
                <Text className="text-bs text-t3 truncate" numberOfLines={1}>
                  {lyricsScriptLabel(lyricsScript)}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color="#7E7E8C" />
            </Pressable>
          </View>
        </View>

        {/* Downloads */}
        <View className="gap-2">
          <Text className="text-ov font-semibold text-t3 uppercase pl-1">Library</Text>
          <View className="bg-s1 border border-ln rounded-lg overflow-hidden">
            <Pressable
              onPress={() => navigation.navigate('Folders')}
              className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="folder" size={18} color="#9A9AA8" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">Music folders</Text>
                <Text className="text-bs text-t3 truncate">{foldersSummary}</Text>
              </View>
              <Icon name="chevron-right" size={16} color="#7E7E8C" />
            </Pressable>

            <View className="px-4 py-3.5 gap-2.5 border-b border-ln">
              <View className="gap-0.5">
                <Text className="text-tm font-medium text-t1">Download quality</Text>
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
                onChange={(v) => updateSettings({ downloadQuality: v as AudioQuality })}
              />
            </View>
            <View className="px-4 py-3.5 gap-2.5 border-b border-ln">
              <View className="gap-0.5">
                <Text className="text-tm font-medium text-t1">File format</Text>
                <Text className="text-bs text-t3">
                  Saved as YouTube serves it, never re-encoded. AAC plays in more apps.
                </Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'opus', label: 'Opus (.mka)' },
                  { value: 'm4a', label: 'AAC (.m4a)' },
                ]}
                value={downloadFormat}
                onChange={(v) => updateSettings({ downloadFormat: v as DownloadFormat })}
              />
            </View>
            <Pressable
              onPress={locationOptions}
              className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln"
              accessibilityRole="button"
              accessibilityLabel="Download location"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="folder" size={18} color="#9A9AA8" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">Download location</Text>
                <Text className="text-bs text-t3" numberOfLines={1}>
                  {location.label}
                </Text>
              </View>
              <Text className="text-bs text-acc">Change</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Downloads')}
              className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln"
              accessibilityRole="button"
              accessibilityLabel="Manage downloads"
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name="download" size={18} color="#9A9AA8" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">Manage downloads</Text>
                <Text className="text-bs text-t3">
                  {activeCount > 0 ? `${activeCount} in progress · ${doneCount} downloaded` : `${doneCount} downloaded`}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color="#7E7E8C" />
            </Pressable>
            <StreamCacheRow />
          </View>
        </View>

        <AboutSection online={mode !== 'offline'} />

        {user && (
          <View className="gap-2">
            <Text className="text-ov font-semibold text-t3 uppercase pl-1">Account</Text>
            <View className="bg-s1 border border-ln rounded-lg py-1 overflow-hidden">
              <Pressable
                onPress={() => navigation.navigate('Account')}
                className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln"
                accessibilityRole="button"
                accessibilityLabel="Account details"
              >
                <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                  <Icon name="user" size={18} color="#9A9AA8" />
                </View>
                <View className="flex-1 gap-0.5 min-w-0">
                  <Text className="text-tm font-medium text-t1">Account details</Text>
                  <Text className="text-bs text-t3 truncate" numberOfLines={1}>
                    Name, password, delete account
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color="#7E7E8C" />
              </Pressable>
              <Pressable
                onPress={confirmSignOut}
                className="flex-row items-center gap-3.5 px-4 py-3.5"
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <View className="w-9 h-9 items-center justify-center rounded-sm bg-[rgba(255,77,94,0.12)]">
                  <Icon name="logout" size={18} color="#FF4D5E" />
                </View>
                <View className="flex-1 gap-0.5 min-w-0">
                  <Text className="text-tm font-medium text-red">Sign out</Text>
                  <Text className="text-bs text-t3 truncate" numberOfLines={1}>
                    From this phone only
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** The app's version, and the update check against the builds uploaded on the admin page. */
/** Songs played recently stay on the phone (300 MB, oldest first out), so a replay doesn't download. */
const StreamCacheRow = () => {
  const [bytes, setBytes] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  useFocusEffect(
    useCallback(() => {
      SonarePlayer.streamCacheBytes()
        .then(setBytes)
        .catch(() => setBytes(null));
    }, []),
  );
  const clear = () => {
    setClearing(true);
    SonarePlayer.clearStreamCache()
      .then(setBytes)
      .catch(() => {})
      .finally(() => setClearing(false));
  };
  return (
    <View className="flex-row items-center gap-3.5 px-4 py-3.5">
      <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
        <Icon name="history" size={18} color="#9A9AA8" />
      </View>
      <View className="flex-1 gap-0.5 min-w-0">
        <Text className="text-tm font-medium text-t1">Stream cache</Text>
        <Text className="text-bs text-t3" numberOfLines={2}>
          {bytes === null
            ? 'Songs you played recently'
            : `${bytes > 0 ? `${formatBytes(bytes)} of 300 MB` : 'Empty'} · songs you played recently`}
        </Text>
      </View>
      <Button
        variant="outline"
        size="sm"
        onPress={clear}
        disabled={clearing || !bytes}
        accessibilityLabel="Clear stream cache"
      >
        Clear
      </Button>
    </View>
  );
};

const AboutSection = ({ online }: { online: boolean }) => {
  const { status, release, progress, error, check, download, install } = useAppUpdateStore();
  const [notesOpen, setNotesOpen] = React.useState(false);

  // Look each time Settings opens (a download in progress carries on).
  React.useEffect(() => {
    if (online) check();
  }, [online, check]);

  const onInstall = async () => {
    if ((await install()) === 'permission') {
      Alert.alert(
        'Allow Sonare to install the update',
        'Turn on "Allow from this source", come back, and tap Install again.',
      );
    }
  };

  let icon: React.ComponentProps<typeof Icon>['name'] = 'refresh';
  let label = 'Checking for updates…';
  let desc: string | undefined;
  let action: React.ReactNode = null;
  if (!online) {
    icon = 'wifi-off';
    label = 'Updates need Online mode';
    desc = 'Switch to Online to check for a newer version';
  } else if (status === 'current') {
    icon = 'check';
    label = 'Sonare is up to date';
    desc = `Version ${appVersion} is the newest`;
    action = (
      <Button variant="outline" size="sm" onPress={() => check()}>
        Check again
      </Button>
    );
  } else if (status === 'available' && release) {
    icon = 'download';
    label = `Sonare ${release.version} is available`;
    desc = `${formatSize(release.sizeBytes)} · Tap to see what's new`;
    action = (
      <Button size="sm" onPress={() => download()}>
        Download
      </Button>
    );
  } else if (status === 'downloading' && release) {
    icon = 'download';
    label = `Downloading Sonare ${release.version}…`;
    desc = `${Math.round(progress * 100)}% of ${formatSize(release.sizeBytes)}`;
  } else if (status === 'downloaded' && release) {
    icon = 'check';
    label = `Sonare ${release.version} is downloaded`;
    desc = "Install it to update; your music and settings stay. Tap to see what's new";
    action = (
      <Button size="sm" onPress={onInstall}>
        Install
      </Button>
    );
  } else if (status === 'error') {
    icon = 'warning';
    label = release ? "Couldn't download the update" : "Couldn't check for updates";
    desc = error ?? undefined;
    action = (
      <Button variant="outline" size="sm" onPress={() => (release ? download() : check())}>
        Try again
      </Button>
    );
  }

  const hasNotes = online && !!release && (status === 'available' || status === 'downloaded');
  const notesAction =
    status === 'available'
      ? { label: 'Download', run: () => download() }
      : status === 'downloaded'
        ? { label: 'Install', run: onInstall }
        : null;

  return (
    <View className="gap-2">
      {release && (
        <ReleaseNotesSheet
          visible={notesOpen && hasNotes}
          release={release}
          action={notesAction?.label}
          onAction={() => {
            setNotesOpen(false);
            notesAction?.run();
          }}
          onClose={() => setNotesOpen(false)}
        />
      )}
      <Text className="text-ov font-semibold text-t3 uppercase pl-1">About</Text>
      <View className="bg-s1 border border-ln rounded-lg overflow-hidden">
        <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
          <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
            <Icon name="info" size={18} color="#9A9AA8" />
          </View>
          <View className="flex-1 gap-0.5 min-w-0">
            <Text className="text-tm font-medium text-t1">Sonare</Text>
            <Text className="text-bs text-t3">Version {appVersion}</Text>
          </View>
        </View>
        <View className="px-4 py-3.5 gap-2.5" accessibilityLabel="Updates">
          <View className="flex-row items-center gap-3.5">
            {/* A newer build: the row opens its changes. */}
            <Pressable
              className="flex-1 flex-row items-center gap-3.5 min-w-0"
              disabled={!hasNotes}
              onPress={() => setNotesOpen(true)}
              accessibilityRole={hasNotes ? 'button' : undefined}
              accessibilityLabel={hasNotes ? "What's new" : undefined}
            >
              <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
                <Icon name={icon} size={18} color="#9A9AA8" />
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-tm font-medium text-t1">{label}</Text>
                {desc ? (
                  <Text className="text-bs text-t3" numberOfLines={2}>
                    {desc}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            {action}
          </View>
          {hasNotes && (
            <Button variant="outline" size="sm" className="self-start" onPress={() => setNotesOpen(true)}>
              What's new
            </Button>
          )}
          {status === 'downloading' && (
            <View
              className="h-1.5 rounded-full bg-s3 overflow-hidden"
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            >
              <View className="h-full bg-acc" style={{ width: `${progress * 100}%` }} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

/** What changed in a newer build (the release's notes), with its download or install. */
const ReleaseNotesSheet = ({
  visible,
  release,
  action,
  onAction,
  onClose,
}: {
  visible: boolean;
  release: AppRelease;
  action?: string;
  onAction: () => void;
  onClose: () => void;
}) => {
  const notes = parseReleaseNotes(release.notes);
  const date = new Date(release.uploadedAt);
  const meta = [
    Number.isNaN(date.getTime())
      ? null
      : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    formatSize(release.sizeBytes),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="px-6 pb-6 gap-4">
        <View className="gap-1">
          <Text className="text-h2 font-semibold text-t1">What's new in Sonare {release.version}</Text>
          <Text className="text-bs text-t3">{meta}</Text>
        </View>
        <ScrollView
          style={{ maxHeight: Dimensions.get('window').height * 0.45 }}
          contentContainerStyle={{ gap: 10 }}
          accessibilityLabel="Changes"
        >
          {notes.length === 0 ? (
            <Text className="text-bm text-t3">This release has no notes.</Text>
          ) : (
            notes.map((block, i) =>
              block.kind === 'heading' ? (
                <Text key={i} className="text-tm font-semibold text-t1 pt-1">
                  {block.text}
                </Text>
              ) : block.kind === 'item' ? (
                <View key={i} className="flex-row gap-2.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-acc mt-[9px]" />
                  <Text className="flex-1 text-bm text-t2">{block.text}</Text>
                </View>
              ) : (
                <Text key={i} className="text-bm text-t2">
                  {block.text}
                </Text>
              ),
            )
          )}
        </ScrollView>
        <View className="flex-row gap-2.5">
          <Button variant="outline" className="flex-1" onPress={onClose}>
            Later
          </Button>
          {action ? (
            <Button variant="accent" className="flex-1" onPress={onAction}>
              {action}
            </Button>
          ) : null}
        </View>
      </View>
    </Sheet>
  );
};
