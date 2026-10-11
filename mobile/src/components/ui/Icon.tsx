import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { FolderX, BarChart3, Moon, Sun, LogOut, Speaker, Usb, Server, Settings } from 'lucide-react-native';

/**
 * The design system's own icon set (design-system/screens/*.html): 24px glyphs drawn with a
 * 1.6 round stroke, and solid shapes for the transport controls (play, pause, skip) and the
 * filled heart. The few the design never draws come from lucide in the same weight.
 */
const GLYPHS = {
  play: {
    solid: true,
    body: (
      <>
        <Path d="M7.2 4.6v14.8L20 12z" />
      </>
    ),
  },
  smartphone: {
    solid: false,
    body: (
      <>
        <Rect x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6" />
        <Path d="M10.4 18.4h3.2" />
      </>
    ),
  },
  shuffle: {
    solid: false,
    body: (
      <>
        <Path d="M16.6 3.6 20 7l-3.4 3.4" />
        <Path d="M16.6 13.6 20 17l-3.4 3.4" />
        <Path d="M3.8 7h3.4c1.7 0 2.7 1 3.7 2.4l2.7 3.9c1 1.4 2 2.4 3.7 2.4H20" />
        <Path d="M3.8 17h3.4c1.5 0 2.5-.8 3.4-2" />
        <Path d="M15.2 9c.9-1.2 1.9-2 3.4-2H20" />
      </>
    ),
  },
  download: {
    solid: false,
    body: (
      <>
        <Path d="M12 3.2v11.2" />
        <Path d="m7.9 10.6 4.1 4.1 4.1-4.1" />
        <Path d="M4.2 17.6v2.2h15.6v-2.2" />
      </>
    ),
  },
  plus: {
    solid: false,
    body: (
      <>
        <Path d="M12 4.2v15.6M4.2 12h15.6" />
      </>
    ),
  },
  close: {
    solid: false,
    body: (
      <>
        <Path d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4" />
      </>
    ),
  },
  x: {
    solid: false,
    body: (
      <>
        <Path d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4" />
      </>
    ),
  },
  more: {
    solid: true,
    body: (
      <>
        <Circle cx="12" cy="5" r="1.7" />
        <Circle cx="12" cy="12" r="1.7" />
        <Circle cx="12" cy="19" r="1.7" />
      </>
    ),
  },
  'repeat-one': {
    solid: false,
    body: (
      <>
        <Path d="M16.6 2.6 20 6l-3.4 3.4" />
        <Path d="M20 6H8.2A4.2 4.2 0 0 0 4 10.2v1.4" />
        <Path d="M7.4 21.4 4 18l3.4-3.4" />
        <Path d="M4 18h11.8a4.2 4.2 0 0 0 4.2-4.2v-1.4" />
        <Path d="M12 9.6v4.8M12 9.6l-1.4 1" />
      </>
    ),
  },
  queue: {
    solid: false,
    body: (
      <>
        <Path d="M3 6.5h18M3 11.5h18M3 16.5h10" />
        <Path d="m16.4 15.6 5 2.9-5 2.9z" />
      </>
    ),
  },
  pause: {
    solid: true,
    body: (
      <>
        <Rect x="6.4" y="4.6" width="3.9" height="14.8" rx="1.2" />
        <Rect x="13.7" y="4.6" width="3.9" height="14.8" rx="1.2" />
      </>
    ),
  },
  cloud: {
    solid: false,
    body: (
      <>
        <Path d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z" />
      </>
    ),
  },
  sort: {
    solid: false,
    body: (
      <>
        <Path d="M7 3.6v16.8M7 20.4l-3.2-3.2M7 20.4l3.2-3.2" />
        <Path d="M17 20.4V3.6M17 3.6l-3.2 3.2M17 3.6l3.2 3.2" />
      </>
    ),
  },
  refresh: {
    solid: false,
    body: (
      <>
        <Path d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8" />
        <Path d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8" />
        <Path d="M18.2 3.2v3.4h-3.4" />
        <Path d="M5.8 20.8v-3.4h3.4" />
      </>
    ),
  },
  search: {
    solid: false,
    body: (
      <>
        <Circle cx="11" cy="11" r="6.8" />
        <Path d="m16 16 5 5" />
      </>
    ),
  },
  'playlist-add': {
    solid: false,
    body: (
      <>
        <Path d="M3 6.5h13M3 11.5h13M3 16.5h8" />
        <Path d="M18.5 12.5v8M14.5 16.5h8" />
      </>
    ),
  },
  heart: {
    solid: false,
    body: (
      <>
        <Path d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z" />
      </>
    ),
  },
  trash: {
    solid: false,
    body: (
      <>
        <Path d="M4 7h16" />
        <Path d="M9.6 7V4.6h4.8V7" />
        <Path d="m6.2 7 1 13.4h9.6L17.8 7" />
        <Path d="M10.2 10.8v6M13.8 10.8v6" />
      </>
    ),
  },
  'wifi-off': {
    solid: false,
    body: (
      <>
        <Path d="m2.4 3.6 19.2 16.8" />
        <Path d="M5.4 12.4a10.6 10.6 0 0 1 3.4-2.2" />
        <Path d="M2 8.6a15.6 15.6 0 0 1 4.6-2.9" />
        <Path d="M12 20.2l2.2-2.6a3.4 3.4 0 0 0-4.4 0z" />
        <Path d="M18.8 12.4a10.6 10.6 0 0 0-3.6-2.3" />
        <Path d="M22 8.6a15.6 15.6 0 0 0-5.6-3.2" />
      </>
    ),
  },
  drag: {
    solid: true,
    body: (
      <>
        <Circle cx="9.2" cy="6" r="1.4" />
        <Circle cx="14.8" cy="6" r="1.4" />
        <Circle cx="9.2" cy="12" r="1.4" />
        <Circle cx="14.8" cy="12" r="1.4" />
        <Circle cx="9.2" cy="18" r="1.4" />
        <Circle cx="14.8" cy="18" r="1.4" />
      </>
    ),
  },
  folder: {
    solid: false,
    body: (
      <>
        <Path d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </>
    ),
  },
  'sd-card': {
    solid: false,
    body: (
      <>
        <Path d="M6.4 3.6h7L18 8.2v12.2H6.4z" />
        <Path d="M9.6 6.4v3M12.2 6.4v3M14.8 7.6v1.8" />
      </>
    ),
  },
  'skip-forward': {
    solid: true,
    body: (
      <>
        <Path d="M5 5.2v13.6L15 12z" />
        <Rect x="16.6" y="5.2" width="2.9" height="13.6" rx="1.2" />
      </>
    ),
  },
  'heart-filled': {
    solid: true,
    body: (
      <>
        <Path d="M12 20.4S4 15.5 4 10.3A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8 2.7c0 5.2-8 10.1-8 10.1z" />
      </>
    ),
  },
  home: {
    solid: false,
    body: (
      <>
        <Path d="M3 10.6 12 3.2l9 7.4" />
        <Path d="M5.6 9.4V20.4h12.8V9.4" />
        <Path d="M9.8 20.4v-5.6h4.4v5.6" />
      </>
    ),
  },
  library: {
    solid: false,
    body: (
      <>
        <Rect x="3" y="4" width="3.6" height="16" rx="1.2" />
        <Rect x="8.6" y="4" width="3.6" height="16" rx="1.2" />
        <Path d="M15.6 5.4 19 6.6a1.2 1.2 0 0 1 .8 1.5l-3.4 11.5" />
      </>
    ),
  },
  playlist: {
    solid: false,
    body: (
      <>
        <Path d="M3 6.5h12M3 11.5h12M3 16.5h7" />
        <Circle cx="17.4" cy="17.2" r="2.6" />
        <Path d="M20 17.2V7.4l1.6.7" />
      </>
    ),
  },
  lyrics: {
    solid: false,
    body: (
      <>
        <Path d="M4 5h16v11.4H9.4L4 20.4z" />
        <Path d="M8 9.4h8M8 12.6h5" />
      </>
    ),
  },
  equalizer: {
    solid: false,
    body: (
      <>
        <Path d="M6 3v6.2M6 13.4V21M12 3v9.6M12 16.8V21M18 3v2.4M18 9.6V21" />
        <Circle cx="6" cy="11.3" r="2.1" />
        <Circle cx="12" cy="14.7" r="2.1" />
        <Circle cx="18" cy="7.5" r="2.1" />
      </>
    ),
  },
  volume: {
    solid: false,
    body: (
      <>
        <Path d="M4 9.4h3.6L12 5.4v13.2L7.6 14.6H4z" />
        <Path d="M15.6 9.6a4.2 4.2 0 0 1 0 4.8" />
        <Path d="M18.4 7a8 8 0 0 1 0 10" />
      </>
    ),
  },
  music: {
    solid: false,
    body: (
      <>
        <Path d="M9 18.2V5.6l11-2v12.2" />
        <Ellipse cx="6.2" cy="18.2" rx="3" ry="2.6" />
        <Ellipse cx="17.2" cy="15.8" rx="2.8" ry="2.5" />
      </>
    ),
  },
  mic: {
    solid: false,
    body: (
      <>
        <Rect x="9" y="2.6" width="6" height="11" rx="3" />
        <Path d="M5.6 11.6a6.4 6.4 0 0 0 12.8 0" />
        <Path d="M12 18v3.4" />
      </>
    ),
  },
  'chevron-left': {
    solid: false,
    body: (
      <>
        <Path d="m14.8 5-7 7 7 7" />
      </>
    ),
  },
  'chevron-right': {
    solid: false,
    body: (
      <>
        <Path d="m9.2 5 7 7-7 7" />
      </>
    ),
  },
  minus: {
    solid: false,
    body: (
      <>
        <Path d="M5.4 12h13.2" />
      </>
    ),
  },
  clock: {
    solid: false,
    body: (
      <>
        <Circle cx="12" cy="12" r="8.4" />
        <Path d="M12 7v5.3l3.4 2" />
      </>
    ),
  },
  timer: {
    solid: false,
    body: (
      <>
        <Circle cx="12" cy="12" r="8.4" />
        <Path d="M12 7v5.3l3.4 2" />
      </>
    ),
  },
  'more-horizontal': {
    solid: true,
    body: (
      <>
        <Circle cx="5" cy="12" r="1.7" />
        <Circle cx="12" cy="12" r="1.7" />
        <Circle cx="19" cy="12" r="1.7" />
      </>
    ),
  },
  'skip-back': {
    solid: true,
    body: (
      <>
        <Path d="M19 5.2v13.6L9 12z" />
        <Rect x="4.5" y="5.2" width="2.9" height="13.6" rx="1.2" />
      </>
    ),
  },
  output: {
    solid: false,
    body: (
      <>
        <Rect x="3" y="5.4" width="10.6" height="13.2" rx="2.2" />
        <Path d="M8.3 9.6v4.8" />
        <Path d="M17 9.2a4.4 4.4 0 0 1 0 5.6" />
        <Path d="M19.9 6.6a8.4 8.4 0 0 1 0 10.8" />
      </>
    ),
  },
  scan: {
    solid: false,
    body: (
      <>
        <Path d="M4 8.4V5.6A1.6 1.6 0 0 1 5.6 4h2.8M15.6 4h2.8A1.6 1.6 0 0 1 20 5.6v2.8M20 15.6v2.8a1.6 1.6 0 0 1-1.6 1.6h-2.8M8.4 20H5.6A1.6 1.6 0 0 1 4 18.4v-2.8" />
        <Path d="M4 12h16" />
      </>
    ),
  },
  list: {
    solid: false,
    body: (
      <>
        <Path d="M4 6.4h16M4 12h16M4 17.6h16" />
      </>
    ),
  },
  grid: {
    solid: false,
    body: (
      <>
        <Rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.6" />
        <Rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.6" />
        <Rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.6" />
        <Rect x="13.4" y="13.4" width="7.2" height="7.2" rx="1.6" />
      </>
    ),
  },
  edit: {
    solid: false,
    body: (
      <>
        <Path d="M15.6 4.4 19.6 8.4 8.6 19.4l-4.6 1 1-4.6z" />
        <Path d="m13.4 6.6 4 4" />
      </>
    ),
  },
  expand: {
    solid: false,
    body: <Path d="M9.2 4H4v5.2M14.8 4H20v5.2M14.8 20H20v-5.2M9.2 20H4v-5.2" />,
  },
  check: {
    solid: false,
    body: (
      <>
        <Path d="m4.8 12.4 4.8 4.8L19.4 6.6" />
      </>
    ),
  },
  'chevron-down': {
    solid: false,
    body: (
      <>
        <Path d="m5 9.2 7 7 7-7" />
      </>
    ),
  },
  headphones: {
    solid: false,
    body: (
      <>
        <Path d="M4 15.4v-3.2a8 8 0 0 1 16 0v3.2" />
        <Rect x="2.4" y="13.8" width="4.6" height="6.8" rx="2.3" />
        <Rect x="17" y="13.8" width="4.6" height="6.8" rx="2.3" />
      </>
    ),
  },
  speed: {
    solid: false,
    body: (
      <>
        <Path d="M3.6 17.4a9 9 0 1 1 16.8 0" />
        <Path d="m12 13.4 4.2-4.6" />
        <Circle cx="12" cy="14.6" r="1.6" />
      </>
    ),
  },
  repeat: {
    solid: false,
    body: (
      <>
        <Path d="M16.6 2.6 20 6l-3.4 3.4" />
        <Path d="M20 6H8.2A4.2 4.2 0 0 0 4 10.2v1.4" />
        <Path d="M7.4 21.4 4 18l3.4-3.4" />
        <Path d="M4 18h11.8a4.2 4.2 0 0 0 4.2-4.2v-1.4" />
      </>
    ),
  },
  bluetooth: {
    solid: false,
    body: (
      <>
        <Path d="m8.4 7.4 7.2 9.2-3.6 3V4.4l3.6 3-7.2 9.2" />
      </>
    ),
  },
  info: {
    solid: false,
    body: (
      <>
        <Circle cx="12" cy="12" r="8.4" />
        <Path d="M12 11v5.6" />
        <Circle cx="12" cy="7.8" r="1" />
      </>
    ),
  },
  user: {
    solid: false,
    body: (
      <>
        <Circle cx="12" cy="8.4" r="3.8" />
        <Path d="M4.6 20.2a7.4 7.4 0 0 1 14.8 0" />
      </>
    ),
  },
  'eye-off': {
    solid: false,
    body: (
      <>
        <Path d="M3 3l18 18" />
        <Path d="M10.6 6.3A9 9 0 0 1 12 6.2c5 0 9 5.8 9 5.8a16 16 0 0 1-3 3.4" />
        <Path d="M6.6 8.2A15.6 15.6 0 0 0 3 12s4 5.8 9 5.8a8.6 8.6 0 0 0 3.4-.7" />
        <Path d="M10.2 10.4a2.4 2.4 0 0 0 3.4 3.4" />
      </>
    ),
  },
  'arrow-down': {
    solid: false,
    body: (
      <>
        <Path d="M12 4v15.6M6 13.6l6 6 6-6" />
      </>
    ),
  },
  'chevron-up': {
    solid: false,
    body: (
      <>
        <Path d="m5 14.8 7-7 7 7" />
      </>
    ),
  },
  filter: {
    solid: false,
    body: (
      <>
        <Path d="M3.2 5h17.6l-7 8.2v6.2l-3.6 1.8v-8z" />
      </>
    ),
  },
  star: {
    solid: true,
    body: (
      <>
        <Path d="m12 3.4 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.7l6-.8z" />
      </>
    ),
  },
  back: {
    solid: false,
    body: (
      <>
        <Path d="M20 12H4.4" />
        <Path d="m10.4 5.8-6 6.2 6 6.2" />
      </>
    ),
  },
  stop: {
    solid: false,
    body: (
      <>
        <Rect x="5.6" y="5.6" width="12.8" height="12.8" rx="1.6" />
      </>
    ),
  },
  tune: {
    solid: false,
    body: (
      <>
        <Path d="M4 7.4h8.4M17.4 7.4H20M4 16.6h3.4M12.4 16.6H20" />
        <Circle cx="14.9" cy="7.4" r="2.5" />
        <Circle cx="9.9" cy="16.6" r="2.5" />
      </>
    ),
  },
  disc: {
    solid: false,
    body: (
      <>
        <Circle cx="12" cy="12" r="8.4" />
        <Circle cx="12" cy="12" r="2.2" />
      </>
    ),
  },
  sparkles: {
    solid: false,
    body: (
      <>
        <Path d="m11.2 3 1.9 5.3 5.3 1.9-5.3 1.9-1.9 5.3-1.9-5.3L4 10.2l5.3-1.9z" />
        <Path d="m18.4 15.2.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" />
      </>
    ),
  },
  trending: {
    solid: false,
    body: (
      <>
        <Path d="m3.2 17.4 6-6 4 4 7.6-7.8" />
        <Path d="M15.2 7.6h5.6v5.6" />
      </>
    ),
  },
  history: {
    solid: false,
    body: (
      <>
        <Path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" />
        <Path d="M3.6 5.2v4.2h4.2" />
        <Path d="M12 7.8v4.4l3 1.8" />
      </>
    ),
  },
  warning: {
    solid: false,
    body: (
      <>
        <Path d="M12 3.6 2.6 20.4h18.8z" />
        <Path d="M12 9.8v4.6" />
        <Circle cx="12" cy="17.4" r="1" />
      </>
    ),
  },
  share: {
    solid: false,
    body: (
      <>
        <Circle cx="17.4" cy="5.8" r="2.8" />
        <Circle cx="6.6" cy="12" r="2.8" />
        <Circle cx="17.4" cy="18.2" r="2.8" />
        <Path d="m9.1 10.7 5.8-3.4M9.1 13.3l5.8 3.4" />
      </>
    ),
  },
} satisfies Record<string, { solid: boolean; body: React.ReactNode }>;

