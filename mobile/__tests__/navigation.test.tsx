import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { openInCurrentTab } from '../src/navigation/openInCurrentTab';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { TabNavigator } from '../src/navigation/TabNavigator';
import { navigationRef, requireAccount } from '../src/data/accountGate';
import { useLibraryStore } from '../src/store/library';
import { useDownloadsStore } from '../src/store/downloads';
import { useSettingsStore } from '../src/data/settings';
import { useAuthStore } from '../src/data/auth';
import { useModeStore } from '../src/store/mode';
import { NavigationContainer } from '@react-navigation/native';

const mockDefaultTheme = {
  dark: true,
  colors: {
    primary: '#00E28A',
    background: '#060607',
    card: '#060607',
    text: '#ffffff',
    border: '#1A1A1F',
    notification: '#00E28A',
  },
  fonts: {
    regular: { fontFamily: '', fontWeight: 'normal' },
    medium: { fontFamily: '', fontWeight: '500' },
    bold: { fontFamily: '', fontWeight: 'bold' },
    heavy: { fontFamily: '', fontWeight: '900' },
  },
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const { BaseNavigationContainer } = jest.requireActual('@react-navigation/core');
  const mockLinking = actual.LinkingContext;
  const mockR = require('react');

  const mockNavContainer = mockR.forwardRef((props: any, ref: any) => {
    return mockR.createElement(
      mockLinking.Provider,
      { value: { options: undefined } },
      mockR.createElement(BaseNavigationContainer, {
        ...props,
        theme: props.theme || mockDefaultTheme,
        ref,
      }),
    );
  });
  return {
    ...actual,
    NavigationContainer: mockNavContainer,
  };
});

/**
 * The real bottom-tab navigator takes a web-only code path under this Jest setup (it touches
 * `document`), so it is replaced by a minimal one: the active tab's screen plus one pressable
 * per tab, coloured with the navigator's tint options. That keeps Sonare's own tab setup -
 * which tabs, in what order, which screen each opens, mode colours - under test.
 */
jest.mock('@react-navigation/bottom-tabs', () => {
  const R = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children, screenOptions }: any) => {
        const screens = R.Children.toArray(children);
        const [active, setActive] = R.useState(0);
        const Active = screens[active].props.component;
        return R.createElement(
          'View',
          null,
          R.createElement(Active, null),
          ...screens.map((screen: any, i: number) =>
            R.createElement('Pressable', {
              key: screen.props.name,
              accessible: true,
              accessibilityRole: 'tab',
              accessibilityLabel: screen.props.name,
              accessibilityState: { selected: i === active },
              tintColor: i === active ? screenOptions.tabBarActiveTintColor : screenOptions.tabBarInactiveTintColor,
              onPress: () => setActive(i),
            }),
          ),
        );
      },
      Screen: () => null,
    }),
  };
});

