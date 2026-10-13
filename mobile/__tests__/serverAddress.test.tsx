import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from '../src/screens/Settings';
import { useAppUpdateStore } from '../src/store/appUpdate';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

let mockServerAddressEnabled = true;
jest.mock('../src/data/config', () => {
  const actual = jest.requireActual('../src/data/config');
  return {
    ...actual,
    get SERVER_ADDRESS_ENABLED() {
      return mockServerAddressEnabled;
    },
  };
});

/**
 * Settings → Server address is a development tool. Release builds (not __DEV__, not a dev
 * APK) hide the row and ignore an address saved by an earlier dev build.
 */

type ConfigModule = typeof import('../src/data/config');

const loadConfig = (dev: boolean): ConfigModule => {
  const g = globalThis as { __DEV__?: boolean };
  const before = g.__DEV__;
  g.__DEV__ = dev;
  let mod!: ConfigModule;
  jest.isolateModules(() => {
    mod = jest.requireActual('../src/data/config');
  });
  g.__DEV__ = before;
  return mod;
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('sonare.serverOrigin', 'http://192.168.1.20:3010');
});

it('MOB-SRV-001 a release build ignores a saved server address and uses the production API', async () => {
  const config = loadConfig(false);
  expect(config.SERVER_ADDRESS_ENABLED).toBe(false);
  await config.loadServerOrigin();
  expect(config.apiOrigin()).toBe('https://api.sonare.vip');
  expect(config.customServerOrigin()).toBeNull();
});

it('MOB-SRV-002 a development build loads the saved server address', async () => {
  const config = loadConfig(true);
  expect(config.SERVER_ADDRESS_ENABLED).toBe(true);
  await config.loadServerOrigin();
  expect(config.apiOrigin()).toBe('http://192.168.1.20:3010');
});

it('MOB-SRV-003 Settings shows the Server address row only in development builds', async () => {
  mockServerAddressEnabled = false;
  const release = render(<SettingsScreen />);
  // About's update check settles first, so its state change lands inside the test.
  await waitFor(() => expect(useAppUpdateStore.getState().status).not.toBe('checking'));
  expect(release.queryByLabelText('Server address')).toBeNull();
  expect(release.queryByText('Server')).toBeNull();
  release.unmount();

  mockServerAddressEnabled = true;
  const dev = render(<SettingsScreen />);
  await waitFor(() => expect(useAppUpdateStore.getState().status).not.toBe('checking'));
  expect(dev.getByLabelText('Server address')).toBeTruthy();
});
