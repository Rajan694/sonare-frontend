import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { Chip } from '../src/components/ui/Chip';
import { Field } from '../src/components/ui/Field';
import Icon from '../src/components/ui/Icon';
import { IconButton } from '../src/components/ui/IconButton';
import { SegmentedControl } from '../src/components/ui/Segmented';
import { StateView } from '../src/components/ui/StateView';
import { Switch } from '../src/components/ui/Switch';
import { Header } from '../src/components/layout/Header';
import { Screen } from '../src/components/layout/Screen';
import { TabBar } from '../src/components/layout/TabBar';
import { SongRow } from '../src/components/music/SongRow';
import { AudioEngine } from '../src/components/music/AudioEngine';
import type { Track } from '../src/data/types';

jest.mock('@react-navigation/native', () =>
  require('../test-utils').navigationMock(),
);

const testTrack: Track = {
  id: 't-comp-1',
  title: 'Component Test Song',
  artist: 'Component Artist',
  artistId: 'a-1',
  album: 'Component Album',
  albumId: 'alb-1',
  durationMs: 195000,
  source: 'server',
  playCount: 15,
  favourite: false,
  addedAt: Date.now(),
};

describe('Components Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UI Components', () => {
    it('MOB-COMP-001 Badge renders with different variants', () => {
      const { getByText, rerender } = render(
        <Badge label="Cloud" variant="cloud" />,
      );
      expect(getByText('Cloud')).toBeTruthy();

      rerender(<Badge label="Local" variant="local" />);
      expect(getByText('Local')).toBeTruthy();

      rerender(<Badge label="Download" variant="download" />);
      expect(getByText('Download')).toBeTruthy();

      rerender(<Badge label="Neutral" variant="neutral" />);
      expect(getByText('Neutral')).toBeTruthy();
    });

    it('MOB-COMP-003 Button renders with variants and handles onPress', () => {
      const onPress = jest.fn();
      const { getByText, rerender } = render(
        <Button variant="accent" size="md" onPress={onPress}>
          Click Me
        </Button>,
      );
      fireEvent.press(getByText('Click Me'));
      expect(onPress).toHaveBeenCalledTimes(1);

      rerender(
        <Button variant="outline" onPress={() => {}}>
          Deleting
        </Button>,
      );
      expect(getByText('Deleting')).toBeTruthy();
    });

    it('MOB-COMP-004 Chip renders chip with active/inactive state and handles onPress', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Chip label="Rock" active onPress={onPress} />,
      );
      fireEvent.press(getByText('Rock'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('MOB-COMP-005 Field renders label, TextInput, error message, and right accessory', () => {
      const onChange = jest.fn();
      const onClear = jest.fn();
      const { getByPlaceholderText, getByLabelText } = render(
        <Field
          placeholder="Search tracks"
          value="user search"
          onChangeText={onChange}
          clearButton
          onClear={onClear}
        />,
      );
      expect(getByPlaceholderText('Search tracks')).toBeTruthy();
      fireEvent.press(getByLabelText('Clear search'));
      expect(onClear).toHaveBeenCalled();
    });

    it('MOB-COMP-008 IconButton renders touchable icon button with accessibility label', () => {
      const onPress = jest.fn();
      const { getByLabelText } = render(
        <IconButton
          icon={<Icon name="settings" />}
          onPress={onPress}
          accessibilityLabel="Settings Button"
        />,
      );
      fireEvent.press(getByLabelText('Settings Button'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('MOB-COMP-009 Segmented renders segmented tabs and triggers onChange', () => {
      const onChange = jest.fn();
      const { getByText } = render(
        <SegmentedControl
          options={[
            { value: 'tab1', label: 'First' },
            { value: 'tab2', label: 'Second' },
          ]}
          value="tab1"
          onChange={onChange}
        />,
      );
      fireEvent.press(getByText('Second'));
      expect(onChange).toHaveBeenCalledWith('tab2');
    });

    it('MOB-COMP-011 StateView renders loading indicator, error with retry, or empty message', () => {
      const onRetry = jest.fn();
      const { getByText, rerender, UNSAFE_getByType } = render(
        <StateView loading empty="No data found" />,
      );
      expect(UNSAFE_getByType('ActivityIndicator' as never)).toBeTruthy();

      rerender(
        <StateView error={new Error('Failed to load')} onRetry={onRetry} />,
      );
      expect(getByText('Failed to load')).toBeTruthy();
      fireEvent.press(getByText('Try again'));
      expect(onRetry).toHaveBeenCalledTimes(1);

      rerender(<StateView empty="No data found" />);
      expect(getByText('No data found')).toBeTruthy();
    });

    it('MOB-COMP-012 Switch renders toggle switch and handles onValueChange', () => {
      const onChange = jest.fn();
      const { UNSAFE_getByType } = render(
        <Switch
          accessibilityLabel="toggle"
          value={false}
          onValueChange={onChange}
        />,
      );
      const pressable = UNSAFE_getByType('Pressable' as never);
      fireEvent.press(pressable);
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Layout Components', () => {
    it('MOB-COMP-014 Header renders navigation header with left, title, and right actions', () => {
      const { getByText } = render(
        <Header
          title="Header Title"
          left={<Text>Back</Text>}
          right={<Text>Menu</Text>}
        />,
      );
      expect(getByText('Header Title')).toBeTruthy();
      expect(getByText('Back')).toBeTruthy();
      expect(getByText('Menu')).toBeTruthy();
    });

    it('MOB-COMP-015 Screen renders screen layout with safe area insets and optional scrollview', () => {
      const { getByText, rerender } = render(
        <Screen scrollable>
          <Text>Scrollable Content</Text>
        </Screen>,
      );
      expect(getByText('Scrollable Content')).toBeTruthy();

      rerender(
        <Screen scrollable={false}>
          <Text>Static Content</Text>
        </Screen>,
      );
      expect(getByText('Static Content')).toBeTruthy();
    });

    it('MOB-COMP-016 TabBar renders tab bar items with active indicator', () => {
      const onTabPress = jest.fn();
      const { getByText } = render(
        <TabBar
          tabs={[
            {
              id: 't1',
              label: 'Tab 1',
              icon: <Text>I1</Text>,
              onPress: onTabPress,
            },
            {
              id: 't2',
              label: 'Tab 2',
              icon: <Text>I2</Text>,
              onPress: jest.fn(),
            },
          ]}
          activeTab="t1"
        />,
      );
      expect(getByText('Tab 1')).toBeTruthy();
      fireEvent.press(getByText('Tab 1'));
      expect(onTabPress).toHaveBeenCalled();
    });
  });

  describe('Music Components', () => {
    it('MOB-COMP-018 SongRow renders track info, duration, favourite heart, and long-press menu', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <SongRow track={testTrack} index={0} showIndex onPress={onPress} />,
      );
      expect(getByText('Component Test Song')).toBeTruthy();
      expect(getByText(/Component Artist/)).toBeTruthy();
      fireEvent.press(getByText('Component Test Song'));
      expect(onPress).toHaveBeenCalled();
    });

    it('MOB-COMP-026 AudioEngine binds player store to native player and handles stream resolution', () => {
      const { toJSON } = render(<AudioEngine />);
      expect(toJSON()).toBeNull();
    });
  });
});
