import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/ui/Text';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { SegmentedControl } from '../components/ui/Segmented';
import { useModeStore } from '../store/mode';
import { useSettingsStore } from '../data/settings';
import { downloadedTracks, useDownloadsStore } from '../store/downloads';
import { songCount } from '../lib/format';
import Animated, { FadeIn, FadeOut, Layout, ReduceMotion, SlideInDown } from 'react-native-reanimated';
import Icon, { type IconName } from '../components/ui/Icon';

/** A line of the "stays / hidden" list (design M14): tinted icon box, text, ✓ or ×. */
function Item({ icon, label, kept }: { icon: IconName; label: string; kept: boolean }) {
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <View className={`w-[26px] h-[26px] rounded-[6px] items-center justify-center ${kept ? 'bg-goldbg' : 'bg-s3'}`}>
        <Icon name={icon} size={14} color={kept ? '#FFC24D' : '#7E7E8C'} />
      </View>
      <Text className={`text-bs flex-1 ${kept ? 'text-t1' : 'text-t3'}`}>{label}</Text>
      <Icon name={kept ? 'check' : 'close'} size={14} color={kept ? '#FFC24D' : '#5A5A66'} />
    </View>
  );
}

export function ModeSwitchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { setMode } = useModeStore();
  const downloads = useDownloadsStore((s) => s.items);
  const onPhone = React.useMemo(() => downloadedTracks(downloads).length, [downloads]);
  // Starts from the saved choice; saved again when the switch to Offline is confirmed.
  const [stayOffline, setStayOffline] = React.useState(() => useSettingsStore.getState().stayOffline);
  // This screen only exists for the Online -> Offline confirmation (AGENTS.md
  // section 2 — Offline -> Online is immediate and never routes here), so the
  // target mode is the mode being switched TO, not whatever is current.
  const [localMode, setLocalMode] = React.useState<'online' | 'offline'>(route.params?.targetMode ?? 'offline');
  const offline = localMode === 'offline';

  const confirm = () => {
    if (offline) useSettingsStore.getState().update({ stayOffline });
    setMode(localMode);
    navigation.goBack();
  };

  return (
    <View className="flex-1 justify-end">
      {/* The screen underneath stays in view, dimmed; tapping it cancels. */}
      <Pressable
        className="absolute inset-0 bg-[rgba(0,0,0,0.62)]"
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
      />
      <Animated.View
        entering={SlideInDown.springify().damping(22).reduceMotion(ReduceMotion.System)}
        layout={Layout.springify().damping(20).reduceMotion(ReduceMotion.System)}
        className="bg-s1 rounded-t-2xl border-t border-ln2 px-[22px] pt-2.5"
        style={{ paddingBottom: insets.bottom + 22 }}
      >
        <View className="w-10 h-1 bg-ln3 rounded-full self-center mb-5" />

        <View className="items-center gap-2.5 mb-5">
          <SegmentedControl
            value={localMode}
            onChange={(val) => setLocalMode(val as 'online' | 'offline')}
            options={[
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
            ]}
            variant="cloud-device"
            className="w-[200px] mb-2"
          />
          <Text className="text-h2 font-semibold text-t1 text-center">
            Switch to {offline ? 'Offline' : 'Online'} Mode?
          </Text>
          <Text className="text-t2 text-bm text-center max-w-[300px]">
            {offline
              ? 'Sonare will use only the music stored on this device. Nothing is fetched from the server.'
              : 'Reconnect to the Sonare server for the full library, sync and recommendations.'}
          </Text>
        </View>

        <Animated.View
          layout={Layout.springify().damping(20).reduceMotion(ReduceMotion.System)}
          className="bg-s0 border border-ln2 rounded-lg px-3.5 py-3 mb-5"
        >
          <Text className="text-t3 text-ov uppercase mb-1.5">{offline ? 'Stays available' : 'Comes back'}</Text>
          {offline ? (
            <>
              <Item icon="smartphone" label={`${songCount(onPhone)} downloaded on this phone`} kept />
              <Item icon="heart-filled" label="Favourites, play counts and history" kept />
            </>
          ) : (
            <>
              <Item icon="cloud" label="The full server library and trending" kept />
              <Item icon="search" label="Online search results" kept />
            </>
          )}

          {offline && (
            <Animated.View
              entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
              exiting={FadeOut.duration(200).reduceMotion(ReduceMotion.System)}
            >
              <View className="h-px bg-ln my-2.5" />
              <Text className="text-t3 text-ov uppercase mb-1.5">Hidden while offline</Text>
              <Item icon="cloud" label="Server library, recommendations and trending" kept={false} />
              <Item icon="search" label="Online search results" kept={false} />
              <Item icon="refresh" label="Playlist sync with your account" kept={false} />
            </Animated.View>
          )}
        </Animated.View>

        {offline && (
          <Animated.View
            entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.duration(200).reduceMotion(ReduceMotion.System)}
            className="flex-row items-center gap-3 mb-5"
          >
            <Switch
              value={stayOffline}
              onValueChange={setStayOffline}
              accessibilityLabel="Stay offline automatically"
              variant="gold"
            />
            <View className="flex-1">
              <Text className="text-t1 text-tm font-medium">Stay offline until I switch back</Text>
              <Text className="text-t3 text-bs">Otherwise Sonare reconnects when Wi-Fi returns</Text>
            </View>
          </Animated.View>
        )}

        <View className="flex-row gap-3">
          <Button onPress={() => navigation.goBack()} variant="outline" size="lg" className="flex-1">
            Cancel
          </Button>
          <Button
            onPress={confirm}
            variant={offline ? 'gold' : 'accent'}
            size="lg"
            className="flex-1"
            icon={<Icon name={offline ? 'smartphone' : 'cloud'} size={18} color="#000000" />}
          >
            {offline ? 'Go offline' : 'Go online'}
          </Button>
        </View>
      </Animated.View>
    </View>
  );
}
