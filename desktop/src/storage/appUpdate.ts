import { filesystem, os } from '@neutralinojs/lib';
import { api } from '../api/api';
import { curlDownload } from '../youtube/curlFetch';
import { findUpdate } from '../../../shared/releases';
import { version as APP_VERSION } from '../../neutralino.config.json';
import type { AppRelease, ReleasePlatform } from '../types';

// Updates for the desktop window: the newest build uploaded on the admin page, downloaded with
// curl into the Downloads folder (the webview can't save files itself) and checked against the
// sha256 the backend recorded. Installing is left to the user: open the file or its folder.

export { APP_VERSION };

export const desktopPlatform = (): ReleasePlatform => (window.NL_OS === 'Windows' ? 'windows' : 'linux');

/**
 * The kinds of file this copy can update from, most wanted first: the kind it was installed as
 * (an AppImage knows its path, the .deb installs to /opt/sonare), then the others.
 */
export const installFormats = async (): Promise<string[]> => {
  if (window.NL_OS === 'Windows') return ['exe', 'msi', 'zip'];
  const appImage = await os.getEnv('APPIMAGE').catch(() => '');
  if (appImage) return ['appimage', 'tar.gz', 'deb', 'rpm'];
  if ((window.NL_PATH ?? '').startsWith('/opt/sonare')) return ['deb', 'rpm', 'appimage', 'tar.gz'];
  return ['tar.gz', 'appimage', 'deb', 'rpm'];
};

/** The build to update to, or null when this one is the newest. */
export const checkForUpdate = async (): Promise<AppRelease | null> => {
  const { items } = await api.getReleases();
  return findUpdate(items, desktopPlatform(), APP_VERSION, await installFormats());
};

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** A file name the release may carry, made safe for any file system. */
const safeFileName = (name: string) =>
  [...name]
    .map((c) => (c.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(c) ? '_' : c))
    .join('')
    .replace(/^\.+/, '') || 'sonare-update';

/**
 * Download `release` into the Downloads folder and check it is the file that was uploaded.
 * `onProgress` gets 0..1 about twice a second. Resolves with the file's path.
 */
export const downloadUpdate = async (release: AppRelease, onProgress: (fraction: number) => void): Promise<string> => {
  const dir = (await os.getPath('downloads')).replace(/[/\\]+$/, '');
  const path = `${dir}/${safeFileName(release.fileName)}`;
  const part = `${path}.part`;
  const timer = setInterval(() => {
    filesystem
      .getStats(part)
      .then(({ size }) => onProgress(release.sizeBytes > 0 ? Math.min(1, size / release.sizeBytes) : 0))
      .catch(() => {});
  }, 500);
  try {
    await curlDownload(api.releaseDownloadUrl(release.id), part, release.sizeBytes);
    const hash = toHex(await crypto.subtle.digest('SHA-256', await filesystem.readBinaryFile(part)));
    if (release.sha256 && hash !== release.sha256.toLowerCase())
      throw new Error("The download doesn't match the uploaded file. Try again.");
    await filesystem.remove(path).catch(() => {});
    await filesystem.move(part, path);
  } catch (err) {
    await filesystem.remove(part).catch(() => {});
    throw err;
  } finally {
    clearInterval(timer);
  }
  // An AppImage runs straight from the file once it may be executed.
  if (release.format === 'appimage') await os.execCommand(`chmod +x "${path}"`).catch(() => {});
  onProgress(1);
  return path;
};

/** Open the downloaded file with the system (the installer, or the package manager). */
export const openUpdate = (path: string): Promise<void> => os.open(path);

/** Show the folder the update was saved to. */
export const showUpdateFolder = (path: string): Promise<void> => os.open(path.replace(/[/\\][^/\\]*$/, ''));
