import React from 'react';
import { View } from 'react-native';
import SmartphoneIcon from '../../../assets/smartphone.svg';
import CloudIcon from '../../../assets/cloud.svg';

interface SourceGlyphProps {
  source: 'local' | 'server';
  size?: 18 | 20;
}

export function SourceGlyph({ source, size = 18 }: SourceGlyphProps) {
  const iconSize = size - 8;
  const color = source === 'local' ? '#FFC24D' : '#00E28A';

  return (
    <View
      className="items-center justify-center rounded-sm"
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: source === 'local' ? 'rgba(255, 194, 77, 0.15)' : 'rgba(0, 226, 138, 0.15)' 
      }}
    >
      {source === 'local' ? (
        <SmartphoneIcon width={iconSize} height={iconSize} color={color} />
      ) : (
        <CloudIcon width={iconSize} height={iconSize} color={color} />
      )}
    </View>
  );
}
