import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import Icon from '../components/ui/Icon';

export function FoldersScreen() {
  const navigation = useNavigation<any>();
  const [folders, setFolders] = useState([
    { id: '1', name: 'Music/Albums', path: '/storage/emulated/0/Music/Albums', tracks: 842, size: '6.1 GB', enabled: true },
    { id: '2', name: 'Music/Downloads', path: '/storage/emulated/0/Music/Downloads', tracks: 204, size: '1.4 GB', enabled: true },
    { id: '3', name: 'SD Card/Music', path: '/storage/sdcard1/Music', tracks: 1130, size: '8.7 GB', enabled: true },
    { id: '4', name: 'Recordings', path: '/storage/emulated/0/Recordings', tracks: 18, size: '240 MB', enabled: false },
    { id: '5', name: 'WhatsApp Audio', path: '/storage/emulated/0/WhatsApp/Media', tracks: 63, size: '310 MB', enabled: false },
  ]);

  const toggleFolder = (id: string) => {
    setFolders(folders.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const enabledFolders = folders.filter(f => f.enabled);
  const disabledFolders = folders.filter(f => !f.enabled);

  return (
    <Screen scrollable={false} className="bg-s0">
      <Header
        title="Music folders"
        left={<IconButton icon={<Icon name="back" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Go back" />}
        right={<IconButton icon={<Icon name="plus" size={20} color="#FFFFFF" />} onPress={() => {}} accessibilityLabel="Add folder" />}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        
        <View className="bg-s1 rounded-md p-4 mb-4 mt-2">
          <View className="flex-row justify-between items-start mb-3">
             <View>
                <Text className="text-t1 text-tm">Device storage</Text>
                <Text className="text-t3 text-bs mt-1">16.7 GB of music · 2,184 songs</Text>
             </View>
             <Text className="text-gold text-mono-s">28%</Text>
          </View>
          <View className="h-2 bg-s2 rounded-full overflow-hidden mb-4">
             <View className="h-full bg-gold w-[28%]" />
          </View>
          
          <View className="flex-row flex-wrap gap-4">
            <View className="flex-row items-center gap-1.5">
               <View className="w-1.5 h-1.5 rounded-full bg-gold" />
               <Text className="text-t2 text-bs">Albums</Text>
               <Text className="text-t3 text-bs ml-1">6.1 GB</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
               <View className="w-1.5 h-1.5 rounded-full bg-acc" />
               <Text className="text-t2 text-bs">Downloads</Text>
               <Text className="text-t3 text-bs ml-1">1.4 GB</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
               <View className="w-1.5 h-1.5 rounded-full bg-blue-400" />
               <Text className="text-t2 text-bs">SD card</Text>
               <Text className="text-t3 text-bs ml-1">8.7 GB</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2.5 mb-2">
          <Button variant="gold" className="flex-1" size="sm" onPress={() => {}}>
             Scan now
          </Button>
          <Button variant="outline" className="flex-1" size="sm" onPress={() => {}}>
             Add folder
          </Button>
        </View>
        
        <View className="flex-row items-center mb-6 px-1">
           <View className="w-1.5 h-1.5 rounded-full bg-gold mr-2" />
           <Text className="text-t3 text-bs">Last scan 12 min ago · 6 new songs found</Text>
        </View>

        <Text className="text-t3 text-ov mb-2 ml-1">Scanned folders</Text>
        <View className="bg-s1 rounded-md mb-6">
          {enabledFolders.map((item, index) => (
            <View key={item.id} className={`flex-row items-center px-4 py-3 ${index !== enabledFolders.length - 1 ? 'border-b border-ln2' : ''}`}>
              <View className="w-9 h-9 rounded bg-gold/10 items-center justify-center mr-3">
                <Icon name="folder" size={14} color="#FFC24D" />
              </View>
              <View className="flex-1 mr-3">
                <Text className="text-t1 text-tm truncate mb-0.5">{item.name}</Text>
                <Text className="text-t3 text-mono-s truncate mb-0.5">{item.path}</Text>
                <Text className="text-t3 text-bs">{item.tracks} songs · {item.size}</Text>
              </View>
              <Switch value={item.enabled} onValueChange={() => toggleFolder(item.id)} variant="gold" accessibilityLabel={`Toggle ${item.name}`} />
            </View>
          ))}
        </View>

        <Text className="text-t3 text-ov mb-2 ml-1">Excluded</Text>
        {disabledFolders.length > 0 ? (
          <View className="bg-s1 rounded-md mb-6">
            {disabledFolders.map((item, index) => (
              <View key={item.id} className={`flex-row items-center px-4 py-3 ${index !== disabledFolders.length - 1 ? 'border-b border-ln2' : ''}`}>
                <View className="w-9 h-9 rounded bg-s3 items-center justify-center mr-3 opacity-50">
                  <Icon name="folder" size={14} color="#7E7E8C" />
                </View>
                <View className="flex-1 mr-3 opacity-50">
                  <Text className="text-t1 text-tm truncate mb-0.5">{item.name}</Text>
                  <Text className="text-t3 text-mono-s truncate mb-0.5">{item.path}</Text>
                  <Text className="text-t3 text-bs">{item.tracks} songs · {item.size}</Text>
                </View>
                <Switch value={item.enabled} onValueChange={() => toggleFolder(item.id)} accessibilityLabel={`Toggle ${item.name}`} />
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center py-8">
             <View className="mb-3">
                <Icon name="folder-off" size={32} color="#5A5A66" />
             </View>
             <Text className="text-t1 text-tl mb-1">Nothing excluded</Text>
             <Text className="text-t3 text-bm text-center max-w-[300px]">
               Turn a folder off above to keep it out of your library and search results.
             </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
