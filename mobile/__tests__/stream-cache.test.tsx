import React from 'react';
import { NativeModules } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from '../src/screens/Settings';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const native = NativeModules.SonarePlayer as { streamCacheBytes: jest.Mock; clearStreamCache: jest.Mock };

beforeEach(() => {
  useAuthStore.setState({ status: 'guest', user: null } as never);
  useModeStore.setState({ mode: 'online' });
});

describe('stream cache', () => {
  it('MOB-CACHE-001 Settings shows how much the stream cache holds and Clear empties it', async () => {
    native.streamCacheBytes.mockResolvedValueOnce(123_400_000);
    native.clearStreamCache.mockResolvedValueOnce(0);
    const { findByText, getByLabelText } = render(<SettingsScreen />);
    expect(await findByText('123.4 MB of 300 MB · songs you played recently')).toBeTruthy();
    fireEvent.press(getByLabelText('Clear stream cache'));
    await waitFor(() => expect(native.clearStreamCache).toHaveBeenCalled());
    expect(await findByText('Empty · songs you played recently')).toBeTruthy();
  });
});
