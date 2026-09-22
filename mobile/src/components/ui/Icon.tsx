import React from 'react'
import {
  Home, Library, ListMusic, Search, Settings, Smartphone, Cloud, Folder,
  Play, Pause, Heart, ChevronLeft, ChevronRight
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
  play: Play,
  pause: Pause,
  heart: Heart,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
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
