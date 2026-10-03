import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CAPS } from '../../lib/caps';
import { cn } from '../../lib/utils';
import { useModeStore } from '../../store/modeContext';
import { useAuth } from '../../data/hooks';
import { BrandMark } from '../ui/BrandMark';
import { Segmented } from '../ui/Segmented';
import { IconButton } from '../ui/Button';
import SearchField from './SearchField';
import type { Mode } from '../../data/types';

/**
 * Phone headers (FLOWS M01-M16). The phone shell has no top bar of its own, so this is
 * where search, settings and the profile live, and how sub-screens get back.
 */

/** "← Title" screens (M13, M15, M16); their own big title is hidden on phones. */
const TITLED: Record<string, string> = {
  '/settings': 'Settings',
  '/folders': 'Music folders',
  '/downloads': 'Downloads',
  '/equalizer': 'Audio',
};

/** Detail screens (M06-M08): a small centred label over the hero. */
const DETAIL: [RegExp, string][] = [
  [/^\/album\//, 'Album'],
  [/^\/artist\//, 'Artist'],
  [/^\/playlist\//, 'Playlist'],
];

function BackButton() {
  const navigate = useNavigate();
  // A direct visit has no in-app history to go back to.
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/home'));
  return <IconButton icon="arrow-left" label="Back" size={40} onClick={back} className="-ml-2 text-t1" />;
}

function ModeChip() {
  const { mode } = useModeStore();
  const offline = mode === 'offline';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-label-s font-semibold tracking-[0.4px] flex-none',
        offline ? 'bg-goldbg text-gold' : 'bg-accbg text-acc',
      )}
    >
      <span className={cn('dot', offline ? 'dot-gold' : 'dot-acc')} />
      {offline ? 'OFFLINE' : 'ONLINE'}
    </span>
  );
}

function HomeHeader() {
  const navigate = useNavigate();
  const { mode, setMode } = useModeStore();
  const { user } = useAuth();
  const offline = mode === 'offline';

  return (
    <header className="flex items-center justify-between gap-3 h-16 px-5 flex-none">
      {CAPS.offlineMode ? (
        <Segmented
          options={[
            { id: 'online', label: 'Online', icon: 'cloud' },
            { id: 'offline', label: 'Offline', icon: 'smartphone' },
          ]}
          value={mode}
          onChange={(m) => (m === 'offline' ? navigate('/mode-switch') : setMode(m as Mode))}
          color={offline ? 'gold' : 'acc'}
        />
      ) : (
        <Link to="/home" className="flex items-center gap-2.5 no-underline text-inherit">
          <BrandMark size={28} className="flex-none" />
          <span className="text-title-l text-t1 tracking-tight">Sonare</span>
        </Link>
      )}
      <div className="flex items-center gap-1 flex-none">
        <IconButton
          icon="search"
          label={offline ? 'Search this device' : 'Search'}
          size={40}
          onClick={() => navigate('/search')}
        />
        {offline && CAPS.localLibrary ? (
          <IconButton icon="folder" label="Music folders" size={40} onClick={() => navigate('/folders')} />
        ) : (
          <IconButton icon="settings" label="Settings" size={40} onClick={() => navigate('/settings')} />
        )}
        {user ? (
          <button
            className="ib w-10 h-10 p-0 ml-0.5"
            aria-label="Your profile"
            data-tip={user.displayName}
            onClick={() => navigate('/settings')}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-acc text-black text-label-l font-semibold">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          </button>
        ) : (
          <button
            className="btn btn-acc btn-sm ml-1"
            onClick={() => navigate('/signin', { state: { mode: 'signin' } })}
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}

export default function PhoneTopbar() {
  const { pathname } = useLocation();
  const { mode } = useModeStore();

  if (pathname === '/home') return <HomeHeader />;

  if (pathname === '/search') {
    return (
      <header className="flex flex-col gap-3 px-5 pb-2 flex-none">
        <div className="flex items-center justify-between gap-3 h-14">
          <div className="flex items-center gap-1 min-w-0">
            <BackButton />
            <span className="text-title-l text-t1 font-semibold truncate">
              {mode === 'offline' ? 'Search device' : 'Search'}
            </span>
          </div>
          <ModeChip />
        </div>
        <SearchField enableSlashShortcut={false} enableCtrlKShortcut={false} className="h-12 rounded-full" />
      </header>
    );
  }

  const title = TITLED[pathname];
  if (title) {
    return (
      <header className="flex items-center gap-1 h-14 px-5 flex-none">
        <BackButton />
        <span className="text-title-l text-t1 font-semibold truncate">{title}</span>
      </header>
    );
  }

  const detail = DETAIL.find(([re]) => re.test(pathname));
  if (detail) {
    return (
      <header className="relative flex items-center h-14 px-5 flex-none">
        <BackButton />
        <span className="absolute inset-x-0 text-center text-label-l text-t2 pointer-events-none">{detail[1]}</span>
      </header>
    );
  }

  return null;
}
