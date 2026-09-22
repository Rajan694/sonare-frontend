import React from 'react';
import { View } from 'react-native';
import Icon from '../ui/Icon';

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
        <Icon name="smartphone" size={iconSize} color={color} />
      ) : (
        <Icon name="cloud" size={iconSize} color={color} />
      )}
    </View>
  );
}
