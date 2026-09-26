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
import Icon from '../components/ui/Icon';

export function EqualizerScreen() {
  const navigation = useNavigation<any>();
  const mode = useModeStore((state) => state.mode);
  const [eqEnabled, setEqEnabled] = React.useState(true);
  const [preset, setPreset] = React.useState('Sonare');
  const [crossfade, setCrossfade] = React.useState(true);
  const [gapless, setGapless] = React.useState(true);
  const [normalization, setNormalization] = React.useState(false);
  const [speed, setSpeed] = React.useState('1.0×');

  const presets = ['Flat', 'Sonare', 'Bass', 'Vocal', 'Acoustic', 'Late night'];
  const speeds = ['0.75×', '1.0×', '1.25×', '1.5×'];

  // 7-band EQ labels
  const bands = ['60', '150', '400', '1k', '2.4k', '6k', '14k'];
  const mockValues = [0.68, 0.52, 0.44, 0.58, 0.72, 0.61, 0.50]; // 0 to 1
  const dbs = ['+4', '0', '-1', '+2', '+5', '+3', '0'];

  const isGold = mode === 'offline';

  return (
    <Screen scrollable={false} className="bg-bg">
      <Header
        title={<Text className="text-tl font-semibold text-t1">Audio</Text>}
        left={<IconButton icon={<Icon name="back" size={20} color="#FFFFFF" />} onPress={() => navigation.goBack()} accessibilityLabel="Go back" />}
        right={
          <Switch
            value={eqEnabled}
            onValueChange={setEqEnabled}
            accessibilityLabel="Equalizer enabled"
            variant={isGold ? 'gold' : 'default'}
          />
        }
      />

      <ScrollView className={cn("flex-1 px-5 pt-2", !eqEnabled && "opacity-50")} contentContainerStyle={{ paddingBottom: 120, gap: 16 }}>
        
        {/* Presets Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible -mx-5 px-5" contentContainerStyle={{ gap: 8 }}>
          {presets.map((p) => (
            <Chip
              key={p}
              label={p}
              active={preset === p}
              variant={isGold ? 'gold' : 'default'}
              onPress={() => setPreset(p)}
            />
          ))}
        </ScrollView>

        {/* 7-band Graphic EQ Card */}
        <View className="bg-s1 border border-ln rounded-xl p-4.5 pt-4 pb-3.5 gap-3.5">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-ll font-semibold text-t2">7-band equalizer</Text>
            <Text className="text-mono-s font-mono text-t3">+12 / −12 dB</Text>
          </View>
          <View className="flex-row justify-between h-44 items-end px-1">
            {bands.map((band, idx) => (
              <View key={band} className="items-center w-9 gap-2">
                <Text className="text-mono-s font-mono text-t3">{dbs[idx]}</Text>
                <View className="w-1 bg-ln2 rounded-full h-28 relative justify-end overflow-hidden">
                  <View 
                    className={cn("w-full rounded-full absolute bottom-0", isGold ? 'bg-gold' : 'bg-acc')}
                    style={{ height: `${mockValues[idx] * 100}%` }}
                  />
                </View>
                <Text className="text-ls font-medium text-t3">{band}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* DSP Effects Card */}
        <View className="bg-s1 border border-ln rounded-xl py-1.5 overflow-hidden">
          <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
            <View className={cn("w-9 h-9 items-center justify-center rounded-sm", isGold ? "bg-goldbg" : "bg-accbg")}>
              <Icon name="volume" size={18} color={isGold ? "#FFC24D" : "#00E28A"} />
            </View>
            <View className="flex-1 gap-1.5">
              <Text className="text-tm font-medium text-t1">Bass boost</Text>
              <View className="h-1 bg-ln2 rounded-full overflow-hidden w-full">
                <View className={cn("h-full", isGold ? "bg-gold" : "bg-acc")} style={{ width: '42%' }} />
              </View>
            </View>
            <Text className="text-mono-s font-mono text-t2">42%</Text>
          </View>

          <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
            <View className={cn("w-9 h-9 items-center justify-center rounded-sm", isGold ? "bg-goldbg" : "bg-accbg")}>
              <Icon name="visualizer" size={18} color={isGold ? "#FFC24D" : "#00E28A"} />
            </View>
            <View className="flex-1 gap-1.5">
              <Text className="text-tm font-medium text-t1">Virtualizer</Text>
              <View className="h-1 bg-ln2 rounded-full overflow-hidden w-full">
                <View className={cn("h-full", isGold ? "bg-gold" : "bg-acc")} style={{ width: '26%' }} />
              </View>
            </View>
            <Text className="text-mono-s font-mono text-t2">26%</Text>
          </View>

          <View className="flex-row items-center gap-3.5 px-4 py-3.5">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="timer" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5 min-w-0">
              <Text className="text-tm font-medium text-t1 truncate">Playback speed</Text>
              <Text className="text-bs text-t3">Pitch preserved</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              {speeds.map((s) => (
                <Chip
                  key={s}
                  size="sm"
                  label={s}
                  active={speed === s}
                  variant={isGold ? 'gold' : 'default'}
                  onPress={() => setSpeed(s)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Playback Settings Card */}
        <View className="bg-s1 border border-ln rounded-xl py-1.5 overflow-hidden">
          <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="refresh" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-tm font-medium text-t1">Crossfade</Text>
              <Text className="text-bs text-t3">6 seconds between tracks</Text>
            </View>
            <Switch value={crossfade} onValueChange={setCrossfade} accessibilityLabel="Crossfade" variant={isGold ? 'gold' : 'default'} />
          </View>

          <View className="flex-row items-center gap-3.5 px-4 py-3.5 border-b border-ln">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="music" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-tm font-medium text-t1">Gapless playback</Text>
              <Text className="text-bs text-t3">Seamless album transitions</Text>
            </View>
            <Switch value={gapless} onValueChange={setGapless} accessibilityLabel="Gapless playback" variant={isGold ? 'gold' : 'default'} />
          </View>

          <View className="flex-row items-center gap-3.5 px-4 py-3.5">
            <View className="w-9 h-9 items-center justify-center rounded-sm bg-s3">
              <Icon name="volume" size={18} color="#7E7E8C" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-tm font-medium text-t1">Volume normalization</Text>
              <Text className="text-bs text-t3">Even loudness across the library</Text>
            </View>
            <Switch value={normalization} onValueChange={setNormalization} accessibilityLabel="Volume normalization" variant={isGold ? 'gold' : 'default'} />
          </View>
        </View>

        {/* Output Device Card */}
        <View className="bg-s1 border border-ln rounded-xl p-3.5 flex-row items-center gap-3">
          <View className={cn("w-9 h-9 items-center justify-center rounded-sm", isGold ? "bg-goldbg" : "bg-accbg")}>
            <Icon name="headphones" size={18} color={isGold ? "#FFC24D" : "#00E28A"} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-tm font-medium text-t1">Wired headphones</Text>
            <Text className="text-bs text-t3">Output device · EQ applies here</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
