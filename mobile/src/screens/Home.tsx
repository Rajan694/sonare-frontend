import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { SegmentedControl } from '../components/ui/Segmented';
import { SongRow } from '../components/music/SongRow';
import { IconButton } from '../components/ui/IconButton';
import { Artwork } from '../components/music/Artwork';
import { useModeStore } from '../store/mode';
import { usePlayerStore } from '../store/player';
import { mockTracks } from '../data/mock';
import Animated, { FadeIn } from 'react-native-reanimated';
import { cn } from '../lib/cn';
import Icon from '../components/ui/Icon';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const displayTracks = mode === 'offline' 
    ? mockTracks.filter(t => t.source === 'local')
    : mockTracks;

  const handlePlayTrack = (track: typeof mockTracks[0]) => {
    setCurrentTrack(track);
    setQueue(displayTracks);
    setIsPlaying(true);
  };

  const jumpBackIn = [
    { title: 'Static Bloom', desc: 'Vela Nine', uri: mockTracks[1]?.albumId },
    { title: 'Winter Arithmetic', desc: 'The Orchard Machine', uri: mockTracks[2]?.albumId },
    { title: 'Undertow', desc: 'Mara Vel', uri: mockTracks[3]?.albumId },
    { title: 'Glass Houses', desc: 'Anais Ferrow', uri: mockTracks[4]?.albumId },
  ];

  const madeForYou = [
    { title: 'Neon Arboretum', desc: 'Vela Nine', uri: mockTracks[1]?.albumId },
    { title: 'Parallax', desc: 'Sundial Theory', uri: mockTracks[6]?.albumId },
    { title: 'Velvet Static', desc: 'Mira Sound', uri: mockTracks[5]?.albumId },
    { title: 'Fathom Line', desc: 'Ocean Bureau', uri: mockTracks[8]?.albumId },
  ];

  return (
    <Screen scrollable={false}>
      <Header
        left={
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
        }
        right={
          <View className="flex-row items-center gap-1">
            <IconButton icon={<Icon name="search" size={20} color="#FFFFFF" />} onPress={() => navigation.navigate('Search')} accessibilityLabel="Search" />
            <IconButton icon={<Icon name="settings" size={20} color="#FFFFFF" />} onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings" />
            <IconButton icon={<Artwork size={40} uri="a5" className="rounded-full w-[30px] h-[30px] ml-1 mr-1" />} onPress={() => {}} accessibilityLabel="Your profile" size={32} />
          </View>
        }
      />
      
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 150 }}>
        <View className="px-5 pt-4 pb-6">
          <Text className="text-t3 text-bs mb-0.5">Thursday evening</Text>
          <Text className="text-h1 font-semibold text-t1 mb-5">Welcome back, Rajan</Text>
          
          <Pressable 
             onPress={() => handlePlayTrack(mockTracks[0])}
             className="bg-s1 rounded-xl p-3 flex-row items-center gap-3 mb-6"
          >
             <Artwork uri={mockTracks[0]?.albumId} size={64} className="rounded-md" />
             <View className="flex-1">
                <Text className="text-t3 text-ov mb-1 font-medium tracking-wide uppercase text-[10px]">Continue listening</Text>
                <Text className="text-t1 text-tm font-medium mb-1">Paper Lanterns</Text>
                <View className="flex-row items-center gap-2">
                   <View className="flex-1 h-1 bg-s3 rounded-full overflow-hidden">
                      <View className={cn("h-full", mode === 'online' ? "bg-acc" : "bg-gold")} style={{ width: '38%' }} />
                   </View>
                   <Text className="text-t3 text-mono-s">1:24</Text>
                </View>
             </View>
             <View className={cn("w-10 h-10 rounded-full items-center justify-center mr-1", mode === 'online' ? "bg-acc" : "bg-gold")}>
                <Icon name="play" size={22} color="#000000" />
             </View>
          </Pressable>

          <View className="mb-6">
             <Text className="text-h2 font-semibold text-t1 mb-3">Jump back in</Text>
             <View className="flex-row flex-wrap gap-2.5">
                {jumpBackIn.map((item, i) => (
                   <Animated.View key={item.title} entering={FadeIn.delay(i * 30)} className="w-[48%] bg-s1 rounded-lg p-2.5 flex-row items-center gap-2">
                      <Artwork uri={item.uri} size={40} className="rounded-sm" />
                      <View className="flex-1">
                         <Text className="text-t1 text-ll font-medium truncate" numberOfLines={1}>{item.title}</Text>
                         <Text className="text-t3 text-ls truncate" numberOfLines={1}>{item.desc}</Text>
                      </View>
                   </Animated.View>
                ))}
             </View>
          </View>

          {mode === 'online' && (
            <View className="mb-6 -mx-5 px-5">
               <View className="flex-row items-center justify-between mb-3 px-1">
                  <Text className="text-h2 font-semibold text-t1">Made for you</Text>
                  <Text className="text-t2 text-ll">All ⟩</Text>
               </View>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible" contentContainerStyle={{ paddingRight: 20 }}>
                  {madeForYou.map((item, idx) => (
                    <Animated.View key={item.title} entering={FadeIn.delay(idx * 50)} className="mr-3 w-[132px]">
                       <Artwork uri={item.uri} size={132} className="rounded-lg mb-2" />
                       <Text className="text-t1 text-tm font-medium truncate" numberOfLines={1}>{item.title}</Text>
                       <Text className="text-t2 text-bs truncate" numberOfLines={1}>{item.desc}</Text>
                    </Animated.View>
                  ))}
               </ScrollView>
            </View>
          )}

          <View className="mb-2">
             <View className="flex-row items-center justify-between mb-2">
                <Text className="text-h2 font-semibold text-t1">{mode === 'online' ? 'Trending now' : 'On this device'}</Text>
                <Text className="text-t2 text-ll">All ⟩</Text>
             </View>
             <View className="-mx-4">
                {displayTracks.slice(0, 5).map((item, index) => (
                  <SongRow
                    key={item.id}
                    track={item}
                    index={index}
                    showIndex
                    isPlaying={currentTrack?.id === item.id}
                    onPress={() => handlePlayTrack(item)}
                  />
                ))}
             </View>
          </View>
          
        </View>
      </ScrollView>
    </Screen>
  );
}
