import type { AppRelease, ReleasePlatform } from '../types';

/**
 * The installable builds the intro page offers. Each one is an asset of the latest GitHub
 * release of RELEASE_REPO under a fixed name (../../buildFE.sh `prod all` makes them), so
 * `releases/latest/download/<file>` always gets the newest build without an API call.
 */
export const RELEASE_REPO = 'Rajan694/sonare';
export const RELEASES_PAGE = `https://github.com/${RELEASE_REPO}/releases`;
export const REPO_PAGE = `https://github.com/${RELEASE_REPO}`;

export const latestDownloadUrl = (file: string): string => {
  return `${RELEASES_PAGE}/latest/download/${file}`;
};

export interface DownloadOption {
  platform: ReleasePlatform;
  /** The format GET /releases reports for this file, to show its version and size. */
  format: string;
  file: string;
  label: string;
  hint: string;
}

export const DOWNLOADS = {
  apk: {
    platform: 'android',
    format: 'apk',
    file: 'sonare-android-arm64.apk',
    label: 'Download APK',
    hint: 'Android 7.0 or newer, 64-bit phones. Allow your browser to install apps when asked.',
  },
  appimage: {
    platform: 'linux',
    format: 'appimage',
    file: 'sonare-linux-x64.AppImage',
    label: 'AppImage',
    hint: 'Any distribution: make it executable and run it.',
  },
  deb: {
    platform: 'linux',
    format: 'deb',
    file: 'sonare-linux-x64.deb',
    label: '.deb package',
    hint: 'Debian, Ubuntu, Mint and Pop!_OS. Adds Sonare to your app menu.',
  },
  tarGz: {
    platform: 'linux',
    format: 'tar.gz',
    file: 'sonare-linux-x64.tar.gz',
    label: '.tar.gz archive',
    hint: 'Portable: unpack anywhere and run ./sonare.',
  },
  exe: {
    platform: 'windows',
    format: 'exe',
    file: 'sonare-windows-x64.exe',
    label: 'Download for Windows',
    hint: 'Windows 10 and 11, 64-bit. One file, nothing to install.',
  },
} as const satisfies Record<string, DownloadOption>;

export type DownloadKey = keyof typeof DOWNLOADS;

/** Linux builds, recommended first. */
export const LINUX_DOWNLOADS: DownloadKey[] = ['appimage', 'deb', 'tarGz'];

export type VisitorOs = 'android' | 'linux' | 'windows' | 'other';

/**
 * The visitor's OS, to put the matching download first. Android says "Linux" in its user
 * agent too, so it is checked first; ChromeOS, macOS and iOS get the web app.
 */
export const detectOs = (nav: Pick<Navigator, 'userAgent'> & { userAgentData?: { platform?: string } }): VisitorOs => {
  const text = `${nav.userAgentData?.platform ?? ''} ${nav.userAgent}`;
  if (/android/i.test(text)) return 'android';
  if (/cros/i.test(text)) return 'other';
  if (/windows/i.test(text)) return 'windows';
  if (/linux|x11/i.test(text)) return 'linux';
  return 'other';
};

/** The download to feature for an OS, or null when the web app is the better start. */
export const featuredDownload = (os: VisitorOs): DownloadKey | null => {
  if (os === 'android') return 'apk';
  if (os === 'linux') return 'appimage';
  if (os === 'windows') return 'exe';
  return null;
};

/** "v1.2.0 · 34 MB" for a download, from GET /releases; null when it isn't listed. */
export const releaseLabel = (releases: AppRelease[] | null, option: DownloadOption): string | null => {
  const release = releases?.find((r) => r.platform === option.platform && r.format === option.format);
  if (!release) return null;
  const mb = release.sizeBytes / (1024 * 1024);
  return `v${release.version} · ${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
};
