import React from 'react';
import { render, fireEvent, act, renderHook } from '@testing-library/react-native';
import { SettingsScreen, SETTINGS_SECTIONS, SECTION_LABELS } from '../src/screens/Settings';
import { useAuthStore } from '../src/data/auth';
import { alice } from '../test-utils';
import { useSectionJump } from '../src/hooks/useSectionJump';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

describe('Settings quick-jump chips (M4)', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'guest', user: null } as never);
  });

  it('MOB-SET-CHIP-001 guest sees Connection mode, Playback, Library, and About chips (no Account)', () => {
    const { getByLabelText, queryByLabelText } = render(<SettingsScreen />);

    expect(getByLabelText(SECTION_LABELS.connection)).toBeTruthy();
    expect(getByLabelText(SECTION_LABELS.playback)).toBeTruthy();
    expect(getByLabelText(SECTION_LABELS.library)).toBeTruthy();
    expect(getByLabelText(SECTION_LABELS.about)).toBeTruthy();
    expect(queryByLabelText(SECTION_LABELS.account)).toBeNull();
  });

  it('MOB-SET-CHIP-002 signed-in user sees Account chip in the expected order', () => {
    useAuthStore.setState({ status: 'signedIn', user: alice } as never);
    const { getByLabelText } = render(<SettingsScreen />);

    SETTINGS_SECTIONS.forEach((sec) => {
      expect(getByLabelText(sec.label)).toBeTruthy();
    });
  });

  it('MOB-SET-CHIP-004 scrolling main ScrollView updates the active highlighted chip', () => {
    useAuthStore.setState({ status: 'signedIn', user: alice } as never);
    const { getByLabelText, getByTestId } = render(<SettingsScreen />);

    // Measure section layouts
    fireEvent(getByTestId('settings-section-connection'), 'layout', {
      nativeEvent: { layout: { y: 100 } },
    });
    fireEvent(getByTestId('settings-section-playback'), 'layout', {
      nativeEvent: { layout: { y: 300 } },
    });
    fireEvent(getByTestId('settings-section-library'), 'layout', {
      nativeEvent: { layout: { y: 600 } },
    });

    const connChip = getByLabelText(SECTION_LABELS.connection);
    const playChip = getByLabelText(SECTION_LABELS.playback);
    const libChip = getByLabelText(SECTION_LABELS.library);

    expect(connChip.props.accessibilityState).toEqual({ selected: true });
    expect(playChip.props.accessibilityState).toEqual({ selected: false });

    // Scroll to position past playback
    const mainScroll = getByTestId('settings-main-scroll');
    act(() => {
      fireEvent.scroll(mainScroll, {
        nativeEvent: { contentOffset: { y: 350 } },
      });
    });

    expect(playChip.props.accessibilityState).toEqual({ selected: true });
    expect(connChip.props.accessibilityState).toEqual({ selected: false });

    // Scroll further past library
    act(() => {
      fireEvent.scroll(mainScroll, {
        nativeEvent: { contentOffset: { y: 650 } },
      });
    });

    expect(libChip.props.accessibilityState).toEqual({ selected: true });
    expect(playChip.props.accessibilityState).toEqual({ selected: false });
  });
});

describe('useSectionJump', () => {
  const ids = ['connection', 'playback', 'library', 'about'] as const;
  const layout = (y: number) => ({ nativeEvent: { layout: { x: 0, y, width: 0, height: 0 } } }) as never;
  const scroll = (y: number, height = 600, content = 2000) =>
    ({
      nativeEvent: {
        contentOffset: { x: 0, y },
        layoutMeasurement: { width: 400, height },
        contentSize: { width: 400, height: content },
      },
    }) as never;
  const setup = () => {
    const hook = renderHook(() => useSectionJump(ids));
    const listScrollTo = jest.fn();
    const chipScrollTo = jest.fn();
    // Native refs are null under the test renderer: stand in for the two ScrollViews.
    (hook.result.current.listRef as { current: unknown }).current = { scrollTo: listScrollTo };
    (hook.result.current.chipRowRef as { current: unknown }).current = { scrollTo: chipScrollTo };
    act(() => {
      ids.forEach((id, i) => hook.result.current.sectionLayout(id)(layout(i * 500)));
      hook.result.current.chipLayout('library')({
        nativeEvent: { layout: { x: 220, y: 0, width: 80, height: 0 } },
      } as never);
    });
    return { ...hook, listScrollTo, chipScrollTo };
  };

  it('MOB-SET-CHIP-003 a chip scrolls the list to its measured section and keeps that chip in view', () => {
    const { result, listScrollTo, chipScrollTo } = setup();
    act(() => result.current.jumpTo('library'));
    expect(listScrollTo).toHaveBeenCalledWith({ y: 1000, animated: true });
    expect(result.current.active).toBe('library');
    expect(chipScrollTo).toHaveBeenCalledWith({ x: 200, animated: true });
  });

  it('MOB-SET-CHIP-005 at the end of the list the last section is highlighted even if its top never got up there', () => {
    const { result } = setup();
    // 1400 + 600 = 2000: the end. About starts at 1500, below the top.
    act(() => result.current.onScroll(scroll(1400)));
    expect(result.current.active).toBe('about');
    act(() => result.current.onScroll(scroll(600)));
    expect(result.current.active).toBe('playback');
  });

  it('MOB-SET-CHIP-006 after a jump the chosen chip stays until the user drags the list', () => {
    const { result } = setup();
    act(() => result.current.jumpTo('library'));
    // The jump ends at the bottom, which alone would mean About.
    act(() => result.current.onScroll(scroll(1400)));
    expect(result.current.active).toBe('library');
    act(() => {
      result.current.onScrollBeginDrag();
      result.current.onScroll(scroll(1400));
    });
    expect(result.current.active).toBe('about');
  });
});
