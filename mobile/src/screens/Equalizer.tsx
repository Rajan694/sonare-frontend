import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Switch } from '../components/ui/Switch';
import { Chip } from '../components/ui/Chip';
import { useModeStore } from '../store/mode';
import { cn } from '../lib/cn';

export function EqualizerScreen() {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
  const [eqEnabled, setEqEnabled] = React.useState(true);
  const [crossfade, setCrossfade] = React.useState(true);
  const [gapless, setGapless] = React.useState(true);
  const [normalization, setNormalization] = React.useState(false);

  // 7-band EQ labels
  const bands = ['60', '150', '400', '1k', '2.4k', '6k', '14k'];
  const mockValues = [0.68, 0.52, 0.44, 0.58, 0.72, 0.61, 0.50]; // 0 to 1
  const dbs = ['+4', '0', '-1', '+2', '+5', '+3', '0'];

  return (
    <Screen scrollable={false} className="bg-s0">
      <Header
        title="Audio"
        left={<IconButton icon={<Text className="text-t1 text-h2">←</Text>} onPress={() => navigation.goBack()} accessibilityLabel="Go back" />}
        right={
          <Switch
            value={eqEnabled}
            onValueChange={setEqEnabled}
            accessibilityLabel="Enable equalizer"
          />
        }
      />

      <ScrollView className={cn("flex-1", !eqEnabled && "opacity-50")} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        
        <View className="flex-row gap-2 mt-4 mb-4">
          <Chip label="Flat" onPress={() => {}} />
          <Chip label="Sonare" active onPress={() => {}} />
          <Chip label="Bass" onPress={() => {}} />
          <Chip label="Vocal" onPress={() => {}} />
          <Chip label="Acoustic" onPress={() => {}} />
        </View>

        <View className="bg-s1 rounded-2xl p-4 mb-4">
          <View className="flex-row justify-between mb-6 px-1">
            <Text className="text-t1 text-ll">7-band equalizer</Text>
            <Text className="text-t3 text-mono-s">+12 / -12 dB</Text>
          </View>
          <View className="flex-row justify-between h-48 items-end">
            {bands.map((band, idx) => (
              <View key={band} className="items-center w-10">
                <Text className="text-t3 text-mono-s mb-2">{dbs[idx]}</Text>
                <View className="w-1.5 bg-s3 rounded-full h-32 mb-3 relative justify-end overflow-hidden">
                  <View 
                    className={cn("w-full rounded-full absolute bottom-0", mode === 'online' ? 'bg-acc' : 'bg-gold')}
                    style={{ height: `${mockValues[idx] * 100}%` }}
                  />
                </View>
                <Text className="text-t3 text-ls">{band}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-s1 rounded-2xl py-2 mb-4">
          <View className="flex-row items-center justify-between px-4 py-3">
             <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 items-center justify-center rounded-full bg-acc/10">
                   <Text className="text-acc text-lg">🔊</Text>
                </View>
                <View>
                  <Text className="text-t1 text-tm">Bass boost</Text>
                </View>
             </View>
             <Text className="text-t2 text-mono-s">42%</Text>
          </View>
          <View className="flex-row items-center justify-between px-4 py-3">
             <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 items-center justify-center rounded-full bg-acc/10">
                   <Text className="text-acc text-lg">🎧</Text>
                </View>
                <View>
                  <Text className="text-t1 text-tm">Virtualizer</Text>
                </View>
             </View>
             <Text className="text-t2 text-mono-s">26%</Text>
          </View>
          <View className="flex-row items-center justify-between px-4 py-3">
             <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 items-center justify-center rounded-full bg-s2">
                   <Text className="text-t3 text-lg">⏱</Text>
                </View>
                <View>
                  <Text className="text-t1 text-tm">Playback speed</Text>
                  <Text className="text-t3 text-bs">Pitch preserved</Text>
                </View>
             </View>
             <Text className="text-t2 text-mono-s">1.0×</Text>
          </View>
        </View>

        <View className="bg-s1 rounded-2xl py-2 mb-4">
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 items-center justify-center rounded-full bg-s2">
                   <Text className="text-t3 text-lg">🔀</Text>
                </View>
                <View>
                  <Text className="text-t1 text-tm">Crossfade</Text>
                  <Text className="text-t3 text-bs">6 seconds between tracks</Text>
                </View>
            </View>
            <Switch value={crossfade} onValueChange={setCrossfade} accessibilityLabel="Crossfade" />
          </View>
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 items-center justify-center rounded-full bg-s2">
                   <Text className="text-t3 text-lg">▶</Text>
                </View>
                <View>
                  <Text className="text-t1 text-tm">Gapless playback</Text>
                  <Text className="text-t3 text-bs">Seamless album transitions</Text>
                </View>
            </View>
            <Switch value={gapless} onValueChange={setGapless} accessibilityLabel="Gapless" />
          </View>
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 items-center justify-center rounded-full bg-s2">
                   <Text className="text-t3 text-lg">📊</Text>
                </View>
                <View>
                  <Text className="text-t1 text-tm">Volume normalization</Text>
                  <Text className="text-t3 text-bs">Even loudness across the library</Text>
                </View>
            </View>
            <Switch value={normalization} onValueChange={setNormalization} accessibilityLabel="Normalization" />
          </View>
        </View>

        <View className="bg-s1 rounded-2xl p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 items-center justify-center rounded-full bg-gold/10">
                <Text className="text-gold text-xl">🎧</Text>
            </View>
            <View className="flex-1">
                <Text className="text-t1 text-tm">Wired headphones</Text>
                <Text className="text-t3 text-bs">Output device · EQ applies here</Text>
            </View>
            {mode === 'offline' ? (
                <Text className="text-gold text-tm">Requires Online</Text>
            ) : (
                <IconButton icon={<Text className="text-t2">⟩</Text>} onPress={() => {}} accessibilityLabel="Change output" />
            )}
        </View>

      </ScrollView>
    </Screen>
  );
}
