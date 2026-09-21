import React from 'react'
import { cn } from '../../lib/utils'
import {
  Home, Search, Library, ListMusic, Music, Disc, Mic2, Grid3X3, Folder, Heart,
  ChevronLeft, ChevronRight, Cloud, Smartphone, Shuffle, SkipBack, SkipForward,
  Repeat, Repeat1, Volume2, VolumeX, Minimize2, Maximize2, X, Minus,
  Settings, SlidersHorizontal, Play, Pause, MoreHorizontal, Plus, Check,
  Download, RefreshCw, Trash2, AlignJustify, ExternalLink, Moon, Wifi, WifiOff,
  LayoutGrid, List, Clock, Star, Radio, LogOut, Info, Share,
  Music2, Music4, ChevronDown, ChevronUp, Dot, Loader2
} from 'lucide-react'

const ICONS = {
  home: Home,
  search: Search,
  library: Library,
  playlist: ListMusic,
  music: Music,
  music2: Music2,
  music4: Music4,
  disc: Disc,
  mic: Mic2,
  grid: Grid3X3,
  folder: Folder,
  heart: Heart,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  cloud: Cloud,
  smartphone: Smartphone,
  shuffle: Shuffle,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  repeat: Repeat,
  'repeat-one': Repeat1,
  volume: Volume2,
  mute: VolumeX,
  minimize: Minimize2,
  maximize: Maximize2,
  close: X,
  minus: Minus,
  settings: Settings,
  sliders: SlidersHorizontal,
  play: Play,
  pause: Pause,
  more: MoreHorizontal,
  plus: Plus,
  check: Check,
  download: Download,
  sync: RefreshCw,
  trash: Trash2,
  menu: AlignJustify,
  external: ExternalLink,
  moon: Moon,
  wifi: Wifi,
  'wifi-off': WifiOff,
  'layout-grid': LayoutGrid,
  list: List,
  clock: Clock,
  star: Star,
  radio: Radio,
  logout: LogOut,
  info: Info,
  share: Share,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  dot: Dot,
  loader: Loader2,
} as const

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number
  className?: string
  'aria-hidden'?: boolean
}

export default function Icon({ name, size = 16, className, 'aria-hidden': ariaHidden = true }: IconProps) {
  const Component = ICONS[name]
  if (!Component) return null
  return (
    <Component
      size={size}
      className={cn('flex-none', className)}
      aria-hidden={ariaHidden}
      strokeWidth={1.75}
    />
  )
}
