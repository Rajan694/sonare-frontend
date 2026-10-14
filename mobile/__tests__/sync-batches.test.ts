import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

/** sync.ts keeps its queue in module state: every test loads its own copy. */
const fresh = (waiting: object[]) => {
  let mods!: {
    sync: typeof import('../src/data/sync');
    api: typeof import('../src/data/api');
    auth: typeof import('../src/data/auth');
    mode: typeof import('../src/store/mode');
  };
  jest.isolateModules(() => {
    mods = {
      sync: require('../src/data/sync'),
      api: require('../src/data/api'),
      auth: require('../src/data/auth'),
      mode: require('../src/store/mode'),
    };
  });
  mods.auth.useAuthStore.setState({
    status: 'signedIn',
    user: { id: 'u1', email: 'a@b.c', displayName: 'A' },
  } as never);
  mods.mode.useModeStore.setState({ mode: 'online' });
  return AsyncStorage.setItem('sonare.pendingPlays', JSON.stringify(waiting)).then(() => mods);
};

const stored = async () => JSON.parse((await AsyncStorage.getItem('sonare.pendingPlays')) ?? '[]');

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const play = (id: string, at: number) => ({ trackRef: { kind: 'server', id }, at, ms: 31_000, userId: 'u1' });

beforeEach(() => AsyncStorage.clear());

describe('play upload batches', () => {
  it('MOB-SYNC-001 a long offline stretch uploads in batches of at most 100 plays', async () => {
    const waiting = Array.from({ length: 250 }, (_, i) => play(`t${i}`, i + 1));
    const { sync, api } = await fresh(waiting);
    const sizes: number[] = [];
    const sent: string[] = [];
    jest.spyOn(api.api, 'reportPlays').mockImplementation(async (plays) => {
      sizes.push(plays.length);
      sent.push(...plays.map((p) => (p.trackRef as { id: string }).id));
      return { ok: true };
    });
    sync.requestSync();
    await waitFor(async () => expect(await stored()).toEqual([]));
    expect(sizes).toEqual([100, 100, 50]);
    expect(sent).toEqual(waiting.map((p) => p.trackRef.id));
  });

  it('MOB-SYNC-002 a refused batch is split: too large goes up in halves, and only the bad play is dropped', async () => {
    const ids = Array.from({ length: 8 }, (_, i) => (i === 5 ? 'bad' : `t${i}`));
    const { sync, api } = await fresh(ids.map((id, i) => play(id, i + 1)));
    const accepted: string[] = [];
    jest.spyOn(api.api, 'reportPlays').mockImplementation(async (plays) => {
      if (plays.length > 2) throw new api.ApiError('Too large', 413);
      const batch = plays.map((p) => (p.trackRef as { id: string }).id);
      if (batch.includes('bad')) throw new api.ApiError('Bad play', 400);
      accepted.push(...batch);
      return { ok: true };
    });
    sync.requestSync();
    await waitFor(async () => expect(await stored()).toEqual([]));
    expect(accepted).toEqual(ids.filter((id) => id !== 'bad'));
  });

  it('MOB-SYNC-003 a server error keeps only the plays not yet confirmed', async () => {
    const { sync, api } = await fresh(Array.from({ length: 150 }, (_, i) => play(`t${i}`, i + 1)));
    let calls = 0;
    jest.spyOn(api.api, 'reportPlays').mockImplementation(async () => {
      calls += 1;
      if (calls === 2) throw new api.ApiError('Down', 503);
      return { ok: true };
    });
    sync.requestSync();
    await waitFor(() => expect(calls).toBe(2));
    await waitFor(async () => expect((await stored()).map((p: any) => p.at)).toEqual(range(101, 150)));
  });

  it('MOB-SYNC-004 each uploaded play carries the song details the app had', async () => {
    let http!: typeof import('../src/data/http');
    let api!: typeof import('../src/data/api');
    jest.isolateModules(() => {
      http = require('../src/data/http');
      api = require('../src/data/api');
    });
    const send = jest.spyOn(http, 'httpRequest').mockResolvedValue({ status: 200, json: { ok: true } } as never);
    const meta = { title: 'A song', artist: 'Someone', artistId: 'yt:UC1' };
    await api.api.reportPlays([{ trackRef: { kind: 'server', id: 'abc' }, at: 1, ms: 31_000, meta } as never]);
    const body = JSON.parse(send.mock.calls[0][1]!.body as string);
    expect(body.plays).toEqual([{ trackRef: { kind: 'server', id: 'abc' }, at: 1, ms: 31_000, meta }]);
  });
});
