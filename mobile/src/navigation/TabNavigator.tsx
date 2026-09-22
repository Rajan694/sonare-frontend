import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { HomeScreen } from '../screens/Home';
import { LibraryScreen } from '../screens/Library';
import { PlaylistsScreen } from '../screens/Playlists';
import { SearchScreen } from '../screens/Search';
import { MiniPlayer } from '../components/music/MiniPlayer';
import { Toast } from '../components/ui/Toast';
import { useModeStore } from '../store/mode';
import Icon from '../components/ui/Icon';

const Tab = createBottomTabNavigator<Record<string, undefined>, undefined>();

export function TabNavigator() {
  const mode = useModeStore((state) => state.mode);
  const toastVisible = useModeStore((state) => state.toastVisible);
  const hideToast = useModeStore((state) => state.hideToast);

  React.useEffect(() => {
    if (toastVisible) {
      const t = setTimeout(hideToast, 3000);
      return () => clearTimeout(t);
    }
  }, [toastVisible, hideToast]);
  
  return (
    <View className="flex-1">
      <Tab.Navigator
        id={undefined}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height: 64,
            backgroundColor: '#000000',
            borderTopColor: '#1A1A1F',
            borderTopWidth: 1,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
          },
          tabBarItemStyle: {
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            letterSpacing: 0.4,
            marginTop: 4,
          },
          tabBarActiveTintColor: mode === 'offline' ? '#FFC24D' : '#00E28A',
          tabBarInactiveTintColor: '#7E7E8C',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: ({ color }) => <Icon name="home" size={21} color={color} /> }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{ tabBarIcon: ({ color }) => <Icon name="library" size={21} color={color} /> }}
        />
        <Tab.Screen
          name="Playlists"
          component={PlaylistsScreen}
          options={{ tabBarIcon: ({ color }) => <Icon name="playlist" size={21} color={color} /> }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{ tabBarIcon: ({ color }) => <Icon name="search" size={21} color={color} /> }}
        />
      </Tab.Navigator>
      <MiniPlayer />
      <Toast 
        visible={toastVisible} 
        message={mode === 'online' ? 'Online Mode enabled' : 'Offline Mode enabled'} 
        mode={mode} 
      />
    </View>
  );
}
