import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, waitFor } from '@testing-library/react-native';
import { makeTrack } from '../test-utils';

/**
 * The phone-only extras behind Now Playing and Settings: audio output,
 * bringing the queue back, the server address, device preferences and "playing from".
 * Each test loads the modules afresh: their `watch*` wiring runs once per JS runtime.
 */

const { mockEventEmitter } = require('../jest.setup');

type Modules = {
  player: typeof import('../src/store/player');
  persist: typeof import('../src/store/playerPersist');
  prefs: typeof import('../src/store/devicePrefs');
  config: typeof import('../src/data/config');
  api: typeof import('../src/data/api');
  auth: typeof import('../src/data/auth');
};

const fresh = (): Modules => {
  jest.resetModules();
  return {
    player: require('../src/store/player'),
    persist: require('../src/store/playerPersist'),
    prefs: require('../src/store/devicePrefs'),
    config: require('../src/data/config'),
    api: require('../src/data/api'),
    auth: require('../src/data/auth'),
  };
};

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockEventEmitter.removeAllListeners();
  await AsyncStorage.clear();
});

describe('bringing the queue back', () => {
  // The saves are debounced timers; fake ones don't outlive the test.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const a = makeTrack({ title: 'A' });
  const b = makeTrack({ title: 'B', durationMs: 240_000 });
  const c = makeTrack({ title: 'C' });

  it('MOB-RESTORE-001 the queue, track, position, modes and source are saved as they change', async () => {
    const { player, persist } = fresh();
    persist.watchPlayerPersistence();
    const store = player.usePlayerStore;
    act(() => {
      store.getState().playTrack(b, [a, b, c], { kind: 'Album', name: 'Letters' });
      store.getState().cycleRepeat();
      store.setState({ positionMs: 61_000 });
    });
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    await waitFor(async () => expect(await AsyncStorage.getItem('sonare.playerState')).not.toBeNull());
    const saved = JSON.parse((await AsyncStorage.getItem('sonare.playerState'))!);
    expect(saved).toMatchObject({
      currentId: b.id,
      positionMs: 61_000,
      repeat: 'all',
      shuffle: false,
      playingFrom: { kind: 'Album', name: 'Letters' },
    });
    expect(saved.queue.map((t: { id: string }) => t.id)).toEqual([a.id, b.id, c.id]);
  });

  it('MOB-RESTORE-002 on the next start it comes back paused where it was, and the player resumes there', async () => {
    await AsyncStorage.setItem(
      'sonare.playerState',
      JSON.stringify({
        queue: [a, b, c],
        currentId: b.id,
        positionMs: 61_000,
        shuffle: true,
        repeat: 'one',
        playingFrom: { kind: 'Playlist', name: 'Gym' },
      }),
    );
    const { player, persist } = fresh();
    persist.watchPlayerPersistence();
    const store = player.usePlayerStore;
    await waitFor(() => expect(store.getState().currentTrack?.id).toBe(b.id));
    expect(store.getState()).toMatchObject({
      isPlaying: false,
      positionMs: 61_000,
      startAtMs: 61_000,
      durationMs: 240_000,
      shuffle: true,
      repeat: 'one',
      playingFrom: { kind: 'Playlist', name: 'Gym' },
    });
    expect(store.getState().queue.map((t) => t.id)).toEqual([a.id, b.id, c.id]);
    // Picking something else starts it from the top.
    act(() => store.getState().playTrack(c, [c]));
    expect(store.getState()).toMatchObject({ startAtMs: null, playingFrom: null });
  });

  it('MOB-RESTORE-003 a damaged save, or one whose track is missing, is ignored', async () => {
    await AsyncStorage.setItem('sonare.playerState', JSON.stringify({ queue: [{ nope: 1 }], currentId: 'gone' }));
    const { player, persist } = fresh();
    persist.watchPlayerPersistence();
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    expect(player.usePlayerStore.getState().currentTrack).toBeNull();
  });

  it('MOB-RESTORE-004 a fresh install signed in gets the queue the account remembers', async () => {
    const { player, persist, api, auth } = fresh();
    jest.spyOn(api.api, 'playerState').mockResolvedValue({
      trackRef: { kind: 'server', id: c.id },
      positionMs: 5000,
      queue: [{ v: 1, playingFrom: { kind: 'Artist', name: 'Radiohead' } }, a, c],
      index: 1,
      shuffle: false,
      repeat: 'off',
    });
    act(() => auth.useAuthStore.setState({ status: 'loading' } as never));
    persist.watchPlayerPersistence();
    act(() => auth.useAuthStore.setState({ status: 'signedIn' } as never));
    await waitFor(() => expect(player.usePlayerStore.getState().currentTrack?.id).toBe(c.id));
    expect(player.usePlayerStore.getState()).toMatchObject({
      positionMs: 5000,
      playingFrom: { kind: 'Artist', name: 'Radiohead' },
    });
  });

  it('MOB-RESTORE-005 signed in, the queue is also saved to the account', async () => {
    const { player, persist, api, auth } = fresh();
    const save = jest.spyOn(api.api, 'savePlayerState').mockResolvedValue({ ok: true });
    act(() => auth.useAuthStore.setState({ status: 'signedIn' } as never));
    persist.watchPlayerPersistence();
    act(() => player.usePlayerStore.getState().playTrack(a, [a, b], { kind: 'Search', name: '“a”' }));
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    // The account save waits a little longer than the phone's.
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(save).toHaveBeenCalledWith({
      trackRef: { kind: 'server', id: a.id },
      positionMs: 0,
      queue: [{ v: 1, playingFrom: { kind: 'Search', name: '“a”' } }, a, b],
      index: 0,
      shuffle: false,
      repeat: 'off',
    });
  });
});

