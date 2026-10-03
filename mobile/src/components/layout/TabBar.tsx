import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/cn';

interface TabBarProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
  }>;
  activeTab: string;
}

export function TabBar({ tabs, activeTab }: TabBarProps) {
  return (
    <View className="flex-row items-stretch h-[64px] bg-[#060607] border-t border-ln">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={tab.onPress}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            className="flex-1 flex-col items-center justify-center gap-1"
          >
            {tab.icon}
            <Text className={cn('text-[10px] font-semibold tracking-[0.3px]', isActive ? 'text-acc' : 'text-t3')}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
