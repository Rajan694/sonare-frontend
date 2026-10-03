import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/Home';
import { LibraryScreen } from '../screens/Library';
import { PlaylistsScreen } from '../screens/Playlists';
import { SearchScreen } from '../screens/Search';
import { AlbumScreen } from '../screens/Album';
import { ArtistScreen } from '../screens/Artist';
import { PlaylistDetailScreen } from '../screens/PlaylistDetail';
import { SettingsScreen } from '../screens/Settings';
import { FoldersScreen } from '../screens/Folders';
import { DownloadsScreen } from '../screens/Downloads';
import { EqualizerScreen } from '../screens/Equalizer';
import { MiniPlayer } from '../components/music/MiniPlayer';
import { Toast } from '../components/ui/Toast';
import { useModeStore } from '../store/mode';
import Icon from '../components/ui/Icon';

const Tab = createBottomTabNavigator<Record<string, undefined>, undefined>();
const Stack = createNativeStackNavigator<Record<string, object | undefined>, undefined>();

/**
 * Each tab is a stack, so album, artist, playlist, settings, folders, downloads and audio
 * open inside the tab you're in, with the mini player and tab bar still there (M06-M08,
 * M13, M15, M16). Now Playing, Lyrics, Queue, sign-in and the mode switch cover
 * everything from the root stack instead (M09-M12, M14).
 */
function tabStack(rootName: string, Root: React.ComponentType<any>) {
  return function TabStack() {
    return (
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name={rootName} component={Root} />
        <Stack.Screen name="Album" component={AlbumScreen} />
        <Stack.Screen name="Artist" component={ArtistScreen} />
        <Stack.Screen name="Playlist" component={PlaylistDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Folders" component={FoldersScreen} />
        <Stack.Screen name="Downloads" component={DownloadsScreen} />
        <Stack.Screen name="Equalizer" component={EqualizerScreen} />
      </Stack.Navigator>
    );
  };
}

const HomeStack = tabStack('HomeRoot', HomeScreen);
const LibraryStack = tabStack('LibraryRoot', LibraryScreen);
const PlaylistsStack = tabStack('PlaylistsRoot', PlaylistsScreen);
const SearchStack = tabStack('SearchRoot', SearchScreen);

export function TabNavigator() {
  const mode = useModeStore((state) => state.mode);
  const toastVisible = useModeStore((state) => state.toastVisible);
  const hideToast = useModeStore((state) => state.hideToast);
  // Clear the Android gesture bar / iOS home indicator; a fixed height alone puts labels under it.
  const insets = useSafeAreaInsets();

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
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.3,
            marginTop: 4,
          },
          tabBarActiveTintColor: mode === 'offline' ? '#FFC24D' : '#00E28A',
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
      <Toast
        visible={toastVisible}
        message={mode === 'online' ? 'Online Mode enabled' : 'Offline Mode enabled'}
        mode={mode}
      />
    </View>
  );
}
