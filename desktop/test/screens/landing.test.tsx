import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import Landing from '../../src/screens/Landing';
import { detectOs, featuredDownload, releaseLabel, DOWNLOADS } from '../../src/lib/downloads';
import type { AppRelease } from '../../src/types';
import { renderWithProviders } from '../helpers/render';
import { API, http, HttpResponse, useMockServer, server } from '../helpers/server';

useMockServer();

const UA = {
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
  android:
    'Mozilla/5.0 (Linux; Android 15; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  chromeos:
    'Mozilla/5.0 (X11; CrOS x86_64 15917.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
};

const latest = (file: string) => `https://github.com/Rajan694/sonare/releases/latest/download/${file}`;

const release = (over: Partial<AppRelease>): AppRelease => ({
  id: '1',
  platform: 'android',
  format: 'apk',
  version: '1.2.0',
  fileName: 'sonare-android-arm64.apk',
  sizeBytes: 34 * 1024 * 1024,
  sha256: null,
  notes: null,
  uploadedAt: '2026-10-12T00:00:00Z',
  ...over,
});

/** The hero, the first section of the page. */
const hero = () => within(document.querySelector<HTMLElement>('main > section')!);

const visitAs = (ua: string) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
};

beforeEach(() => {
  // jsdom has no IntersectionObserver, which motion's whileInView needs.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  server.use(http.get(`${API}/releases`, () => HttpResponse.json({ items: [] })));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('intro page', () => {
  it('WEB-LAND-001 links every build to the latest GitHub release under its fixed name', () => {
    visitAs(UA.mac);
    renderWithProviders(<Landing />);
    const downloads = within(document.getElementById('download')!);
    expect(downloads.getByRole('link', { name: /Download APK/ })).toHaveAttribute(
      'href',
      latest('sonare-android-arm64.apk'),
    );
    expect(downloads.getByRole('link', { name: /AppImage/ })).toHaveAttribute(
      'href',
      latest('sonare-linux-x64.AppImage'),
    );
    expect(downloads.getByRole('link', { name: /\.deb package/ })).toHaveAttribute(
      'href',
      latest('sonare-linux-x64.deb'),
    );
    expect(downloads.getByRole('link', { name: /\.tar\.gz archive/ })).toHaveAttribute(
      'href',
      latest('sonare-linux-x64.tar.gz'),
    );
    expect(downloads.getByRole('link', { name: /Download for Windows/ })).toHaveAttribute(
      'href',
      latest('sonare-windows-x64.exe'),
    );
    expect(screen.getByRole('link', { name: 'GitHub Releases' })).toHaveAttribute(
      'href',
      'https://github.com/Rajan694/sonare/releases',
    );
  });

  it('WEB-LAND-002 opens the web app at /home', async () => {
    visitAs(UA.mac);
    const { user, location } = renderWithProviders(<Landing />);
    await user.click(screen.getByRole('link', { name: 'Open web app' }));
    expect(location()).toBe('/home');
  });

  it('WEB-LAND-003 a Linux visitor gets the AppImage first, with the Linux card leading the downloads', () => {
    visitAs(UA.linux);
    renderWithProviders(<Landing />);
    expect(hero().getByRole('link', { name: 'Download for Linux' })).toHaveAttribute(
      'href',
      latest('sonare-linux-x64.AppImage'),
    );
    const cards = within(document.getElementById('download')!).getAllByRole('article');
    expect(within(cards[0]).getByRole('heading', { name: 'Linux' })).toBeInTheDocument();
    expect(within(cards[0]).getByText('Best for you')).toBeInTheDocument();
  });

  it('WEB-LAND-004 an Android phone gets the APK, not the Linux build its user agent also mentions', () => {
    visitAs(UA.android);
    renderWithProviders(<Landing />);
    expect(hero().getByRole('link', { name: 'Download for Android' })).toHaveAttribute(
      'href',
      latest('sonare-android-arm64.apk'),
    );
    expect(hero().queryByRole('link', { name: 'Download for Linux' })).toBeNull();
  });

  it('WEB-LAND-005 macOS and other systems start in the browser', async () => {
    visitAs(UA.mac);
    const { user, location } = renderWithProviders(<Landing />);
    expect(hero().queryByRole('link', { name: /^Download for/ })).toBeNull();
    await user.click(hero().getByRole('link', { name: 'Start listening' }));
    expect(location()).toBe('/home');
  });

  it('WEB-LAND-006 shows the version and size from /releases next to the download', async () => {
    visitAs(UA.android);
    server.use(
      http.get(`${API}/releases`, () =>
        HttpResponse.json({
          items: [
            release({}),
            release({
              id: '2',
              platform: 'linux',
              format: 'deb',
              fileName: 'sonare-linux-x64.deb',
              sizeBytes: 1.5 * 1024 * 1024,
            }),
          ],
        }),
      ),
    );
    renderWithProviders(<Landing />);
    expect(await screen.findByText('android-arm64.apk · v1.2.0 · 34 MB')).toBeInTheDocument();
    expect(within(document.getElementById('download')!).getByText('v1.2.0 · 1.5 MB')).toBeInTheDocument();
  });

  it('WEB-LAND-007 the buttons still work when /releases fails', async () => {
    visitAs(UA.windows);
    let asked = false;
    server.use(
      http.get(`${API}/releases`, () => {
        asked = true;
        return HttpResponse.json(
          { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'GitHub is down' } },
          { status: 502 },
        );
      }),
    );
    renderWithProviders(<Landing />);
    await vi.waitFor(() => expect(asked).toBe(true));
    expect(hero().getByRole('link', { name: 'Download for Windows' })).toHaveAttribute(
      'href',
      latest('sonare-windows-x64.exe'),
    );
    expect(screen.queryByText(/ MB$/)).toBeNull();
  });

  it('WEB-LAND-008 sets the page title while it is open and puts the old one back', () => {
    visitAs(UA.mac);
    document.title = 'Sonare';
    const { unmount } = renderWithProviders(<Landing />);
    expect(document.title).toBe('Sonare — music player for Android, Linux, Windows and the web');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('synced lyrics'),
    );
    unmount();
    expect(document.title).toBe('Sonare');
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });

  it('WEB-LAND-009 switches the screenshots between Android and Linux', async () => {
    visitAs(UA.mac);
    const { user } = renderWithProviders(<Landing />);
    const shots = within(document.getElementById('screenshots')!);
    expect(shots.getByRole('img', { name: /synced lyrics in Devanagari/ })).toHaveAttribute(
      'src',
      '/landing/android-lyrics.webp',
    );
    await user.click(shots.getByRole('tab', { name: 'Linux' }));
    expect(shots.getByRole('tab', { name: 'Linux' })).toHaveAttribute('aria-selected', 'true');
    expect(await shots.findByRole('img', { name: /Linux: Now Playing/ })).toHaveAttribute(
      'src',
      '/landing/linux-nowplaying.webp',
    );
  });
});

describe('download helpers', () => {
  it('WEB-LAND-010 detectOs reads the platform, Android before Linux, ChromeOS as other', () => {
    expect(detectOs({ userAgent: UA.android })).toBe('android');
    expect(detectOs({ userAgent: UA.linux })).toBe('linux');
    expect(detectOs({ userAgent: UA.windows })).toBe('windows');
    expect(detectOs({ userAgent: UA.mac })).toBe('other');
    expect(detectOs({ userAgent: UA.chromeos })).toBe('other');
    expect(detectOs({ userAgent: UA.mac, userAgentData: { platform: 'Windows' } })).toBe('windows');
    expect(featuredDownload('other')).toBeNull();
    expect(featuredDownload('linux')).toBe('appimage');
  });

  it('WEB-LAND-011 releaseLabel matches platform and format, and skips missing builds', () => {
    const items = [release({ sizeBytes: 5.25 * 1024 * 1024 })];
    expect(releaseLabel(items, DOWNLOADS.apk)).toBe('v1.2.0 · 5.3 MB');
    expect(releaseLabel(items, DOWNLOADS.exe)).toBeNull();
    expect(releaseLabel(null, DOWNLOADS.apk)).toBeNull();
  });
});
