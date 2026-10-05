import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { act, waitFor } from '@testing-library/react-native';
import { makeTrack } from '../test-utils';

/**
 * The phone-only extras behind Now Playing and Settings: sleep timer, audio output,
 * bringing the queue back, the server address, device preferences and "playing from".
 * Each test loads the modules afresh: their `watch*` wiring runs once per JS runtime.
 */

const native = NativeModules.SonarePlayer as Record<string, jest.Mock>;
const { mockEventEmitter } = require('../jest.setup');

type Modules = {
  player: typeof import('../src/store/player');
  sleep: typeof import('../src/store/sleepTimer');
  output: typeof import('../src/store/output');
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
    sleep: require('../src/store/sleepTimer'),
    output: require('../src/store/output'),
    persist: require('../src/store/playerPersist'),
    prefs: require('../src/store/devicePrefs'),
    config: require('../src/data/config'),
    api: require('../src/data/api'),
    auth: require('../src/data/auth'),
  };
};

const emit = (event: string, payload: unknown = {}) =>
  act(() => mockEventEmitter.emit(`SonarePlayer.${event}`, payload));

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockEventEmitter.removeAllListeners();
  await AsyncStorage.clear();
});

describe('sleep timer', () => {
  it('MOB-SLEEP-001 minutes are counted by the native player; the label counts down', () => {
    const { sleep } = fresh();
    sleep.useSleepTimerStore.getState().set(30);
    expect(native.setSleepTimer).toHaveBeenLastCalledWith(30 * 60_000);
    const { timer } = sleep.useSleepTimerStore.getState();
    expect(timer).toMatchObject({ kind: 'minutes', minutes: 30 });
    // Measured from when it was set, so a slow test run doesn't read 31.
    const now = (timer as { endsAt: number }).endsAt - 30 * 60_000;
    expect(sleep.sleepTimerLabel(timer, now)).toBe('Stops in 30 min');
    expect(sleep.sleepTimerLabel(timer, now + 29 * 60_000 + 1)).toBe('Stops in 1 min');
    // Never "0 min" while it's still on.
    expect(sleep.sleepTimerLabel(timer, now + 31 * 60_000)).toBe('Stops in 1 min');
    expect(native.setPauseAtEndOfTrack).not.toHaveBeenCalled();
  });

  it('MOB-SLEEP-002 "End of track" asks the player to stop at the end; switching away undoes it', () => {
    const { sleep } = fresh();
    const set = sleep.useSleepTimerStore.getState().set;
    set('endOfTrack');
    expect(native.setPauseAtEndOfTrack).toHaveBeenLastCalledWith(true);
    expect(native.setSleepTimer).toHaveBeenLastCalledWith(0);
    expect(sleep.sleepTimerLabel(sleep.useSleepTimerStore.getState().timer)).toBe('At the end of this track');
    set(15);
    expect(native.setPauseAtEndOfTrack).toHaveBeenLastCalledWith(false);
    set(null);
    expect(native.setSleepTimer).toHaveBeenLastCalledWith(0);
    expect(sleep.useSleepTimerStore.getState().timer).toEqual({ kind: 'off' });
    expect(sleep.sleepTimerLabel({ kind: 'off' })).toBe('Off');
    // Off → off doesn't touch end-of-track again.
    expect(native.setPauseAtEndOfTrack).toHaveBeenCalledTimes(2);
  });

  it('MOB-SLEEP-003 when the native timer fires, playback shows paused and the timer is off', () => {
    const { sleep, player } = fresh();
    sleep.watchSleepTimer();
    act(() => {
      player.usePlayerStore.getState().playTrack(makeTrack());
      sleep.useSleepTimerStore.getState().set(45);
    });
    emit('sleep');
    expect(player.usePlayerStore.getState().isPlaying).toBe(false);
    expect(sleep.useSleepTimerStore.getState().timer).toEqual({ kind: 'off' });
  });

  it('MOB-SLEEP-004 "End of track" turns itself off once the track stops at its end, not on a pause', () => {
    const { sleep, player } = fresh();
    sleep.watchSleepTimer();
    const store = player.usePlayerStore;
    act(() => {
      store.getState().playTrack(makeTrack({ durationMs: 200_000 }));
      store.setState({ durationMs: 200_000, positionMs: 60_000 });
      sleep.useSleepTimerStore.getState().set('endOfTrack');
    });
    act(() => store.getState().setIsPlaying(false));
    expect(sleep.useSleepTimerStore.getState().timer.kind).toBe('endOfTrack');
    act(() => store.setState({ isPlaying: true, positionMs: 199_500 }));
    act(() => store.getState().setIsPlaying(false));
    expect(sleep.useSleepTimerStore.getState().timer.kind).toBe('off');
    expect(native.setPauseAtEndOfTrack).toHaveBeenLastCalledWith(false);
  });
});

