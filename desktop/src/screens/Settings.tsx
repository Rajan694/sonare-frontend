import React, { useEffect, useSyncExternalStore } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon, { type IconName } from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { Segmented } from '../components/ui/Segmented';
import { Select } from '../components/ui/Select';
import { OutputCard } from '../components/music/OutputPicker';
import { outputSupport } from '../audio/output';
import { LYRICS_SCRIPTS, updateDevicePrefs, useDevicePrefs } from '../storage/devicePrefs';
import { CAPS } from '../lib/caps';
import { useModeStore } from '../store/modeContext';
import { useLocalLibrary } from '../storage/local';
import { showToast } from '../store/toasts';
import { useSettings, updateSettings, type AudioQuality, type DownloadFormat } from '../storage/settings';
import {
  canPickWebFolder,
  chooseLocation,
  getLocation,
  loadLocation,
  resetLocation,
  subscribeLocation,
} from '../storage/downloadTargets';
import { useDownloads } from '../storage/downloads';
import { useAuth } from '../api/hooks';
import { clearSession, resendVerification, signOut } from '../api/auth';
import {
  ALLOWS_HTTP,
  DEFAULT_API_ORIGIN,
  customServerOrigin,
  normalizeServerOrigin,
  SERVER_ADDRESS_ENABLED,
  switchServer,
} from '../api/server';
import { promptDialog } from '../store/dialogs';
import { formatBytes } from '../lib/format';
import { version as APP_VERSION } from '../../neutralino.config.json';
import { useAppDispatch, useAppSelector } from '../store';
import { checkForUpdates, downloadAppUpdate } from '../store/updateSlice';
import { openUpdate, showUpdateFolder } from '../storage/appUpdate';

