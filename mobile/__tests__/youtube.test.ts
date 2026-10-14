import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, resetFallbackLogThrottleForTesting } from '../src/data/api';
import { artworkUrl } from '../src/data/config';
import { useLibraryStore } from '../src/store/library';
import {
  DEFAULT_APP_CONFIG,
  fetchAppConfig,
  isInAppYoutubeEnabled,
  loadAppConfig,
  resetAppConfigForTesting,
  setAppConfig,
  startAppConfigPolling,
  stopAppConfigPolling,
  subscribeAppConfig,
} from '../src/youtube/appConfig';
import {
  getInAppCatalog,
  refreshInAppSession,
  resetInAppForTesting,
  setMockInAppCatalogForTesting,
} from '../src/youtube/inApp';
import { useDownloadsStore } from '../src/store/downloads';
import { xhrFetch } from '../src/youtube/xhrFetch';
import { makeTrack } from '../test-utils';

const { Innertube } = jest.requireMock('youtubei.js/react-native') as { Innertube: { create: jest.Mock } };
const { mockEventEmitter, mockSonareDownloadsNative } = require('../jest.setup');

describe('In-App YouTube Support', () => {
  let lastBackendRequest: { method: string; url: string; headers: Record<string, string> } | null = null;

  const mockBackendResponse = (status: number, data: any) => {
    lastBackendRequest = null;
    class MockApiXHR {
      status = status;
      responseText = JSON.stringify(data);
      onload: (() => void) | null = null;
      method = 'GET';
      url = '';
      headers: Record<string, string> = {};
      open(method: string, url: string) {
        this.method = method;
        this.url = url;
      }
      setRequestHeader(k: string, v: string) {
        this.headers[k] = v;
      }
      send() {
        lastBackendRequest = { method: this.method, url: this.url, headers: this.headers };
        setTimeout(() => this.onload?.(), 0);
      }
    }
    global.XMLHttpRequest = MockApiXHR as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Fallbacks warn; MOB-YT-013 checks those warnings itself.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    lastBackendRequest = null;
    resetAppConfigForTesting({ inAppYoutube: false });
    resetInAppForTesting();
    resetFallbackLogThrottleForTesting();
    useLibraryStore.setState({ followingArtistIds: {} });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    stopAppConfigPolling();
    resetAppConfigForTesting({ inAppYoutube: false });
    resetInAppForTesting();
    resetFallbackLogThrottleForTesting();
  });

  it('MOB-YT-001 isInAppYoutubeEnabled follows the admin switch', () => {
    expect(isInAppYoutubeEnabled()).toBe(false);

    setAppConfig({ inAppYoutube: true });
    expect(isInAppYoutubeEnabled()).toBe(true);

    setAppConfig({ inAppYoutube: false });
    expect(isInAppYoutubeEnabled()).toBe(false);
  });

  it('MOB-YT-002 loadAppConfig loads cached config from AsyncStorage, falls back to default on error', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
      JSON.stringify({
        inAppYoutube: false,
        youtubeClients: ['ANDROID'],
        updatedAt: 12345,
      }),
    );

    const loaded = await loadAppConfig();
    expect(loaded.inAppYoutube).toBe(false);
    expect(loaded.youtubeClients).toEqual(['ANDROID']);
    expect(loaded.updatedAt).toBe(12345);

    // Corrupted JSON fallback to default
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce('invalid json{');
    const fallback = await loadAppConfig();
    expect(fallback.inAppYoutube).toBe(DEFAULT_APP_CONFIG.inAppYoutube);
  });

  it('MOB-YT-003 fetchAppConfig fetches /api/v1/app-config and tolerates 404', async () => {
    mockBackendResponse(200, {
      inAppYoutube: true,
      youtubeClients: ['VISIONOS', 'ANDROID'],
      updatedAt: 99999,
    });

    const config = await fetchAppConfig();
    expect(config.inAppYoutube).toBe(true);
    expect(config.youtubeClients).toEqual(['VISIONOS', 'ANDROID']);
    expect(config.updatedAt).toBe(99999);

    // 404 tolerance: keeps current config
    mockBackendResponse(404, { error: 'Not found' });
    const kept = await fetchAppConfig();
    expect(kept.updatedAt).toBe(99999);
  });

  it('MOB-YT-004 subscribeAppConfig notifies listeners on config change and polling cleanup', () => {
    const listener = jest.fn();
    const unsub = subscribeAppConfig(listener);

    setAppConfig({ inAppYoutube: false });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ inAppYoutube: false }));

    unsub();
    setAppConfig({ inAppYoutube: true });
    expect(listener).toHaveBeenCalledTimes(1);

    const stop = startAppConfigPolling();
    expect(typeof stop).toBe('function');
    stop();
  });

  it('MOB-YT-005 api.search routes to in-app catalog when enabled and falls back to backend on error', async () => {
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      search: jest.fn().mockResolvedValue({
        items: [{ id: 'yt:song1', title: 'Local Song', type: 'song' }],
        nextCursor: null,
      }),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);

    const res = await api.search('test query', 'songs');
    expect(mockCatalog.search).toHaveBeenCalledWith('test query', 'songs', undefined);
    expect((res.items[0] as any).title).toBe('Local Song');
    expect(lastBackendRequest).toBeNull();

    // Fallback on error
    mockCatalog.search.mockRejectedValue(new Error('YT failed'));
    mockBackendResponse(200, {
      items: [{ id: 'yt:fallback', title: 'Backend Song', type: 'song' }],
      nextCursor: null,
    });

    const fallbackRes = await api.search('test query', 'songs');
    expect((fallbackRes.items[0] as any).title).toBe('Backend Song');
    expect(lastBackendRequest?.url).toContain('/search?');
  });

  it('MOB-YT-006 api.search routes local L. cursor to local catalog and non-L cursor to backend', async () => {
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      search: jest.fn().mockResolvedValue({
        items: [{ id: 'yt:s2', title: 'Page 2', type: 'song' }],
        nextCursor: null,
      }),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);

    // Local cursor starts with L.
    const resLocal = await api.search('q', 'songs', 'L.cursor123');
    expect(mockCatalog.search).toHaveBeenCalledWith('q', 'songs', 'L.cursor123');
    expect(resLocal.items[0].id).toBe('yt:s2');
    expect(lastBackendRequest).toBeNull();

    // Remote cursor does not start with L.
    mockBackendResponse(200, {
      items: [{ id: 'yt:remote', title: 'Remote Page', type: 'song' }],
      nextCursor: null,
    });
    mockCatalog.search.mockClear();

    const resRemote = await api.search('q', 'songs', 'remote.cursor456');
    expect(mockCatalog.search).not.toHaveBeenCalled();
    expect(resRemote.items[0].id).toBe('yt:remote');
    expect(lastBackendRequest?.url).toContain('cursor=remote.cursor456');
  });

  it('MOB-YT-007 api.trending queries in-app catalog with region and limit, falling back to backend on error', async () => {
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      trending: jest.fn().mockResolvedValue({
        items: [{ id: 'yt:trend1', title: 'Trending Local' }],
        nextCursor: null,
      }),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);

    const res = await api.trending(15);
    expect(mockCatalog.trending).toHaveBeenCalledWith('IN', 15);
    expect(res.items[0].title).toBe('Trending Local');
    expect(lastBackendRequest).toBeNull();

    // Fallback on error
    mockCatalog.trending.mockRejectedValue(new Error('Trending network error'));
    mockBackendResponse(200, {
      items: [{ id: 'yt:trend_back', title: 'Trending Backend' }],
      nextCursor: null,
    });

    const fallbackRes = await api.trending(15);
    expect(fallbackRes.items[0].title).toBe('Trending Backend');
    expect(lastBackendRequest?.url).toContain('/trending?region=IN&limit=15');
  });

  it('MOB-YT-008 api.artistTopTracks and api.artistAlbums fetch tracks and albums from in-app catalog for YouTube IDs and fall back on error', async () => {
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      artistTopTracks: jest.fn().mockResolvedValue({
        items: [{ id: 'yt:dQw4w9WgXcQ', title: 'Top Track' }],
        nextCursor: null,
      }),
      artistAlbums: jest.fn().mockResolvedValue({
        items: [{ id: 'yt:MPREb_123', title: 'Album 1' }],
        nextCursor: null,
      }),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);

    const topTracks = await api.artistTopTracks('yt:UC_channel123', 10);
    expect(mockCatalog.artistTopTracks).toHaveBeenCalledWith('yt:UC_channel123', 10);
    expect(topTracks.items[0].title).toBe('Top Track');

    const albums = await api.artistAlbums('yt:UC_channel123');
    expect(mockCatalog.artistAlbums).toHaveBeenCalledWith('yt:UC_channel123', undefined);
    expect(albums.items[0].title).toBe('Album 1');

    // Fallback on error
    mockCatalog.artistTopTracks.mockRejectedValue(new Error('Failed top tracks'));
    mockBackendResponse(200, {
      items: [{ id: 'yt:dQw4w9WgXcQ', title: 'Backend Top Track' }],
      nextCursor: null,
    });

    const fallbackTracks = await api.artistTopTracks('yt:UC_channel123', 10);
    expect(fallbackTracks.items[0].title).toBe('Backend Top Track');
    expect(lastBackendRequest?.url).toContain('/artists/yt%3AUC_channel123/top-tracks?limit=10');
  });

  it('MOB-YT-009 api.album and api.albumTracks query in-app catalog for YouTube IDs and route L. cursor', async () => {
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      album: jest.fn().mockResolvedValue({
        id: 'yt:MPREb_album1',
        title: 'In-App Album',
        artist: 'Album Artist',
      }),
      albumTracks: jest.fn().mockResolvedValue({
        items: [{ id: 'yt:tr1', title: 'Track 1' }],
        nextCursor: null,
      }),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);

    const album = await api.album('yt:MPREb_album1');
    expect(mockCatalog.album).toHaveBeenCalledWith('yt:MPREb_album1');
    expect(album.title).toBe('In-App Album');

    const tracks = await api.albumTracks('yt:MPREb_album1', 'L.cursor_alb');
    expect(mockCatalog.albumTracks).toHaveBeenCalledWith('yt:MPREb_album1', 'L.cursor_alb');
    expect(tracks.items[0].id).toBe('yt:tr1');
  });

  it('MOB-YT-010 api.artist resolves following flag from useLibraryStore without backend call', async () => {
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      artist: jest.fn().mockResolvedValue({
        id: 'yt:UC_channel123',
        name: 'The Followed Band',
        following: false,
      }),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);

    useLibraryStore.getState().setArtistFollowed('yt:UC_channel123', true);

    const artistFollowed = await api.artist('yt:UC_channel123');
    expect(mockCatalog.artist).toHaveBeenCalledWith('yt:UC_channel123');
    expect(artistFollowed.following).toBe(true);
    expect(lastBackendRequest).toBeNull();

    useLibraryStore.getState().setArtistFollowed('yt:UC_channel123', false);
    const artistUnfollowed = await api.artist('yt:UC_channel123');
    expect(artistUnfollowed.following).toBe(false);
    expect(lastBackendRequest).toBeNull();
  });

  it('MOB-YT-011 api.playlist and api.playlistTracks query in-app catalog for YouTube IDs', async () => {
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      playlist: jest.fn().mockResolvedValue({
        id: 'yt:PL_test_list',
        name: 'YT In-App Playlist',
      }),
      playlistTracks: jest.fn().mockResolvedValue({
        items: [{ id: 'yt:plt1', title: 'Playlist Song' }],
        nextCursor: null,
      }),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);

    const playlist = await api.playlist('yt:PL_test_list');
    expect(mockCatalog.playlist).toHaveBeenCalledWith('yt:PL_test_list');
    expect(playlist.name).toBe('YT In-App Playlist');

    const plTracks = await api.playlistTracks('yt:PL_test_list', 'L.cursor_pl');
    expect(mockCatalog.playlistTracks).toHaveBeenCalledWith('yt:PL_test_list', 'L.cursor_pl');
    expect(plTracks.items[0].id).toBe('yt:plt1');
  });

  it('MOB-YT-012 api.stream extracts stream info from in-app catalog and falls back to backend on failure', async () => {
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      stream: jest.fn().mockResolvedValue({
        url: 'https://rr1---sn.googlevideo.com/videoplayback?id=123',
        format: 'opus',
        bitrate: 160000,
        direct: true,
      }),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);

    const stream = await api.stream('yt:vid123');
    expect(mockCatalog.stream).toHaveBeenCalledWith('yt:vid123', { quality: 'auto', format: undefined });
    expect(stream.url).toContain('googlevideo.com');
    expect(lastBackendRequest).toBeNull();

    // Fallback on error
    mockCatalog.stream.mockRejectedValue(new Error('Stream expired'));
    mockBackendResponse(200, {
      url: 'http://localhost:8080/api/v1/stream/yt:vid123',
      format: 'opus',
    });

    const fallbackStream = await api.stream('yt:vid123');
    expect(fallbackStream.url).toContain('/stream/yt:vid123');
    expect(lastBackendRequest?.url).toContain('/tracks/yt%3Avid123/stream');
  });

  it('MOB-YT-013 fallback logging throttles duplicate warning logs within 60-second window', async () => {
    resetFallbackLogThrottleForTesting();
    setAppConfig({ inAppYoutube: true });
    const mockCatalog = {
      search: jest.fn().mockRejectedValue(new Error('In-app error')),
    };
    setMockInAppCatalogForTesting(mockCatalog as any);
    mockBackendResponse(200, { items: [], nextCursor: null });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let mockTime = 1000000;
    const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockTime);

    // Call 1: should log warning
    await api.search('test1', 'songs');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('[in-app-yt] search fell back to the backend:');

    // Call 2: within 60s, throttled (no additional warning)
    mockTime += 30000;
    await api.search('test2', 'songs');
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Call 3: after 60s, logged again
    mockTime += 35000; // now 65s since first log
    await api.search('test3', 'songs');
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
    dateSpy.mockRestore();
  });

  it('MOB-YT-014 artworkUrl resolves full URL for direct YouTube images and relative backend endpoints', () => {
    // Direct Google / YouTube image URL with sizing
    const directUrl = 'https://lh3.googleusercontent.com/abc=w544-h544';
    const sizedDirect = artworkUrl({ thumbnail: directUrl }, 300);
    expect(sizedDirect).toBe('https://lh3.googleusercontent.com/abc=w300-h300');

    // Relative backend path
    const backendPath = '/api/v1/artwork/playlists/123/art.jpg';
    const sizedBackend = artworkUrl({ thumbnail: backendPath }, 300);
    expect(sizedBackend).toContain('/api/v1/artwork/playlists/123/art.jpg');

    // Undefined input
    expect(artworkUrl(undefined)).toBeUndefined();
    expect(artworkUrl(null)).toBeUndefined();
    expect(artworkUrl({})).toBeUndefined();
  });

  it('MOB-YT-015 a new client order rebuilds the catalog on the same session', async () => {
    Innertube.create.mockResolvedValueOnce({ fake: 'session' });

    const catalog1 = await getInAppCatalog();
    expect(await getInAppCatalog()).toBe(catalog1);

    setAppConfig({ youtubeClients: ['ANDROID', 'IOS'] });
    const catalog2 = await getInAppCatalog();
    expect(catalog2).not.toBe(catalog1);
    expect(Innertube.create).toHaveBeenCalledTimes(1);

    // The same order again changes nothing.
    setAppConfig({ youtubeClients: ['ANDROID', 'IOS'] });
    expect(await getInAppCatalog()).toBe(catalog2);
  });

  it('MOB-YT-016 a session that fails to start is tried again on the next call', async () => {
    Innertube.create.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ fake: 'session' });

    await expect(getInAppCatalog()).rejects.toThrow('offline');
    await expect(getInAppCatalog()).resolves.toBeDefined();
    expect(Innertube.create).toHaveBeenCalledTimes(2);
    expect(Innertube.create).toHaveBeenLastCalledWith({ retrieve_player: false, fetch: xhrFetch });
  });

  it('MOB-YT-017 refreshInAppSession starts a new session for the next stream lookup', async () => {
    // Nothing built yet: nothing to refresh.
    await refreshInAppSession();
    expect(Innertube.create).not.toHaveBeenCalled();

    Innertube.create.mockResolvedValue({ fake: 'session' });
    await getInAppCatalog();
    await refreshInAppSession();
    expect(Innertube.create).toHaveBeenCalledTimes(2);
  });

  it('MOB-YT-018 lyrics name the song so the backend needs no YouTube lookup', async () => {
    mockBackendResponse(200, { synced: false, lines: [] });
    await api.lyrics('yt:abc', 'original', { title: 'Song A', artist: 'Band B', durationMs: 201000 });
    expect(lastBackendRequest?.url).toContain('/tracks/yt%3Aabc/lyrics?');
    expect(lastBackendRequest?.url).toContain('title=Song%20A');
    expect(lastBackendRequest?.url).toContain('artist=Band%20B');
    expect(lastBackendRequest?.url).toContain('durationMs=201000');

    await api.lyrics('yt:abc');
    expect(lastBackendRequest?.url).not.toContain('title=');
  });

  it('MOB-YT-019 only followed artists from the library count as followed, with or without the yt: prefix', async () => {
    jest.spyOn(api, 'favouriteIds').mockResolvedValue({ ids: [] });
    jest.spyOn(api, 'myPlaylists').mockResolvedValue({ items: [], nextCursor: null } as never);
    jest.spyOn(api, 'libraryArtists').mockResolvedValue({
      items: [
        { id: 'yt:UCfollowed', name: 'Followed', following: true },
        { id: 'yt:UCsongsonly', name: 'Songs only', following: false, songCount: 3 },
      ],
      nextCursor: null,
    } as never);

    await useLibraryStore.getState().load();
    const { isArtistFollowed, setArtistFollowed } = useLibraryStore.getState();
    expect(isArtistFollowed('yt:UCfollowed')).toBe(true);
    expect(isArtistFollowed('UCfollowed')).toBe(true);
    expect(isArtistFollowed('yt:UCsongsonly')).toBe(false);

    setArtistFollowed('UCsongsonly', true);
    expect(useLibraryStore.getState().isArtistFollowed('yt:UCsongsonly')).toBe(true);
  });

  it('MOB-YT-020 a refused download url gets a fresh session before the download starts again', async () => {
    const inApp = require('../src/youtube/inApp');
    const refresh = jest.spyOn(inApp, 'refreshInAppSession').mockResolvedValue(undefined);
    jest.spyOn(api, 'stream').mockResolvedValue({
      url: 'https://rr1---sn.googlevideo.com/videoplayback?id=1',
      itag: 251,
      mimeType: 'audio/webm; codecs="opus"',
      contentLength: 1000,
    } as never);
    mockSonareDownloadsNative.partSize.mockResolvedValue(0);
    await useDownloadsStore.getState().hydrate();
    const track = makeTrack();

    useDownloadsStore.getState().enqueue([track]);
    await waitForCalls(mockSonareDownloadsNative.start, 1);

    mockEventEmitter.emit('SonareDownloads.error', { id: track.id, code: 'E_URL', message: '403', receivedBytes: 0 });
    await waitForCalls(mockSonareDownloadsNative.start, 2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(useDownloadsStore.getState().items[track.id].status).toBe('downloading');
    await useDownloadsStore.getState().remove(track.id);
  });

  it('MOB-YT-021 xhrFetch answers like fetch without waiting on timers', async () => {
    const sent: { method?: string; url?: string; headers: Record<string, string>; body?: unknown; timeout?: number } = {
      headers: {},
    };
    let fail = false;
    class FakeXHR {
      status = 206;
      statusText = 'Partial Content';
      responseText = '{"ok":true}';
      responseURL = 'https://rr1---sn.googlevideo.com/final';
      timeout = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      open(method: string, url: string) {
        Object.assign(sent, { method, url });
      }
      setRequestHeader(name: string, value: string) {
        sent.headers[name] = value;
      }
      getAllResponseHeaders() {
        return 'content-type: application/json\r\ncontent-range: bytes 0-10/99\r\n';
      }
      send(body: unknown) {
        Object.assign(sent, { body, timeout: this.timeout });
        // Answered straight from the native event: no setTimeout.
        if (fail) this.onerror?.();
        else this.onload?.();
      }
    }
    global.XMLHttpRequest = FakeXHR as any;

    const res = await xhrFetch(
      'https://example.com/x',
      { method: 'post', headers: { Range: 'bytes=0-10' }, body: '{}' },
      5000,
    );
    expect(sent).toMatchObject({ method: 'POST', url: 'https://example.com/x', body: '{}', timeout: 5000 });
    expect(sent.headers).toMatchObject({ range: 'bytes=0-10', 'content-type': 'text/plain;charset=UTF-8' });
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 0-10/99');
    expect(res.url).toBe('https://rr1---sn.googlevideo.com/final');
    expect(await res.json()).toEqual({ ok: true });

    fail = true;
    await expect(xhrFetch('https://example.com/x')).rejects.toThrow(TypeError);
  });

  it('MOB-YT-022 saving a song, adding it to a playlist or following its artist sends what the app knows', async () => {
    const sent: { url: string; body: unknown }[] = [];
    class RecordingXHR {
      status = 200;
      responseText = '{"ok":true}';
      url = '';
      onload: (() => void) | null = null;
      open(_method: string, url: string) {
        this.url = url;
      }
      setRequestHeader() {}
      send(body?: string) {
        sent.push({ url: this.url.replace(/^.*\/api\/v1/, ''), body: body ? JSON.parse(body) : undefined });
        setTimeout(() => this.onload?.(), 0);
      }
    }
    global.XMLHttpRequest = RecordingXHR as any;
    const found = makeTrack({ id: 'yt:inApp1', title: 'Found', artist: 'Band', artistId: 'yt:UCband' });
    const songMeta = { title: 'Found', artist: 'Band', artistId: 'yt:UCband', durationMs: 200_000 };

    await api.setFavourite(found.id, true, found);
    await api.setFavourite(found.id, false, found);
    await api.addToPlaylist('sonare:p1', [found, makeTrack({ id: 'local:file1' })]);
    await api.setFollowing('yt:UCband', true, {
      id: 'yt:UCband',
      name: 'Band',
      albumCount: 1,
      localTrackCount: 0,
      following: false,
    });

    expect(sent).toEqual([
      { url: '/me/favourites/tracks/yt%3AinApp1', body: { meta: songMeta } },
      // Removing needs nothing.
      { url: '/me/favourites/tracks/yt%3AinApp1', body: undefined },
      // Local files are the phone's own business.
      {
        url: '/me/playlists/sonare%3Ap1/tracks',
        body: { trackIds: ['yt:inApp1', 'local:file1'], metas: { 'yt:inApp1': songMeta } },
      },
      { url: '/me/following/artists/yt%3AUCband', body: { meta: { name: 'Band', monthlyListeners: null } } },
    ]);
  });
});

/** Let pending promises run until `fn` has been called `times` times. */
const waitForCalls = async (fn: jest.Mock, times: number) => {
  for (let i = 0; i < 50 && fn.mock.calls.length < times; i++) await new Promise((r) => setTimeout(r, 0));
  expect(fn).toHaveBeenCalledTimes(times);
};
