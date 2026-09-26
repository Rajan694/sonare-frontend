import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { SegmentedControl } from '../components/ui/Segmented';
import { useModeStore } from '../store/mode';
import Animated, { FadeIn, FadeOut, Layout, ReduceMotion } from 'react-native-reanimated';
import Icon from '../components/ui/Icon';

export function ModeSwitchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setMode } = useModeStore();
  const [stayOffline, setStayOffline] = React.useState(true);
  // This screen only exists for the Online -> Offline confirmation (AGENTS.md
  // section 2 — Offline -> Online is immediate and never routes here), so the
  // target mode is the mode being switched TO, not whatever is current.
  const [localMode, setLocalMode] = React.useState<'online' | 'offline'>(
    route.params?.targetMode ?? 'offline',
  );

  return (
    <Screen scrollable={false} className="bg-s0/90 items-center justify-end">
      {/* Blurred background overlay would go here with blur view - simulated with bg opacity */}
      <Animated.View 
        layout={Layout.springify().damping(20).reduceMotion(ReduceMotion.System)}
        className="absolute inset-x-0 bottom-0 bg-s1 shadow-2xl rounded-t-3xl pt-2 px-6 pb-8 border-t border-ln2 elevation-4 z-50 shadow-black"
      >
        <View className="w-10 h-1 bg-s3 rounded-full self-center mb-4" />
        
        <View className="items-center mb-6">
          <SegmentedControl
             value={localMode}
             onChange={(val) => setLocalMode(val as 'online' | 'offline')}
             options={[
               { value: 'online', label: 'Online' },
               { value: 'offline', label: 'Offline' }
             ]}
             variant="cloud-device"
             className="w-48 mb-6"
          />

          <Text className="text-h2 font-bold text-t1 mb-2">
            Switch to {localMode === 'offline' ? 'Offline' : 'Online'} Mode?
          </Text>
          <Text className="text-t2 text-bm text-center max-w-[290px]">
            {localMode === 'offline' 
              ? 'Sonare will use only the music stored on this device. Nothing is fetched from the server.' 
              : 'Reconnect to Sonare servers to access full library, sync, and recommendations.'}
          </Text>
        </View>

        <Animated.View layout={Layout.springify().damping(20).reduceMotion(ReduceMotion.System)} className="bg-s2/40 rounded-xl p-3 gap-3 mb-6">
          <Text className="text-t3 text-ov font-medium pl-1">{localMode === 'offline' ? 'Stays available' : 'Will be available'}</Text>
          
          <View className="flex-row items-center gap-3">
             <View className="w-6 h-6 rounded items-center justify-center bg-local/20">
                <Icon name="smartphone" size={12} color="#FFC24D" />
             </View>
             <Text className="text-t1 text-bs flex-1">
               {localMode === 'offline' ? 'Songs stored on this device' : 'Full server library and catalogs'}
             </Text>
          </View>
          
          <View className="flex-row items-center gap-3">
             <View className="w-6 h-6 rounded items-center justify-center bg-local/20">
                <Icon name="folder" size={12} color="#FFC24D" />
             </View>
             <Text className="text-t1 text-bs flex-1">
               {localMode === 'offline' ? '5 music folders and all local playlists' : 'Online search and discovery'}
             </Text>
          </View>

          {localMode === 'offline' && (
            <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)} exiting={FadeOut.duration(200).reduceMotion(ReduceMotion.System)} layout={Layout.springify().reduceMotion(ReduceMotion.System)}>
              <View className="h-px bg-ln mb-2 mt-1" />
              <Text className="text-t3 text-ov font-medium pl-1 mb-3">Hidden while offline</Text>
              
              <View className="flex-row items-center gap-3 opacity-60 mb-2">
                 <View className="w-6 h-6 rounded items-center justify-center bg-s3">
                    <Icon name="cloud" size={12} color="#7E7E8C" />
                 </View>
                 <Text className="text-t3 text-bs flex-1">Server library, recommendations and trending</Text>
              </View>
              
              <View className="flex-row items-center gap-3 opacity-60">
                 <View className="w-6 h-6 rounded items-center justify-center bg-s3">
                    <Icon name="search" size={12} color="#7E7E8C" />
                 </View>
                 <Text className="text-t3 text-bs flex-1">Online search results</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {localMode === 'offline' && (
          <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)} exiting={FadeOut.duration(200).reduceMotion(ReduceMotion.System)} layout={Layout.springify().reduceMotion(ReduceMotion.System)} className="flex-row items-center gap-3 mb-6">
            <Switch value={stayOffline} onValueChange={setStayOffline} accessibilityLabel="Stay offline automatically" variant="gold" />
            <View className="flex-1">
              <Text className="text-t1 text-tm font-medium">Stay offline until I switch back</Text>
              <Text className="text-t3 text-bs">Otherwise Sonare reconnects when Wi-Fi returns</Text>
            </View>
          </Animated.View>
        )}

        <View className="flex-row gap-3">
          <Button onPress={() => navigation.goBack()} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button 
            onPress={() => {
              setMode(localMode);
              navigation.goBack();
            }} 
            variant={localMode === 'offline' ? 'gold' : 'solid'} 
            className="flex-1"
          >
            {localMode === 'offline' ? 'Go offline' : 'Go online'}
          </Button>
        </View>
      </Animated.View>
    </Screen>
  );
}