describe('server address', () => {
  it('MOB-SERVER-001 debug builds talk to localhost (adb reverse); there is no other address', () => {
    const { config } = fresh();
    expect(config.DEFAULT_API_ORIGIN).toBe('http://localhost:3010');
    expect(config.apiOrigin()).toBe('http://localhost:3010');
    expect(config.apiBase()).toBe('http://localhost:3010/api/v1');
    expect(config.absoluteUrl('/api/v1/tracks/x/artwork')).toBe('http://localhost:3010/api/v1/tracks/x/artwork');
  });

  it('MOB-SERVER-002 an address saved by an older build is ignored', async () => {
    await AsyncStorage.setItem('sonare.serverOrigin', 'http://192.168.1.20:3010');
    const { config, api } = fresh();
    const opened: string[] = [];
    const open = XMLHttpRequest.prototype.open;
    jest.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (this: XMLHttpRequest, m, url) {
      opened.push(String(url));
      return open.call(this, m, url);
    });
    await api.api.genres().catch(() => {});
    expect(config.apiOrigin()).toBe('http://localhost:3010');
    expect(opened[0]).toBe('http://localhost:3010/api/v1/genres');
  });
});

describe('device preferences and lyrics', () => {
  it('MOB-PREFS-001 the lyrics language is kept on the phone and restored', async () => {
    let { prefs } = fresh();
    expect(prefs.useDevicePrefsStore.getState().lyricsScript).toBe('original');
    prefs.useDevicePrefsStore.getState().setLyricsScript('devanagari');
    await waitFor(async () => expect(await AsyncStorage.getItem('sonare.devicePrefs')).toContain('devanagari'));
    ({ prefs } = fresh());
    await prefs.useDevicePrefsStore.getState().hydrate();
    expect(prefs.useDevicePrefsStore.getState().lyricsScript).toBe('devanagari');
    expect(prefs.lyricsScriptLabel('devanagari')).toBe('Hindi / Bhojpuri (Devanagari)');
  });

  it('MOB-PREFS-002 an unknown saved script is ignored', async () => {
    await AsyncStorage.setItem('sonare.devicePrefs', JSON.stringify({ lyricsScript: 'klingon' }));
    const { prefs } = fresh();
    await prefs.useDevicePrefsStore.getState().hydrate();
    expect(prefs.useDevicePrefsStore.getState().lyricsScript).toBe('original');
  });

  it('MOB-PREFS-003 lyrics are asked for in the chosen script; "original" sends none', async () => {
    const { api } = fresh();
    const opened: string[] = [];
    jest.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (_m: string, url: string | URL) {
      opened.push(String(url));
    } as never);
    void api.api.lyrics('yt:abc', 'latin').catch(() => {});
    void api.api.lyrics('yt:abc').catch(() => {});
    expect(opened).toEqual([
      'http://localhost:3010/api/v1/tracks/yt%3Aabc/lyrics?prefer=synced&script=latin',
      'http://localhost:3010/api/v1/tracks/yt%3Aabc/lyrics?prefer=synced',
    ]);
  });
});

describe('playing from', () => {
  it('MOB-FROM-001 playTrack remembers where the queue came from; moving along keeps it', () => {
    const { player } = fresh();
    const store = player.usePlayerStore;
    const [x, y] = [makeTrack(), makeTrack()];
    act(() => store.getState().playTrack(x, [x, y], { kind: 'Album', name: 'In Rainbows' }));
    expect(store.getState().playingFrom).toEqual({ kind: 'Album', name: 'In Rainbows' });
    act(() => store.getState().playNext());
    expect(store.getState().currentTrack?.id).toBe(y.id);
    expect(store.getState().playingFrom).toEqual({ kind: 'Album', name: 'In Rainbows' });
    act(() => store.getState().playTrack(x));
    expect(store.getState().playingFrom).toBeNull();
  });
});
