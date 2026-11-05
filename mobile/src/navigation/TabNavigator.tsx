import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/Home';
import { MiniPlayer } from '../components/music/MiniPlayer';
import { useModeStore } from '../store/mode';
import Icon from '../components/ui/Icon';

const Tab = createBottomTabNavigator<Record<string, undefined>, undefined>();
const Stack = createNativeStackNavigator<Record<string, object | undefined>, undefined>();

/**
 * Each tab is a stack, so album, artist, playlist, settings, account, folders, downloads and audio
 * open inside the tab you're in, with the mini player and tab bar still there (M06-M08,
 * M13, M15, M16). Now Playing, Lyrics, Queue, sign-in and the mode switch cover
 * everything from the root stack instead (M09-M12, M14).
 */
/*
 * Screens other than Home load the first time they open (getComponent), so a cold start only
 * has to evaluate Home and what it uses.
 */
const tabStack = (rootName: string, getRoot: () => React.ComponentType<any>) => {
  return function TabStack() {
    return (
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name={rootName} getComponent={getRoot} />
        <Stack.Screen name="Album" getComponent={() => require('../screens/Album').AlbumScreen} />
        <Stack.Screen name="Artist" getComponent={() => require('../screens/Artist').ArtistScreen} />
        <Stack.Screen name="Playlist" getComponent={() => require('../screens/PlaylistDetail').PlaylistDetailScreen} />
        <Stack.Screen name="Settings" getComponent={() => require('../screens/Settings').SettingsScreen} />
        <Stack.Screen name="Folders" getComponent={() => require('../screens/Folders').FoldersScreen} />
        <Stack.Screen name="Downloads" getComponent={() => require('../screens/Downloads').DownloadsScreen} />
        <Stack.Screen name="TrackList" getComponent={() => require('../screens/TrackList').TrackListScreen} />
        <Stack.Screen name="Equalizer" getComponent={() => require('../screens/Equalizer').EqualizerScreen} />
        <Stack.Screen name="Account" getComponent={() => require('../screens/Account').AccountScreen} />
      </Stack.Navigator>
    );
  };
};

const HomeStack = tabStack('HomeRoot', () => HomeScreen);
const LibraryStack = tabStack('LibraryRoot', () => require('../screens/Library').LibraryScreen);
const PlaylistsStack = tabStack('PlaylistsRoot', () => require('../screens/Playlists').PlaylistsScreen);
const SearchStack = tabStack('SearchRoot', () => require('../screens/Search').SearchScreen);

export const TabNavigator = () => {
  const toastVisible = useModeStore((state) => state.toastVisible);
  const hideToast = useModeStore((state) => state.hideToast);
  // Clear the Android gesture bar / iOS home indicator; a fixed height alone puts labels under it.
  const insets = useSafeAreaInsets();

  // The mode toast itself is ModeToast in RootNavigator (one toast per switch).
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
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            backgroundColor: '#060607',
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
            fontFamily: 'Geist',
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.3,
            marginTop: 4,
          },
          // Green in both modes (M01 / M02): the tab is navigation, not a source.
          tabBarActiveTintColor: '#00E28A',
          tabBarInactiveTintColor: '#7E7E8C',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarIcon: ({ color }) => <Icon name="home" size={21} color={color} />,
          }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryStack}
          options={{
            tabBarIcon: ({ color }) => <Icon name="library" size={21} color={color} />,
          }}
        />
        <Tab.Screen
          name="Playlists"
          component={PlaylistsStack}
          options={{
            tabBarIcon: ({ color }) => <Icon name="playlist" size={21} color={color} />,
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchStack}
          options={{
            tabBarIcon: ({ color }) => <Icon name="search" size={21} color={color} />,
          }}
        />
      </Tab.Navigator>
      <MiniPlayer />
    </View>
  );
};