const LUCIDE = {
  // A plain gear: the design's sun-like settings glyph reads as a theme toggle.
  settings: Settings,
  'folder-off': FolderX,
  visualizer: BarChart3,
  moon: Moon,
  sun: Sun,
  logout: LogOut,
  speaker: Speaker,
  usb: Usb,
  server: Server,
} as const;

export type IconName = keyof typeof GLYPHS | keyof typeof LUCIDE;

// Deliberately no `className` prop, unlike the desktop twin in desktop/.
// NativeWind only maps className onto components registered with cssInterop, and
// react-native-svg's Svg drops it - so a className here would silently do nothing.
// Tint and sizing go through `color` and `size` instead.
interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

const Icon = ({ name, size = 16, color = '#9A9AA8', strokeWidth = 1.6, style }: IconProps) => {
  if (name in GLYPHS) {
    const glyph = GLYPHS[name as keyof typeof GLYPHS];
    return (
      <Svg
        testID={`icon-${name}`}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={glyph.solid ? color : 'none'}
        stroke={glyph.solid ? 'none' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
      >
        {glyph.body}
      </Svg>
    );
  }
  const Component = LUCIDE[name as keyof typeof LUCIDE];
  if (!Component) return null;
  return <Component testID={`icon-${name}`} size={size} color={color} strokeWidth={strokeWidth} style={style} />;
};
export default Icon;
