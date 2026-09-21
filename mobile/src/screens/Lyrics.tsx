import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { usePlayerStore } from '../store/player';
import { Chip } from '../components/ui/Chip';
import Animated from 'react-native-reanimated';

export function LyricsScreen() {
  const navigation = useNavigation<any>();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const [userScrolling, setUserScrolling] = useState(false);

  const mockLines = [
    { atMs: 12000, text: "I've been walking perfectly straight" },
    { atMs: 15500, text: "Just looking at the ground" },
    { atMs: 18000, text: "But I've been walking in circles" },
    { atMs: 22000, text: "For miles and miles around" },
    { atMs: 27000, text: "There's a fire burning in the hills" },
    { atMs: 31000, text: "That never touches the town" },
    { atMs: 36000, text: "And we're just waiting for the rain" },
    { atMs: 40000, text: "To come and put it down" },
  ];

  const activeIndex = 2; // Simulated track progress
  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lineHeights = useRef<{ [key: number]: number }>({});
  
  useEffect(() => {
    if (!userScrolling) {
      let y = 0;
      for (let i = 0; i < activeIndex; i++) {
        y += lineHeights.current[i] || 40;
      }
      y = Math.max(0, y - 100);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y, animated: true });
      }
    }
  }, [activeIndex, userScrolling]);

  if (!currentTrack) {
    return (
      <Screen>
        <Header title="Lyrics" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-t3 text-bm">Nothing playing</Text>
        </View>
      </Screen>
    );
  }

  const Component = Animated.ScrollView as any;

  return (
    <Screen scrollable={false} className="bg-s0">
      <Header
        title={currentTrack.title}
        left={<IconButton icon={<Text className="text-t1 text-h2">↓</Text>} onPress={() => navigation.goBack()} accessibilityLabel="Close lyrics" />}
        right={<IconButton icon={<Text className="text-t1 text-h2">⋮</Text>} onPress={() => {}} accessibilityLabel="Lyrics options" />}
      />

      <View className="px-6 py-4">
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-lg bg-s2 items-center justify-center">
             <Text className="text-t2 text-lg">🎵</Text>
          </View>
          <View className="flex-1">
            <Text className="text-t1 text-tm font-medium" numberOfLines={1}>{currentTrack.title}</Text>
            <Text className="text-t3 text-bs" numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <View className="bg-s3 px-2 py-1 rounded">
            <Text className="text-t2 text-mono-s">.lrc</Text>
          </View>
        </View>

        <View className="flex-row gap-2 mt-4">
          <Chip label="Synced" active onPress={() => {}} />
          <Chip label="Plain text" onPress={() => {}} />
          <Chip label="Offset -0.3s" onPress={() => {}} />
        </View>
      </View>

      <Component
        ref={scrollViewRef}
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 150 }}
        onScrollBeginDrag={() => setUserScrolling(true)}
        scrollEventThrottle={16}
      >
        {mockLines.map((item, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          
          return (
            <View 
              key={index} 
              className="flex-row items-start mb-6"
              onLayout={(e: LayoutChangeEvent) => {
                lineHeights.current[index] = e.nativeEvent.layout.height + 24; // approx margin
              }}
            >
              <Text className={`w-10 pt-1.5 text-mono-s ${isActive ? 'text-acc' : 'text-t4'}`}>
                {Math.floor(item.atMs / 60000)}:{(Math.floor(item.atMs / 1000) % 60).toString().padStart(2, '0')}
              </Text>
              <Pressable
                onPress={() => {}}
                className="flex-1"
              >
                <Text
                  className={`text-h2 font-bold ${
                    isActive ? 'text-t1' : isPast ? 'text-t3 opacity-55' : 'text-t3 opacity-55'
                  }`}
                  style={isActive ? { textShadowColor: 'rgba(0,226,138,0.35)', textShadowRadius: 24 } : {}}
                >
                  {item.text}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </Component>
    </Screen>
  );
}
