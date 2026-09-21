/**
 * Sonare mobile app.
 *
 * @format
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, SafeAreaView, Pressable } from 'react-native';
import { NativeWindStyleSheet } from "nativewind";

// Mobile Shell equivalent in NativeWind
export default function App() {
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [activeTab, setActiveTab] = useState('home');

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View className="h-16 flex-row items-center justify-between px-4">
        <Text className="text-t1 text-lg font-bold tracking-tight">Sonare</Text>
        <Pressable 
          className="flex-row items-center border border-ln2 rounded-full p-1 bg-s1"
          onPress={() => setMode(mode === 'online' ? 'offline' : 'online')}
        >
          <View className={`px-3 py-1 rounded-full ${mode === 'online' ? 'bg-acc/20 border border-acc/40' : ''}`}>
            <Text className={`text-xs font-semibold ${mode === 'online' ? 'text-acc' : 'text-t3'}`}>ONLINE</Text>
          </View>
          <View className={`px-3 py-1 rounded-full ${mode === 'offline' ? 'bg-gold/20 border border-gold/40' : ''}`}>
            <Text className={`text-xs font-semibold ${mode === 'offline' ? 'text-gold' : 'text-t3'}`}>OFFLINE</Text>
          </View>
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-4">
        <Text className="text-t1 text-3xl font-bold mt-4">Welcome back, Rajan</Text>
        <Text className="text-t3 text-sm mt-1 mb-6">Thursday evening · 2 new releases</Text>
        
        {/* Mock Tiles */}
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {[1,2,3,4,5,6].map((i) => (
            <View key={i} className="w-[48%] h-16 bg-s2 border border-ln rounded-lg p-2 justify-center">
              <Text className="text-t1 text-sm font-medium">Paper Lanterns {i}</Text>
              <Text className="text-t3 text-xs">Hollow Coast</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Mini Player */}
      <View className="h-16 bg-s2 border-t border-ln2 flex-row items-center px-3 justify-between">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-s3 rounded-md mr-3" />
          <View>
            <Text className="text-t1 text-sm font-medium">Ghost in the Keys</Text>
            <Text className="text-t3 text-xs">Alinea</Text>
          </View>
        </View>
        <View className="w-10 h-10 rounded-full bg-acc items-center justify-center">
          {/* Mock Play icon */}
          <View className="w-3 h-3 bg-black transform rotate-45" />
        </View>
      </View>

      {/* Tab Bar */}
      <View className="h-16 bg-s1 border-t flex-row items-center justify-around border-ln">
        {['Home', 'Search', 'Library', 'Folders'].map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab.toLowerCase())} className="items-center">
            <View className={`w-6 h-6 mb-1 rounded ${activeTab === tab.toLowerCase() ? 'bg-acc' : 'bg-t4'}`} />
            <Text className={`text-[10px] font-semibold ${activeTab === tab.toLowerCase() ? 'text-acc' : 'text-t3'}`}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
