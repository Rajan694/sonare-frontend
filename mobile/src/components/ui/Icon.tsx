import React from 'react'
import {
  Home, Library, ListMusic, Search, Settings, Smartphone, Cloud, Folder,
  Play, Pause, Heart, ChevronLeft, ChevronRight, ChevronDown,
  Plus, MoreVertical, Shuffle, Repeat, GripVertical,
  SkipBack, SkipForward, SlidersHorizontal, ArrowLeft, Volume2,
  Headphones, Timer, BarChart3, Music, FileText, FolderX, UserRound
} from 'lucide-react-native'

const ICONS = {
  home: Home,
  library: Library,
  playlist: ListMusic,
  search: Search,
  settings: Settings,
  smartphone: Smartphone,
  cloud: Cloud,
  folder: Folder,
  'folder-off': FolderX,
  play: Play,
  pause: Pause,
  heart: Heart,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  plus: Plus,
  more: MoreVertical,
  shuffle: Shuffle,
  repeat: Repeat,
  drag: GripVertical,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  equalizer: SlidersHorizontal,
  back: ArrowLeft,
  volume: Volume2,
  headphones: Headphones,
  timer: Timer,
  visualizer: BarChart3,
  music: Music,
  lyrics: FileText,
  user: UserRound,
} as const

export type IconName = keyof typeof ICONS

// Deliberately no `className` prop, unlike the desktop twin in other-screens.
// NativeWind only maps className onto components registered with cssInterop, and
// lucide-react-native forwards unknown props straight to react-native-svg's Svg,
// which drops it - so a className here would silently do nothing. Tint and sizing
// go through `color` and `size` instead.
interface IconProps {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

export default function Icon({ name, size = 16, color, strokeWidth = 1.6 }: IconProps) {
  const Component = ICONS[name]
  if (!Component) return null
  return <Component size={size} color={color} strokeWidth={strokeWidth} />
}
