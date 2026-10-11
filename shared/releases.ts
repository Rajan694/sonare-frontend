// App updates: the builds uploaded on the admin page (GET /releases) against the version of
// the app that is running. Used by Settings → About in the desktop and Android apps.
import type { AppRelease, ReleasePlatform } from './apiTypes.js';

/** 1.10.0 > 1.9.2, and 1.0.0 > 1.0.0-dev (a tagged build comes before its release). */
export const compareVersions = (a: string, b: string): number => {
  const [coreA, tagA = ''] = a.split(/-(.*)/);
  const [coreB, tagB = ''] = b.split(/-(.*)/);
  const pa = coreA.split('.').map(Number);
  const pb = coreB.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff;
  }
  if (tagA === tagB) return 0;
  if (!tagA) return 1;
  if (!tagB) return -1;
  return tagA.localeCompare(tagB, 'en', { numeric: true });
};

/**
 * The build to update to: the highest version above `current` for `platform`, in the first of
 * `formats` it was uploaded in (most wanted first: the way this copy was installed). Formats not
 * listed are never offered. Null when this app is up to date.
 */
export const findUpdate = (
  releases: AppRelease[],
  platform: ReleasePlatform,
  current: string,
  formats: string[],
): AppRelease | null => {
  const rank = (r: AppRelease) => formats.indexOf(r.format);
  const best = releases
    .filter((r) => r.platform === platform && rank(r) >= 0)
    .sort((a, b) => compareVersions(b.version, a.version) || rank(a) - rank(b))[0];
  return best && compareVersions(best.version, current) > 0 ? best : null;
};
