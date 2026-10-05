import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { artGradients } from '../../data/gradients';

export interface Genre {
  id: string;
  name: string;
  /** What opening the card searches for (GET /genres); the name when missing. */
  query?: string;
}

/** Shown until GET /genres answers (or when it can't); the same list as the server. */
export const DEFAULT_GENRES: Genre[] = [
  { id: 'popular', name: 'Popular', query: 'popular hindi songs' },
  { id: 'top-this-year', name: 'Top this year', query: `top songs ${new Date().getFullYear()}` },
  { id: 'bollywood', name: 'Bollywood', query: 'bollywood hits' },
  { id: 'punjabi', name: 'Punjabi', query: 'punjabi songs' },
  { id: 'bhojpuri', name: 'Bhojpuri', query: 'bhojpuri songs' },
  { id: 'devotional', name: 'Devotional', query: 'devotional bhajan songs' },
  { id: 'party', name: 'Party', query: 'party songs' },
  { id: 'romantic', name: 'Romantic', query: 'romantic songs' },
  { id: 'sad', name: 'Sad', query: 'sad songs' },
  { id: 'lofi', name: 'Lo-fi', query: 'lofi songs' },
  { id: 'workout', name: 'Workout', query: 'workout songs' },
  { id: 'ghazal', name: 'Ghazal', query: 'ghazal' },
];

export const genreQuery = (g: Genre) => g.query || g.name;

const KEYS = Object.keys(artGradients);

/** A browse category: the generated artwork gradient fills the whole card (genres have no art). */
export const GenreCard = ({ genre, index, onPress }: { genre: Genre; index: number; onPress: () => void }) => {
  const stops = artGradients[KEYS[index % KEYS.length]];
  const id = `genre-${genre.id}`;
  // A percentage-sized Svg only paints its first measured width, so it gets the card's real size.
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      className="flex-1 h-[92px] rounded-md overflow-hidden justify-end p-3.5 bg-s2 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`Browse ${genre.name}`}
    >
      <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="82%" y2="100%">
            <Stop offset="0%" stopColor={stops[0]} />
            <Stop offset="45%" stopColor={stops[1]} />
            <Stop offset="100%" stopColor={stops[2]} />
          </LinearGradient>
        </Defs>
        <Rect width={size.width} height={size.height} fill={`url(#${id})`} />
        <Circle cx="85%" cy="20%" r="46" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
        <Circle cx="85%" cy="20%" r="78" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
      </Svg>
      <Text className="text-tl font-semibold text-t1" numberOfLines={1}>
        {genre.name}
      </Text>
    </Pressable>
  );
};