describe('audio output', () => {
  const speaker = { id: 2, type: 'speaker', name: 'Phone speaker' };
  const buds = { id: 7, type: 'bluetooth', name: 'Galaxy Buds' };

  it('MOB-OUT-001 refresh lists the connected outputs and the one in use', async () => {
    native.getOutputDevices.mockResolvedValueOnce([speaker, buds]);
    native.getOutputDevice.mockResolvedValueOnce(buds);
    const { output } = fresh();
    await output.useOutputStore.getState().refresh();
    expect(output.useOutputStore.getState()).toMatchObject({ devices: [speaker, buds], current: buds });
    expect(output.outputDetail(buds as never)).toBe('Bluetooth');
    expect(output.outputDetail(null)).toBe('Playing on this phone');
  });

  it('MOB-OUT-002 picking an output tells the player and is saved on the phone', async () => {
    const { output } = fresh();
    output.useOutputStore.getState().select(7);
    expect(native.setOutputDevice).toHaveBeenLastCalledWith(7);
    expect(output.useOutputStore.getState().preferredId).toBe(7);
    await waitFor(async () => expect(await AsyncStorage.getItem('sonare.outputDevice')).toBe('7'));
    output.useOutputStore.getState().select(-1);
    expect(native.setOutputDevice).toHaveBeenLastCalledWith(-1);
  });

  it('MOB-OUT-003 on start the saved pick is applied again, and device changes are followed', async () => {
    await AsyncStorage.setItem('sonare.outputDevice', '7');
    native.getOutputDevices.mockResolvedValue([speaker, buds]);
    native.getOutputDevice.mockResolvedValue(buds);
    const { output } = fresh();
    output.watchOutput();
    await waitFor(() => expect(native.setOutputDevice).toHaveBeenCalledWith(7));
    expect(output.useOutputStore.getState().preferredId).toBe(7);
    await waitFor(() => expect(output.useOutputStore.getState().current).toEqual(buds));

    // The buds disconnect: Android falls back to the speaker and says so.
    native.getOutputDevices.mockResolvedValue([speaker]);
    native.getOutputDevice.mockResolvedValue(speaker);
    emit('output', speaker);
    expect(output.useOutputStore.getState().current).toEqual(speaker);
    await waitFor(() => expect(output.useOutputStore.getState().devices).toEqual([speaker]));
  });

  it('MOB-OUT-004 nothing saved leaves the choice to Android', async () => {
    const { output } = fresh();
    output.watchOutput();
    await waitFor(() => expect(native.getOutputDevices).toHaveBeenCalled());
    expect(native.setOutputDevice).not.toHaveBeenCalled();
    expect(output.useOutputStore.getState().preferredId).toBe(-1);
  });
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
  it('MOB-SERVER-001 debug builds use localhost (adb reverse); addresses are tidied up or rejected', () => {
    const { config } = fresh();
    expect(config.DEFAULT_API_ORIGIN).toBe('http://localhost:3010');
    expect(config.apiOrigin()).toBe('http://localhost:3010');
    expect(config.apiBase()).toBe('http://localhost:3010/api/v1');
    expect(config.customServerOrigin()).toBeNull();
    expect(config.normalizeServerOrigin('192.168.1.20:3010')).toBe('http://192.168.1.20:3010');
    expect(config.normalizeServerOrigin(' HTTPS://api.example.com/api/v1/ ')).toBe('https://api.example.com');
    expect(config.normalizeServerOrigin('http://host:3010/')).toBe('http://host:3010');
    for (const bad of ['', '   ', 'ftp://x', 'http://', 'host:abc', 'http://a b']) {
      expect(config.normalizeServerOrigin(bad)).toBeNull();
    }
  });

  it('MOB-SERVER-002 a saved address is used for every request and survives a restart; reset goes back', async () => {
    let { config } = fresh();
    await config.setServerOrigin('http://192.168.1.20:3010');
    expect(config.apiBase()).toBe('http://192.168.1.20:3010/api/v1');
    expect(config.absoluteUrl('/api/v1/tracks/x/artwork')).toBe('http://192.168.1.20:3010/api/v1/tracks/x/artwork');
    expect(config.customServerOrigin()).toBe('http://192.168.1.20:3010');

    ({ config } = fresh());
    expect(config.apiOrigin()).toBe('http://localhost:3010');
    await config.loadServerOrigin();
    expect(config.apiOrigin()).toBe('http://192.168.1.20:3010');

    await config.setServerOrigin(null);
    expect(config.apiOrigin()).toBe('http://localhost:3010');
    expect(await AsyncStorage.getItem('sonare.serverOrigin')).toBeNull();
  });

  it('MOB-SERVER-003 the API client sends requests to the chosen server', async () => {
    const { config, api } = fresh();
    await config.setServerOrigin('http://10.1.1.5:3010');
    const opened: string[] = [];
    const open = XMLHttpRequest.prototype.open;
    jest.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (this: XMLHttpRequest, m, url) {
      opened.push(String(url));
      return open.call(this, m, url);
    });
    await api.api.genres().catch(() => {});
    expect(opened[0]).toBe('http://10.1.1.5:3010/api/v1/genres');
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