describe('Navigation Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openInCurrentTab.ts', () => {
    it('MOB-NAV-001 navigates to target screen within active tab', () => {
      jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
      jest.spyOn(navigationRef, 'getRootState').mockReturnValue({
        routes: [
          {
            name: 'Tabs',
            state: {
              index: 1,
              routes: [{ name: 'Home' }, { name: 'Library' }, { name: 'Playlists' }, { name: 'Search' }],
            } as any,
          },
        ],
      } as any);
      const navSpy = jest.spyOn(navigationRef as any, 'navigate').mockImplementation(() => {});

      openInCurrentTab('Album', { id: 'alb-1' });
      expect(navSpy).toHaveBeenCalledWith('Tabs', {
        screen: 'Library',
        params: { screen: 'Album', params: { id: 'alb-1' } },
      });
    });

    it('MOB-NAV-002 defaults to Home tab if root state has no active tab', () => {
      jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
      jest.spyOn(navigationRef, 'getRootState').mockReturnValue({ routes: [] } as any);
      const navSpy = jest.spyOn(navigationRef as any, 'navigate').mockImplementation(() => {});

      openInCurrentTab('Settings');
      expect(navSpy).toHaveBeenCalledWith('Tabs', {
        screen: 'Home',
        params: { screen: 'Settings', params: undefined },
      });
    });
  });

  describe('RootNavigator.tsx', () => {
    // The real start-up reads the saved session and downloads; these tests set the state.
    beforeEach(() => {
      useAuthStore.setState({ hydrate: jest.fn() } as never);
      useDownloadsStore.setState({ hydrate: jest.fn(async () => {}) } as never);
    });
    afterEach(() => jest.useRealTimers());

    it('MOB-NAV-003 shows only a spinner while the saved session is being read', () => {
      useAuthStore.setState({ status: 'loading' });
      const load = jest.spyOn(useLibraryStore.getState(), 'load');
      const { UNSAFE_getByType, queryAllByRole } = render(<RootNavigator />);
      expect(UNSAFE_getByType('ActivityIndicator' as never)).toBeTruthy();
      expect(queryAllByRole('tab')).toHaveLength(0);
      expect(load).not.toHaveBeenCalled();
    });

    it('MOB-NAV-004 signing in loads the library, then finishes what the guest was doing', async () => {
      const load = jest.spyOn(useLibraryStore.getState(), 'load').mockResolvedValue();
      const reset = jest.spyOn(useLibraryStore.getState(), 'reset');
      const hydrate = jest.spyOn(useSettingsStore.getState(), 'hydrate').mockResolvedValue();
      jest.spyOn(navigationRef, 'isReady').mockReturnValue(false);
      useAuthStore.setState({ status: 'guest', user: null } as never);
      const liked = jest.fn();
      requireAccount('Create a free account to save songs you love.', liked);
      const { getByRole } = render(<RootNavigator />);
      expect(getByRole('tab', { name: 'Home' })).toBeTruthy();
      expect(reset).toHaveBeenCalled();
      expect(hydrate).toHaveBeenCalledTimes(1);
      expect(liked).not.toHaveBeenCalled();

      await act(async () => {
        useAuthStore.setState({
          status: 'signedIn',
          user: { id: 'u1', email: 'a@b.co', displayName: 'A', role: 'user' },
        } as never);
      });
      expect(load).toHaveBeenCalled();
      expect(hydrate).toHaveBeenCalledTimes(2);
      expect(liked).toHaveBeenCalledTimes(1);
    });

    it('MOB-NAV-005 a mode change shows a toast that goes away after a few seconds', () => {
      jest.useFakeTimers();
      useAuthStore.setState({ status: 'guest' });
      useModeStore.setState({ mode: 'online' });
      const { getByText, queryByText } = render(<RootNavigator />);
      act(() => {
        useModeStore.getState().setMode('offline', {
          title: 'No internet connection',
          description: 'Showing music on this phone',
        });
      });
      expect(getByText('No internet connection')).toBeTruthy();
      expect(getByText('Showing music on this phone')).toBeTruthy();
      act(() => jest.advanceTimersByTime(4000));
      expect(queryByText('No internet connection')).toBeNull();
      act(() => useModeStore.getState().setMode('online'));
      expect(getByText('Switched to Online Mode')).toBeTruthy();
    });
  });

  describe('TabNavigator.tsx', () => {
    const renderTabs = () =>
      render(
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>,
      );
    const tabs = (r: ReturnType<typeof renderTabs>) => r.getAllByRole('tab').map((t) => t.props.accessibilityLabel);

    it('MOB-NAV-006 shows Home, Library, Playlists and Search, starts on Home, and switches on press', () => {
      useAuthStore.setState({ status: 'guest', user: null } as never);
      const r = renderTabs();
      expect(tabs(r)).toEqual(['Home', 'Library', 'Playlists', 'Search']);
      expect(r.getByText('Welcome to Sonare')).toBeTruthy();
      fireEvent.press(r.getByRole('tab', { name: 'Library' }));
      expect(r.getByRole('tab', { name: 'Library' }).props.accessibilityState.selected).toBe(true);
      expect(r.getByText('Your library lives in your account')).toBeTruthy();
    });

    it('MOB-NAV-007 the active tab is green online and gold offline', () => {
      useModeStore.setState({ mode: 'online' });
      const online = renderTabs();
      expect(online.getByRole('tab', { name: 'Home' }).props.tintColor).toBe('#00E28A');
      expect(online.getByRole('tab', { name: 'Search' }).props.tintColor).toBe('#7E7E8C');
      online.unmount();
      useModeStore.setState({ mode: 'offline' });
      expect(renderTabs().getByRole('tab', { name: 'Home' }).props.tintColor).toBe('#FFC24D');
    });
  });
});
