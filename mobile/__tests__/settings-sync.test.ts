import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { waitFor } from '@testing-library/react-native';

/** settings.ts keeps what's waiting for the account in module state: every test loads its own copy. */
const fresh = () => {
  let mods!: {
    settings: typeof import('../src/data/settings');
    api: typeof import('../src/data/api');
    auth: typeof import('../src/data/auth');
  };
  jest.isolateModules(() => {
    mods = {
      settings: require('../src/data/settings'),
      api: require('../src/data/api'),
      auth: require('../src/data/auth'),
    };
  });
  return mods;
};

const signIn = (auth: typeof import('../src/data/auth'), id = 'u1') =>
  auth.useAuthStore.setState({ status: 'signedIn', user: { id, email: 'a@b.c', displayName: 'A' } } as never);

beforeEach(() => AsyncStorage.clear());

describe('settings on the phone and in the account', () => {
  it('MOB-SETS-001 starts from the shared defaults', () => {
    const { settings } = fresh();
    expect(settings.useSettingsStore.getState()).toMatchObject({
      eqPreset: 'Sonare',
      gapless: true,
      normalization: true,
      stayOffline: false,
      streamQuality: 'high',
    });
  });

  it('MOB-SETS-002 a change made offline reaches the account when the network is back', async () => {
    const { settings, api, auth } = fresh();
    signIn(auth);
    let up = false;
    const bodies: unknown[] = [];
    jest.spyOn(api.api, 'settings').mockImplementation(async () => {
      if (!up) throw new Error('offline');
      return {};
    });
    jest.spyOn(api.api, 'saveSettings').mockImplementation(async (body) => {
      if (!up) throw new Error('offline');
      bodies.push(body);
      return { ok: true };
    });
    let onNetwork: (s: object) => void = () => {};
    (NetInfo.addEventListener as jest.Mock).mockImplementation((fn) => {
      onNetwork = fn;
      return jest.fn();
    });
    await settings.useSettingsStore.getState().hydrate();
    settings.useSettingsStore.getState().update({ downloadFormat: 'm4a' });
    await new Promise((r) => setTimeout(r, 500));
    expect(bodies).toHaveLength(0);

    onNetwork({ isConnected: false, isInternetReachable: false });
    up = true;
    onNetwork({ isConnected: true, isInternetReachable: true });
    await waitFor(() => expect(bodies).toEqual([{ downloadFormat: 'm4a' }]));
  });

  it("MOB-SETS-003 a guest's changes go to the account on sign-in and win over the account's copy", async () => {
    const { settings, api, auth } = fresh();
    auth.useAuthStore.setState({ status: 'guest', user: null } as never);
    settings.useSettingsStore.getState().update({ normalization: false });
    const save = jest.spyOn(api.api, 'saveSettings').mockResolvedValue({ ok: true });
    jest.spyOn(api.api, 'settings').mockResolvedValue({ eqPreset: 'Bass', normalization: true });
    signIn(auth);
    await settings.useSettingsStore.getState().hydrate();
    expect(settings.useSettingsStore.getState()).toMatchObject({ eqPreset: 'Bass', normalization: false });
    expect(save).toHaveBeenCalledWith({ normalization: false });
  });

  it('MOB-SETS-004 changes waiting for one account are not sent to another', async () => {
    await AsyncStorage.setItem(
      'sonare.settingsUnsynced',
      JSON.stringify({ userId: 'someone-else', changes: { streamQuality: 'low' } }),
    );
    const { settings, api, auth } = fresh();
    const save = jest.spyOn(api.api, 'saveSettings').mockResolvedValue({ ok: true });
    jest.spyOn(api.api, 'settings').mockResolvedValue({ streamQuality: 'high' });
    signIn(auth);
    await settings.useSettingsStore.getState().hydrate();
    expect(save).not.toHaveBeenCalled();
    expect(settings.useSettingsStore.getState().streamQuality).toBe('high');
  });
});
