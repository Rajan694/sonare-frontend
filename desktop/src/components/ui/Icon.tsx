import React from 'react';
import { cn } from '../../lib/cn';
import {
  Home,
  Search,
  Library,
  ListMusic,
  Music,
  Disc,
  Mic2,
  Grid3X3,
  Folder,
  Heart,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Smartphone,
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  X,
  Minus,
  Settings,
  SlidersHorizontal,
  Play,
  Pause,
  MoreHorizontal,
  Plus,
  Check,
  Download,
  RefreshCw,
  Trash2,
  AlignJustify,
  ExternalLink,
  Moon,
  Wifi,
  WifiOff,
  LayoutGrid,
  List,
  Clock,
  Star,
  Radio,
  LogOut,
  Info,
  Share,
  Music2,
  Music4,
  ChevronDown,
  ChevronUp,
  Dot,
  Loader2,
  UserRound,
  MessageSquareText,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  MonitorSpeaker,
  Speaker,
  Headphones,
  Bluetooth,
  ListPlus,
  ArrowUpDown,
  TrendingUp,
  Monitor,
} from 'lucide-react';

const ICONS = {
  home: Home,
  monitor: Monitor,
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
  'arrow-left': ArrowLeft,
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
  trending: TrendingUp,
  star: Star,
  radio: Radio,
  logout: LogOut,
  info: Info,
  share: Share,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  dot: Dot,
  loader: Loader2,
  user: UserRound,
  lyrics: MessageSquareText,
  edit: Pencil,
  'sidebar-close': PanelLeftClose,
  'sidebar-open': PanelLeftOpen,
  output: MonitorSpeaker,
  speaker: Speaker,
  headphones: Headphones,
  bluetooth: Bluetooth,
  'playlist-add': ListPlus,
  sort: ArrowUpDown,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  'aria-hidden'?: boolean;
}

// The design's transport glyphs are solid shapes, not lucide's outlines (design-system/screens).
const SOLID: Partial<Record<IconName, React.ReactNode>> = {
  play: <path d="M7.2 4.6v14.8L20 12z" />,
  pause: (
    <>
      <rect x="6.4" y="4.6" width="3.9" height="14.8" rx="1.2" />
      <rect x="13.7" y="4.6" width="3.9" height="14.8" rx="1.2" />
    </>
  ),
  'skip-forward': (
    <>
      <path d="M5 5.2v13.6L15 12z" />
      <rect x="16.6" y="5.2" width="2.9" height="13.6" rx="1.2" />
    </>
  ),
  'skip-back': (
    <>
      <path d="M19 5.2v13.6L9 12z" />
      <rect x="4.5" y="5.2" width="2.9" height="13.6" rx="1.2" />
    </>
  ),
};

const Icon = ({ name, size = 16, className, strokeWidth = 1.6, 'aria-hidden': ariaHidden = true }: IconProps) => {
  const solid = SOLID[name];
  if (solid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn('flex-none', `icon-${name}`, className)}
        aria-hidden={ariaHidden}
      >
        {solid}
      </svg>
    );
  }
  const Component = ICONS[name];
  if (!Component) return null;
  return (
    <Component size={size} className={cn('flex-none', className)} aria-hidden={ariaHidden} strokeWidth={strokeWidth} />
  );
};
export default Icon;