const QUALITIES: { id: AudioQuality; label: string }[] = [
  { id: 'low', label: 'Low (data saver)' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
];

// What YouTube offers per format: Opus in three steps, AAC in two. There is no lossless.
const DOWNLOAD_QUALITIES: Record<DownloadFormat, { id: AudioQuality; label: string }[]> = {
  opus: [
    { id: 'low', label: 'Low · about 60 kbps' },
    { id: 'normal', label: 'Normal · about 75 kbps' },
    { id: 'high', label: 'High · about 150 kbps' },
  ],
  m4a: [
    { id: 'low', label: 'Low · about 50 kbps' },
    { id: 'normal', label: 'Normal · 128 kbps (same as High)' },
    { id: 'high', label: 'High · 128 kbps' },
  ],
};

const DOWNLOAD_FORMATS: { id: DownloadFormat; label: string }[] = [
  { id: 'opus', label: 'Opus (.webm)' },
  { id: 'm4a', label: 'AAC (.m4a)' },
];

const useDownloadLocation = () => {
  useEffect(() => {
    void loadLocation();
  }, []);
  return useSyncExternalStore(subscribeLocation, getLocation);
};

interface SectionDef {
  id: string;
  label: string;
  icon: IconName;
  title: string;
  description: string;
  available: boolean;
}

const Row = ({
  icon,
  label,
  desc,
  children,
}: {
  icon: IconName;
  label: string;
  desc?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="lrow">
      <span className="icobox">
        <Icon name={icon} size={18} />
      </span>
      <span className="flex flex-col grow min-w-0 gap-0.5">
        <span className="text-body-m text-t1 font-medium">{label}</span>
        {desc && <span className="text-body-s text-t3 truncate">{desc}</span>}
      </span>
      {children}
    </div>
  );
};

const chevron = <Icon name="chevron-right" size={16} className="text-t4 flex-none" />;

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const settings = useSettings();
  const devicePrefs = useDevicePrefs();
  const { mode, setMode } = useModeStore();
  const { user } = useAuth();
  const local = useLocalLibrary();
  const location = useDownloadLocation();
  const { items: downloadItems, activeCount } = useDownloads();

  const sections: SectionDef[] = [
    {
      id: 'account',
      label: 'Account',
      icon: 'user',
      title: 'Account',
      description: 'Manage your profile and sign-in status.',
      available: true,
    },
    {
      id: 'playback',
      label: 'Playback',
      icon: 'play',
      title: 'Playback',
      description: 'Audio streaming quality, gaps, and volume normalization.',
      available: true,
    },
    {
      id: 'downloads',
      label: 'Downloads',
      icon: 'download',
      title: 'Downloads',
      description: 'Quality, file format and where downloaded songs are saved.',
      available: CAPS.downloads,
    },
    {
      id: 'audio',
      label: 'Audio & effects',
      icon: 'sliders',
      title: 'Audio & effects',
      description: 'Equalizer presets, bass boost, and audio processing.',
      available: true,
    },
    {
      id: 'library',
      label: 'Library & scanning',
      icon: 'folder',
      title: 'Library & scanning',
      description: 'Local folders and rescanning. Plays and favourites sync on their own.',
      // Only local folders live here now that sync runs in the background.
      available: CAPS.localLibrary,
    },
    {
      id: 'connection',
      label: 'Connection mode',
      icon: 'smartphone',
      title: 'Connection mode',
      description: 'Controls what the whole app shows and where playback comes from.',
      available: CAPS.offlineMode,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: 'moon',
      title: 'Appearance',
      description: 'Display and theme settings.',
      available: true,
    },
    {
      id: 'about',
      label: 'About',
      icon: 'info',
      title: 'About',
      description: 'Application details and version information.',
      available: true,
    },
  ];

  const activeSections = sections.filter((s) => s.available);
  const currentSectionId = searchParams.get('section') || 'account';
  const currentSection = activeSections.find((s) => s.id === currentSectionId) || activeSections[0];

  const setSection = (id: string) => {
    setSearchParams({ section: id });
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification();
      showToast({ title: 'Verification email sent', description: `Check ${user?.email}`, icon: 'check' });
    } catch (err) {
      showToast({ title: 'Could not send the email', description: err instanceof Error ? err.message : undefined });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    showToast({ title: 'Signed out', description: "You're listening as a guest", icon: 'logout' });
  };

  // Sessions belong to a server, so switching signs out; the app restarts on the new one.
  const changeServer = async (origin: string | null) => {
    if ((origin ?? DEFAULT_API_ORIGIN) === (customServerOrigin ?? DEFAULT_API_ORIGIN)) return;
    clearSession();
    await switchServer(origin);
  };

  const handleServerAddress = async () => {
    const text = await promptDialog({
      title: 'Server address',
      description: ALLOWS_HTTP
        ? `The Sonare backend this app talks to; for a computer on the LAN, use its address. Default: ${DEFAULT_API_ORIGIN}. Changing it signs you out and restarts Sonare.`
        : `The Sonare backend this app talks to. Default: ${DEFAULT_API_ORIGIN}. Changing it signs you out and restarts Sonare.`,
      placeholder: ALLOWS_HTTP ? '192.168.1.20:3010' : 'https://api.example.com',
      initialValue: customServerOrigin ?? '',
      confirmLabel: 'Save & restart',
      maxLength: 200,
    });
    if (!text) return;
    const origin = normalizeServerOrigin(text);
    if (!origin) {
      showToast({ title: 'Not a server address', description: 'Enter an address like 192.168.1.20:3010' });
      return;
    }
    if (!ALLOWS_HTTP && !origin.startsWith('https://')) {
      showToast({ title: 'HTTPS only', description: 'This build only connects over HTTPS' });
      return;
    }
    await changeServer(origin);
  };

  const totalLocalBytes = local.folders.reduce((n, f) => n + f.bytes, 0);
  const totalLocalTracks = local.folders.filter((f) => f.included).reduce((n, f) => n + f.trackCount, 0);
  const totalFoldersCount = local.folders.length;

  const renderAccount = () => (
    <div className="flex flex-col gap-6">
      <div className="surf flex items-center gap-4 p-5 rounded-2xl">
        {user ? (
          <>
            <span className="flex items-center justify-center flex-none w-12 h-12 rounded-full bg-acc text-black text-title-l font-semibold">
              {user.displayName.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="flex flex-col grow min-w-0">
              <span className="text-title-l text-t1 truncate">{user.displayName || 'Signed in'}</span>
              <span className="text-body-s text-t3 truncate">{user.email}</span>
            </span>
            <Button variant="out" icon="logout" onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <span className="flex items-center justify-center flex-none w-12 h-12 rounded-full bg-s4 text-t2">
              <Icon name="user" size={22} />
            </span>
            <span className="flex flex-col grow min-w-0">
              <span className="text-title-l text-t1">Listening as a guest</span>
              <span className="text-body-s text-t3">
                Create a free account to sync playlists, favourites and history.
              </span>
            </span>
            <Button variant="acc" onClick={() => navigate('/signin', { state: { mode: 'signup' } })}>
              Create account
            </Button>
            <Button variant="out" onClick={() => navigate('/signin', { state: { mode: 'signin' } })}>
              Sign in
            </Button>
          </>
        )}
      </div>
      {user?.emailVerified === false && (
        <div className="surf flex items-center gap-4 p-5 rounded-2xl">
          <span className="flex flex-col grow min-w-0">
            <span className="text-body-m text-t1 font-medium">Email not verified</span>
            <span className="text-body-s text-t3">Verify it so you can reset your password if you forget it.</span>
          </span>
          <Button variant="out" onClick={handleResendVerification}>
            Resend link
          </Button>
        </div>
      )}
    </div>
  );

  const renderPlayback = () => (
    <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
      <div className="lrow">
        <span className="icobox">
          <Icon name="music" size={18} />
        </span>
        <span className="flex flex-col grow min-w-0 gap-0.5">
          <span className="text-body-m text-t1 font-medium">Streaming quality</span>
          <span className="text-body-s text-t3 truncate">Applies from the next track</span>
        </span>
        <Select
          align="end"
          ariaLabel="Streaming quality"
          value={settings.streamQuality}
          options={QUALITIES.map((q) => ({ value: q.id, label: q.label }))}
          onChange={(streamQuality) => updateSettings({ streamQuality })}
        />
      </div>
      <label className="cursor-pointer">
        <Row icon="music2" label="Gapless playback" desc="Seamless album transitions">
          <Switch
            checked={settings.gapless}
            onCheckedChange={(gapless) => updateSettings({ gapless })}
            aria-label="Toggle gapless playback"
          />
        </Row>
      </label>
      <label className="cursor-pointer">
        <Row icon="volume" label="Volume normalization" desc="Evens out loud and quiet tracks">
          <Switch
            checked={settings.normalization}
            onCheckedChange={(normalization) => updateSettings({ normalization })}
            aria-label="Toggle volume normalization"
          />
        </Row>
      </label>
    </div>
  );

  const changeLocation = async () => {
    try {
      if (await chooseLocation())
        showToast({
          title: 'Download location changed',
          description: 'New downloads are saved there',
          icon: 'folder',
          variant: 'gold',
        });
    } catch (e) {
      showToast({
        title: 'Could not change the location',
        description: e instanceof Error ? e.message : undefined,
        icon: 'info',
      });
    }
  };

  const doneCount = downloadItems.filter((d) => d.status === 'done').length;
  const canChangeLocation = CAPS.offlineDownloads || canPickWebFolder;
  const locationDesc =
    location.kind === 'browser'
      ? canPickWebFolder
        ? "Your browser's Downloads folder. Choose a folder to let Sonare delete files too."
        : "Your browser's Downloads folder (this browser can't save into other folders)"
      : location.label;

  const renderDownloads = () => (
    <div className="flex flex-col gap-4">
      <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
        <div className="lrow">
          <span className="icobox">
            <Icon name="music" size={18} />
          </span>
          <span className="flex flex-col grow min-w-0 gap-0.5">
            <span className="text-body-m text-t1 font-medium">Download quality</span>
            <span className="text-body-s text-t3 truncate">Applies to new downloads</span>
          </span>
          <Select
            align="end"
            ariaLabel="Download quality"
            value={settings.downloadQuality}
            options={DOWNLOAD_QUALITIES[settings.downloadFormat].map((q) => ({ value: q.id, label: q.label }))}
            onChange={(downloadQuality) => updateSettings({ downloadQuality })}
          />
        </div>
        <div className="lrow">
          <span className="icobox">
            <Icon name="disc" size={18} />
          </span>
          <span className="flex flex-col grow min-w-0 gap-0.5">
            <span className="text-body-m text-t1 font-medium">File format</span>
            <span className="text-body-s text-t3 truncate">
              Saved as YouTube serves it, never re-encoded. AAC plays in more apps.
            </span>
          </span>
          <Select
            align="end"
            ariaLabel="Download format"
            value={settings.downloadFormat}
            options={DOWNLOAD_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
            onChange={(downloadFormat) => updateSettings({ downloadFormat })}
          />
        </div>
        <div className="lrow">
          <span className="icobox">
            <Icon name="folder" size={18} />
          </span>
          <span className="flex flex-col grow min-w-0 gap-0.5">
            <span className="text-body-m text-t1 font-medium">Download location</span>
            <span className="text-body-s text-t3 truncate" title={location.label}>
              {locationDesc}
            </span>
          </span>
          {canChangeLocation && (
            <span className="flex items-center gap-2 flex-none">
              {location.custom && (
                <Button variant="ghost" size="sm" onClick={() => void resetLocation()}>
                  Default
                </Button>
              )}
              <Button variant="out" size="sm" icon="folder" onClick={() => void changeLocation()}>
                {location.kind === 'browser' ? 'Choose folder' : 'Change'}
              </Button>
            </span>
          )}
        </div>
      </div>
      <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
        <Link to="/downloads" className="no-underline block">
          <Row
            icon="download"
            label="Manage downloads"
            desc={activeCount > 0 ? `${activeCount} in progress · ${doneCount} downloaded` : `${doneCount} downloaded`}
          >
            {chevron}
          </Row>
        </Link>
      </div>
      <span className="text-body-s text-t4 pl-1">
        Changing the location only affects new downloads; existing files stay where they are.
      </span>
    </div>
  );

  const renderAudio = () => (
    <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
      <Link to="/equalizer" className="no-underline block">
        <Row icon="sliders" label="Equalizer & Audio" desc="EQ presets, bass boost, virtualizer, speed">
          {chevron}
        </Row>
      </Link>
      {outputSupport() !== 'none' && (
        <Row icon="output" label="Audio output" desc="The speaker or headphones Sonare plays on">
          <OutputCard className="min-w-[200px] max-w-[260px] py-2" />
        </Row>
      )}
      <Row
        icon="lyrics"
        label="Lyrics language"
        desc="Shows lyrics in this script when a version exists, else the song's own"
      >
        <Select
          align="end"
          ariaLabel="Lyrics language"
          value={devicePrefs.lyricsScript}
          options={LYRICS_SCRIPTS}
          onChange={(lyricsScript) => updateDevicePrefs({ lyricsScript })}
        />
      </Row>
    </div>
  );

  const renderLibrary = () => (
    <div className="flex flex-col gap-4">
      <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
        <Link to="/folders" className="no-underline block">
          <Row icon="folder" label="Local music folders" desc="Manage scanned music folders on this device">
            {chevron}
          </Row>
        </Link>
      </div>
    </div>
  );

  const renderConnection = () => (
    <div className="flex flex-col gap-6">
      <div className="surf flex flex-col p-6 gap-5 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-title-l text-t1 font-semibold">Current mode</span>
            <span className="text-body-s text-t3">
              {mode === 'offline' ? 'Offline · nothing fetched from server' : 'Online · streaming from Sonare server'}
            </span>
          </div>
          <Segmented
            options={[
              { id: 'online', label: 'Online', icon: 'cloud' },
              { id: 'offline', label: 'Offline', icon: 'smartphone' },
            ]}
            value={mode}
            onChange={(m) => {
              if (m === mode) return;
              if (m === 'offline') navigate('/mode-switch');
              else setMode('online');
            }}
            color={mode === 'offline' ? 'gold' : 'acc'}
          />
        </div>
        <hr className="border-0 h-px bg-ln" />
        <div className="grid grid-cols-2 @md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-label-s text-t3 font-medium">
              <Icon name="smartphone" size={15} />
              <span>SONGS ON DEVICE</span>
            </span>
            <span className="text-h1 text-gold font-semibold">{totalLocalTracks.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-label-s text-t3 font-medium">
              <Icon name="folder" size={15} />
              <span>SCANNED FOLDERS</span>
            </span>
            <span className="text-h1 text-gold font-semibold">{totalFoldersCount}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-label-s text-t3 font-medium">
              <Icon name="download" size={15} />
              <span>STORAGE USED</span>
            </span>
            <span className="text-h1 text-gold font-semibold">{formatBytes(totalLocalBytes)}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-label-s text-t3 font-medium">
              <Icon name="cloud" size={15} />
              <span>CONNECTION</span>
            </span>
            <span className="text-h1 text-t1 font-semibold capitalize">{mode}</span>
          </div>
        </div>
      </div>

      <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
        <label className="cursor-pointer">
          <Row
            icon="wifi-off"
            label="Stay offline until I switch back"
            desc="Start in Offline mode until I switch back"
          >
            <Switch
              variant="gold"
              checked={settings.stayOffline}
              onCheckedChange={(stayOffline) => updateSettings({ stayOffline })}
              aria-label="Stay offline"
            />
          </Row>
        </label>
      </div>

      {SERVER_ADDRESS_ENABLED && (
        <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
          <Row icon="cloud" label="Server address" desc={customServerOrigin ?? `Default · ${DEFAULT_API_ORIGIN}`}>
            {customServerOrigin && (
              <Button variant="ghost" size="sm" onClick={() => void changeServer(null)}>
                Use default
              </Button>
            )}
            <Button variant="out" size="sm" onClick={() => void handleServerAddress()}>
              Change
            </Button>
          </Row>
        </div>
      )}

      {CAPS.localLibrary && (
        <div className="flex items-center gap-3">
          <Button variant="out" icon="folder" onClick={() => navigate('/folders')}>
            Manage music folders
          </Button>
        </div>
      )}
    </div>
  );

  const renderAppearance = () => (
    <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
      <Row icon="moon" label="Theme" desc="Dark (always on)" />
    </div>
  );

  const renderAbout = () => <AboutSection />;

  const renderSectionContent = (id: string) => {
    switch (id) {
      case 'account':
        return renderAccount();
      case 'playback':
        return renderPlayback();
      case 'downloads':
        return renderDownloads();
      case 'audio':
        return renderAudio();
      case 'library':
        return renderLibrary();
      case 'connection':
        return renderConnection();
      case 'appearance':
        return renderAppearance();
      case 'about':
        return renderAbout();
      default:
        return renderAccount();
    }
  };

  return (
    <div className="@container flex flex-col h-full overflow-hidden bg-bg">
      {/* Mobile / Small screen: M15 single scrolling list with overline headers */}
      <div className="flex @[480px]:hidden flex-col p-4 gap-6 overflow-y-auto h-full pb-8">
        <span className="phone-shell-hide text-title-l text-t1 font-semibold">Settings</span>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Account</span>
          {renderAccount()}
        </div>

        {CAPS.offlineMode && (
          <div className="flex flex-col gap-2">
            <span className="text-overline text-t3 pl-1">Connection mode</span>
            {renderConnection()}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Playback</span>
          {renderPlayback()}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Downloads</span>
          {renderDownloads()}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Audio & effects</span>
          {renderAudio()}
        </div>

        {CAPS.localLibrary && (
          <div className="flex flex-col gap-2">
            <span className="text-overline text-t3 pl-1">Library & scanning</span>
            {renderLibrary()}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">Appearance</span>
          {renderAppearance()}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-overline text-t3 pl-1">About</span>
          {renderAbout()}
        </div>
      </div>

      {/* Desktop / Wide: W15 / D15 sub-nav on left + selected section on right */}
      <div className="hidden @[480px]:flex flex-row grow overflow-hidden h-full">
        {/* Left Sub-nav */}
        <div className="flex flex-col flex-none w-56 border-r border-ln p-6 gap-1 overflow-y-auto">
          <span className="text-overline text-t3 px-3 pb-3">Settings</span>
          {activeSections.map((sec) => {
            const on = sec.id === currentSection.id;
            return (
              <button
                key={sec.id}
                onClick={() => setSection(sec.id)}
                className={`sitem w-full text-left bg-transparent border-0 cursor-pointer ${on ? 'on' : ''}`}
              >
                <Icon name={sec.icon} size={18} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Section Content */}
        <div className="flex flex-col grow overflow-y-auto p-8 @[768px]:p-10 gap-7 min-w-0">
          <div className="flex flex-col gap-1">
            <span className="text-display-s text-t1 font-bold tracking-tight">{currentSection.title}</span>
            <span className="text-body-m text-t2">{currentSection.description}</span>
          </div>

          <div className="flex flex-col gap-6 max-w-[800px]">{renderSectionContent(currentSection.id)}</div>
        </div>
      </div>
    </div>
  );
};
export default Settings;

// ---- About: version, and the desktop window's update check ----

const FORMAT_LABELS: Record<string, string> = {
  apk: 'APK',
  appimage: 'AppImage',
  deb: '.deb',
  'tar.gz': '.tar.gz',
  exe: '.exe',
};

/**
 * The desktop window's update check: compares this app's version with the latest GitHub
 * release (GET /releases) and downloads a newer one into the Downloads folder
 * (store/updateSlice.ts). The web build has no downloads here: the intro page at / offers them.
 */
const UpdatesCard = () => {
  const dispatch = useAppDispatch();
  const update = useAppSelector((s) => s.update);
  const { mode } = useModeStore();
  const online = mode !== 'offline';

  // Look once each time About opens (a finished or running download is kept).
  useEffect(() => {
    if (online) void dispatch(checkForUpdates());
  }, [dispatch, online]);

  const { status, release, progress, path, error } = update;
  const versionDesc = release
    ? [`Version ${release.version}`, formatBytes(release.sizeBytes), release.notes].filter(Boolean).join(' · ')
    : '';
  const fileKind = release ? (FORMAT_LABELS[release.format] ?? release.format) : '';

  let row: React.ReactNode;
  if (!online) {
    row = <Row icon="wifi-off" label="Updates need Online mode" desc="Switch to Online to check for a newer version" />;
  } else if (status === 'checking' || status === 'idle') {
    row = <Row icon="loader" label="Checking for updates…" />;
  } else if (status === 'current') {
    row = (
      <Row icon="check" label="Sonare is up to date" desc={`Version ${APP_VERSION} is the newest`}>
        <Button variant="out" size="sm" onClick={() => void dispatch(checkForUpdates())}>
          Check again
        </Button>
      </Row>
    );
  } else if (status === 'available' && release) {
    row = (
      <Row icon="download" label={`Sonare ${release.version} is available`} desc={versionDesc}>
        <Button variant="acc" size="sm" onClick={() => void dispatch(downloadAppUpdate(release))}>
          Download {fileKind}
        </Button>
      </Row>
    );
  } else if (status === 'downloading' && release) {
    row = (
      <Row
        icon="loader"
        label={`Downloading Sonare ${release.version}…`}
        desc={`${Math.round(progress * 100)}% of ${formatBytes(release.sizeBytes)}`}
      >
        <span
          className="w-24 h-1.5 rounded-full bg-s3 overflow-hidden flex-none"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Download progress"
        >
          <span className="block h-full bg-acc" style={{ width: `${progress * 100}%` }} />
        </span>
      </Row>
    );
  } else if (status === 'downloaded' && release && path) {
    row = (
      <Row
        icon="check"
        label={`Sonare ${release.version} is downloaded`}
        desc={`Saved to ${path}. Close Sonare, then install it.`}
      >
        <span className="flex items-center gap-2 flex-none">
          <Button variant="out" size="sm" onClick={() => void showUpdateFolder(path)}>
            Show in folder
          </Button>
          <Button variant="acc" size="sm" onClick={() => void openUpdate(path)}>
            Open
          </Button>
        </span>
      </Row>
    );
  } else {
    row = (
      <Row
        icon="info"
        label={release ? "Couldn't download the update" : "Couldn't check for updates"}
        desc={error ?? undefined}
      >
        <Button
          variant="out"
          size="sm"
          onClick={() => void (release ? dispatch(downloadAppUpdate(release)) : dispatch(checkForUpdates()))}
        >
          Try again
        </Button>
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-overline text-t3 pl-1">Updates</span>
      <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">{row}</div>
    </div>
  );
};

const AboutSection = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="surf flex flex-col divide-y divide-ln rounded-2xl overflow-hidden">
        <Row icon="info" label="About Sonare" desc={`Version ${APP_VERSION} · Offline-first music player`} />
      </div>
      {CAPS.appUpdates && <UpdatesCard />}
    </div>
  );
};
