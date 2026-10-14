import React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { api } from '../src/data/api';
import { useModeStore } from '../src/store/mode';
import { resetAppUpdateForTesting, useAppUpdateStore } from '../src/store/appUpdate';
import { SettingsScreen } from '../src/screens/Settings';
import type { AppRelease } from '../src/data/types';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const { mockSonareUpdatesNative: native } = require('../jest.setup');

/** This APK is 1.0.1 (jest.setup's SonareBuild). */
const apk = (over: Partial<AppRelease> = {}): AppRelease => ({
  id: 'rel-1',
  platform: 'android',
  format: 'apk',
  version: '1.0.2',
  fileName: 'sonare-1.0.2-android-arm64.apk',
  sizeBytes: 50 * 1024 * 1024,
  sha256: 'ABC123',
  notes: 'Faster start',
  uploadedAt: '2026-10-11T00:00:00Z',
  ...over,
});

const uploaded = (items: AppRelease[]) => jest.spyOn(api, 'releases').mockResolvedValue({ items });

beforeEach(async () => {
  jest.clearAllMocks();
  resetAppUpdateForTesting();
  await AsyncStorage.clear();
  useModeStore.setState({ mode: 'online' } as never);
  native.status.mockResolvedValue({ state: 'running', bytes: 0, total: 100 });
  native.checksum.mockResolvedValue('');
});

afterEach(() => {
  resetAppUpdateForTesting();
  jest.restoreAllMocks();
});

describe('app updates on Android', () => {
  it('MOB-UPD-001 only a newer APK is an update; other platforms and older builds are not', async () => {
    uploaded([apk({ version: '1.0.1' }), apk({ id: 'w', platform: 'windows', format: 'exe', version: '9.0.0' })]);
    await act(() => useAppUpdateStore.getState().check());
    expect(useAppUpdateStore.getState().status).toBe('current');

    uploaded([apk({ version: '1.0' }), apk({ id: 'new', version: '1.1.0' })]);
    await act(() => useAppUpdateStore.getState().check());
    expect(useAppUpdateStore.getState()).toMatchObject({ status: 'available', release: { id: 'new' } });
  });

  it('MOB-UPD-002 the download is followed to the end, checked against the upload, then installed', async () => {
    uploaded([apk()]);
    await act(() => useAppUpdateStore.getState().check());
    native.status.mockResolvedValueOnce({ state: 'running', bytes: 25, total: 100 });
    await act(() => useAppUpdateStore.getState().download());
    expect(native.download).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/releases\/rel-1\/download$/),
      'sonare-1.0.2-android-arm64.apk',
      'Sonare 1.0.2',
    );
    await waitFor(() => expect(useAppUpdateStore.getState().progress).toBe(0.25));
    expect(useAppUpdateStore.getState().status).toBe('downloading');

    native.status.mockResolvedValue({ state: 'done', bytes: 100, total: 100 });
    native.checksum.mockResolvedValue('abc123');
    await waitFor(() => expect(useAppUpdateStore.getState().status).toBe('downloaded'));
    expect(await useAppUpdateStore.getState().install()).toBe('started');
    expect(native.install).toHaveBeenCalledWith(7);
  });

  it('MOB-UPD-003 a download that does not match the uploaded file is removed', async () => {
    uploaded([apk()]);
    await act(() => useAppUpdateStore.getState().check());
    native.status.mockResolvedValue({ state: 'done', bytes: 100, total: 100 });
    native.checksum.mockResolvedValue('something-else');
    await act(() => useAppUpdateStore.getState().download());
    await waitFor(() => expect(useAppUpdateStore.getState().status).toBe('error'));
    expect(useAppUpdateStore.getState().error).toMatch(/doesn't match/);
    expect(native.remove).toHaveBeenCalledWith(7);
  });

  it('MOB-UPD-004 a finished download from before a restart is offered for install straight away', async () => {
    await AsyncStorage.setItem('sonare.updateDownload', JSON.stringify({ id: 42, releaseId: 'rel-1' }));
    uploaded([apk()]);
    native.status.mockResolvedValue({ state: 'done', bytes: 100, total: 100 });
    native.checksum.mockResolvedValue('abc123');
    await act(() => useAppUpdateStore.getState().check());
    expect(useAppUpdateStore.getState()).toMatchObject({ status: 'downloaded', downloadId: 42 });
    expect(native.download).not.toHaveBeenCalled();
  });

  it("MOB-UPD-005 Settings → About shows the version, the update, what's new and, once allowed, installs it", async () => {
    uploaded([apk()]);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText, findByText } = render(<SettingsScreen />);
    expect(getByText('Version 1.0.1')).toBeTruthy();
    expect(await findByText('Sonare 1.0.2 is available')).toBeTruthy();
    expect(getByText("50.0 MB · Tap to see what's new")).toBeTruthy();

    // The changes open in a sheet, which can start the download too.
    fireEvent.press(getByText("What's new"));
    expect(await findByText("What's new in Sonare 1.0.2")).toBeTruthy();
    expect(getByText('Faster start')).toBeTruthy();
    fireEvent.press(getByText('Later'));

    native.status.mockResolvedValue({ state: 'done', bytes: 100, total: 100 });
    native.checksum.mockResolvedValue('abc123');
    fireEvent.press(getByText('Download'));
    expect(await findByText('Sonare 1.0.2 is downloaded')).toBeTruthy();

    // The first time, Android sends the user to allow installing from Sonare.
    native.install.mockResolvedValueOnce('permission');
    fireEvent.press(getByText('Install'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Allow Sonare to install the update', expect.any(String)));
  });

  it('MOB-UPD-006 Offline mode does not check', async () => {
    const releases = uploaded([apk()]);
    useModeStore.setState({ mode: 'offline' } as never);
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Updates need Online mode')).toBeTruthy();
    expect(releases).not.toHaveBeenCalled();
  });
});
