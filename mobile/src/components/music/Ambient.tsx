import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * The design's ambient light behind the player: the cover, shrunk and blurred into soft colour,
 * fading into the black ground before the controls.
 */
export const Ambient = ({ uri }: { uri?: string }) => {
  const { width } = useWindowDimensions();
  if (!uri?.startsWith('http') && !uri?.startsWith('file://')) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: 560 }]}>
      <Image
        source={{ uri }}
        blurRadius={18}
        resizeMode="cover"
        style={{ position: 'absolute', top: -80, left: -60, width: width + 120, height: 640, opacity: 0.55 }}
      />
      <Svg style={StyleSheet.absoluteFill} width={width} height={560}>
        <Defs>
          <LinearGradient id="ambient-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.25} />
            <Stop offset="0.55" stopColor="#000000" stopOpacity={0.5} />
            <Stop offset="0.92" stopColor="#000000" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={560} fill="url(#ambient-fade)" />
      </Svg>
    </View>
  );
};
