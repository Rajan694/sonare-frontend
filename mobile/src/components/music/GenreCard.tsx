import React from 'react';
import { Image, Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';
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

/** A photo per genre id (shared/assets/genres, sources in its CREDITS.md). */
const GENRE_PHOTOS: Record<string, ImageSourcePropType> = {
  popular: require('../../../../shared/assets/genres/popular.webp'),
  'top-this-year': require('../../../../shared/assets/genres/top-this-year.webp'),
  bollywood: require('../../../../shared/assets/genres/bollywood.webp'),
  punjabi: require('../../../../shared/assets/genres/punjabi.webp'),
  bhojpuri: require('../../../../shared/assets/genres/bhojpuri.webp'),
  devotional: require('../../../../shared/assets/genres/devotional.webp'),
  party: require('../../../../shared/assets/genres/party.webp'),
  romantic: require('../../../../shared/assets/genres/romantic.webp'),
  sad: require('../../../../shared/assets/genres/sad.webp'),
  lofi: require('../../../../shared/assets/genres/lofi.webp'),
  workout: require('../../../../shared/assets/genres/workout.webp'),
  ghazal: require('../../../../shared/assets/genres/ghazal.webp'),
  indie: require('../../../../shared/assets/genres/indie.webp'),
  'hip-hop': require('../../../../shared/assets/genres/hip-hop.webp'),
  'english-pop': require('../../../../shared/assets/genres/english-pop.webp'),
  classical: require('../../../../shared/assets/genres/classical.webp'),
};

/**
 * A browse category: the genre's photo under a shade that keeps the label readable. Genres
 * without one (the server can add more) get the generated artwork gradient across the card.
 */
export const GenreCard = ({ genre, index, onPress }: { genre: Genre; index: number; onPress: () => void }) => {
  const stops = artGradients[KEYS[index % KEYS.length]];
  const id = `genre-${genre.id}`;
  const photo = GENRE_PHOTOS[genre.id];
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
        {!photo && (
          <>
            <Circle cx="85%" cy="20%" r="46" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
            <Circle cx="85%" cy="20%" r="78" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
          </>
        )}
      </Svg>
      {photo && (
        <>
          <Image source={photo} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
            <Defs>
              <LinearGradient id={`${id}-shade`} x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor="#000" stopOpacity={0.78} />
                <Stop offset="75%" stopColor="#000" stopOpacity={0.12} />
              </LinearGradient>
            </Defs>
            <Rect width={size.width} height={size.height} fill={`url(#${id}-shade)`} />
          </Svg>
        </>
      )}
      <Text className="text-tl font-semibold text-t1" numberOfLines={1}>
        {genre.name}
      </Text>
    </Pressable>
  );
};
