import React from 'react';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useSpatialStore } from '../src/store/spatial';
import { SonarePlayer } from '../src/native/SonarePlayer';
import { AudioEngine } from '../src/components/music/AudioEngine';
import { SpatialAudioSection } from '../src/components/spatial/SpatialAudioSection';
import { DEFAULT_SPATIAL, SPATIAL_PRESETS, resolveSpatial, toPolar } from '../../shared/spatial';

const native = NativeModules.SonarePlayer as Record<string, jest.Mock>;

describe('Spatial Audio Mobile', () => {
  beforeEach(() => {
    act(() => {
      useSpatialStore.setState({
        ...DEFAULT_SPATIAL,
        bypass: false,
      });
    });
    jest.clearAllMocks();
  });

  it('MOB-SPATIAL-001 spatial store initializes with default disabled state and concert preset', () => {
    const state = useSpatialStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.mode).toBe('presets');
    expect(state.preset).toBe('concert');
    expect(state.bypass).toBe(false);
    expect(state.custom).toEqual({
      x: 0,
      y: 0.4,
      width: 60,
      intensity: 70,
      ambience: 30,
    });
  });

  it('MOB-SPATIAL-002 hydrate loads saved spatial settings from AsyncStorage and sanitizes invalid values', async () => {
    const validSaved = {
      enabled: true,
      mode: 'custom',
      preset: 'cafe',
      custom: { x: 0.3, y: 0.4, width: 85, intensity: 75, ambience: 45 },
    };
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(JSON.stringify(validSaved));

    await act(async () => {
      await useSpatialStore.getState().hydrate();
    });

    let state = useSpatialStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.mode).toBe('custom');
    expect(state.preset).toBe('cafe');
    expect(state.custom.x).toBeCloseTo(0.3);
    expect(state.custom.y).toBeCloseTo(0.4);

    // Corrupted / invalid values in AsyncStorage
    const invalidSaved = {
      enabled: false,
      mode: 'alien-mode',
      preset: 'stadium',
      custom: { x: 99, y: 99, width: 250, intensity: -50, ambience: 300 },
    };
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(JSON.stringify(invalidSaved));

    await act(async () => {
      await useSpatialStore.getState().hydrate();
    });

    state = useSpatialStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.mode).toBe('presets');
    expect(state.preset).toBe('concert');
    expect(Math.hypot(state.custom.x, state.custom.y)).toBeLessThanOrEqual(1.001);
    expect(state.custom.width).toBeLessThanOrEqual(100);
    expect(state.custom.intensity).toBeGreaterThanOrEqual(0);
    expect(state.custom.ambience).toBeLessThanOrEqual(100);

    // Storage failure handles gracefully
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage failure'));
    await expect(useSpatialStore.getState().hydrate()).resolves.toBeUndefined();
  });

  it('MOB-SPATIAL-003 setEnabled updates state and persists to AsyncStorage', () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    setItemSpy.mockClear();

    act(() => {
      useSpatialStore.getState().setEnabled(true);
    });
    expect(useSpatialStore.getState().enabled).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith('sonare.spatial', expect.stringContaining('"enabled":true'));

    act(() => {
      useSpatialStore.getState().setEnabled(false);
    });
    expect(useSpatialStore.getState().enabled).toBe(false);
    expect(setItemSpy).toHaveBeenCalledWith('sonare.spatial', expect.stringContaining('"enabled":false'));
  });

  it('MOB-SPATIAL-004 setMode switches between presets and custom stage and persists', () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    setItemSpy.mockClear();

    act(() => {
      useSpatialStore.getState().setMode('custom');
    });
    expect(useSpatialStore.getState().mode).toBe('custom');
    expect(setItemSpy).toHaveBeenCalledWith('sonare.spatial', expect.stringContaining('"mode":"custom"'));

    act(() => {
      useSpatialStore.getState().setMode('presets');
    });
    expect(useSpatialStore.getState().mode).toBe('presets');
    expect(setItemSpy).toHaveBeenCalledWith('sonare.spatial', expect.stringContaining('"mode":"presets"'));
  });

  it('MOB-SPATIAL-005 setPreset updates active preset and persists', () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    setItemSpy.mockClear();

    act(() => {
      useSpatialStore.getState().setPreset('hall');
    });
    expect(useSpatialStore.getState().preset).toBe('hall');
    expect(setItemSpy).toHaveBeenCalledWith('sonare.spatial', expect.stringContaining('"preset":"hall"'));

    act(() => {
      useSpatialStore.getState().setPreset('cafe');
    });
    expect(useSpatialStore.getState().preset).toBe('cafe');
    expect(setItemSpy).toHaveBeenCalledWith('sonare.spatial', expect.stringContaining('"preset":"cafe"'));
  });

  it('MOB-SPATIAL-006 setCustom updates custom stage coordinates and sliders with bounds clamping and resetCustom restores defaults', () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    setItemSpy.mockClear();

    // Out of bounds values get clamped
    act(() => {
      useSpatialStore.getState().setCustom({
        x: 2.0,
        y: 0,
        width: 150,
        intensity: -10,
        ambience: 120,
      });
    });

    const custom = useSpatialStore.getState().custom;
    expect(custom.x).toBeCloseTo(1.0);
    expect(custom.y).toBeCloseTo(0.0);
    expect(custom.width).toBe(100);
    expect(custom.intensity).toBe(0);
    expect(custom.ambience).toBe(100);
    expect(setItemSpy).toHaveBeenCalled();

    // Without commit
    setItemSpy.mockClear();
    act(() => {
      useSpatialStore.getState().setCustom({ width: 70 }, false);
    });
    expect(useSpatialStore.getState().custom.width).toBe(70);
    expect(setItemSpy).not.toHaveBeenCalled();

    // resetCustom restores defaults and persists
    act(() => {
      useSpatialStore.getState().resetCustom();
    });
    expect(useSpatialStore.getState().custom).toEqual(DEFAULT_SPATIAL.custom);
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('MOB-SPATIAL-007 setBypass toggles temporary bypass in memory without persisting to AsyncStorage', () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    setItemSpy.mockClear();

    act(() => {
      useSpatialStore.getState().setBypass(true);
    });
    expect(useSpatialStore.getState().bypass).toBe(true);
    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      useSpatialStore.getState().setBypass(false);
    });
    expect(useSpatialStore.getState().bypass).toBe(false);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('MOB-SPATIAL-008 AudioEngine pushes initial spatial settings on mount', () => {
    native.setSpatialAudio.mockClear();
    render(<AudioEngine />);

    expect(native.setSpatialAudio).toHaveBeenCalled();
    const lastCall = native.setSpatialAudio.mock.calls[native.setSpatialAudio.mock.calls.length - 1][0];
    expect(lastCall).toHaveProperty('active');
    expect(lastCall).toHaveProperty('gDir');
    expect(lastCall).toHaveProperty('gRev');
    expect(lastCall).toHaveProperty('gEr');
    expect(lastCall).toHaveProperty('distance');
    expect(lastCall).toHaveProperty('azimuth');
  });

  it('MOB-SPATIAL-009 AudioEngine forwards updated spatial store changes to SonarePlayer using headModel renderer', () => {
    native.setSpatialAudio.mockClear();

    // Enable spatial audio with concert preset
    act(() => {
      useSpatialStore.getState().setEnabled(true);
      useSpatialStore.getState().setPreset('concert');
      useSpatialStore.getState().setBypass(false);
    });

    expect(native.setSpatialAudio).toHaveBeenLastCalledWith(
      expect.objectContaining({
        active: true,
        roomId: 'stage',
      }),
    );

    // Switch to Cathedral Hall preset
    act(() => {
      useSpatialStore.getState().setPreset('hall');
    });

    expect(native.setSpatialAudio).toHaveBeenLastCalledWith(
      expect.objectContaining({
        active: true,
        roomId: 'hall',
        rt60High: 1.1,
      }),
    );

    // Bypass temporarily disables spatial processing
    act(() => {
      useSpatialStore.getState().setBypass(true);
    });

    expect(native.setSpatialAudio).toHaveBeenLastCalledWith(
      expect.objectContaining({
        active: false,
      }),
    );

    // Un-bypass restores spatial processing
    act(() => {
      useSpatialStore.getState().setBypass(false);
    });

    expect(native.setSpatialAudio).toHaveBeenLastCalledWith(
      expect.objectContaining({
        active: true,
      }),
    );
  });

  it('MOB-SPATIAL-010 SonarePlayer.setSpatialAudio delegates to NativeModules.SonarePlayer.setSpatialAudio', () => {
    native.setSpatialAudio.mockClear();

    const params = resolveSpatial(
      {
        enabled: true,
        mode: 'presets',
        preset: 'cafe',
        custom: DEFAULT_SPATIAL.custom,
      },
      { renderer: 'headModel' },
    );

    SonarePlayer.setSpatialAudio(params);
    expect(native.setSpatialAudio).toHaveBeenCalledWith(params);
  });

  it('MOB-SPATIAL-011 SpatialAudioSection renders title, badges, enabled switch, and dimmed content when disabled', () => {
    act(() => {
      useSpatialStore.setState({
        ...DEFAULT_SPATIAL,
        enabled: false,
        mode: 'presets',
        bypass: false,
      });
    });

    const { getByText, getByLabelText } = render(<SpatialAudioSection />);

    expect(getByText('Spatial audio')).toBeTruthy();
    expect(getByText('Stereo Stage')).toBeTruthy();
    expect(getByText('Headphones')).toBeTruthy();

    const switchToggle = getByLabelText('Spatial audio enabled');
    expect(switchToggle.props.accessibilityState.checked).toBe(false);

    // Toggle switch to enable
    fireEvent.press(switchToggle);
    expect(useSpatialStore.getState().enabled).toBe(true);
  });

  it('MOB-SPATIAL-012 SpatialPresetCard renders preset metadata and handles selection', () => {
    act(() => {
      useSpatialStore.setState({
        ...DEFAULT_SPATIAL,
        enabled: true,
        mode: 'presets',
        preset: 'concert',
      });
    });

    const { getByText, getByLabelText } = render(<SpatialAudioSection />);

    // Names, descriptions and decay times are the ones the audio uses.
    expect(getByText('Concert')).toBeTruthy();
    expect(getByText('1.5 s decay')).toBeTruthy();
    expect(getByText(SPATIAL_PRESETS.concert.description)).toBeTruthy();

    expect(getByText('Café')).toBeTruthy();
    expect(getByText('0.6 s decay')).toBeTruthy();

    expect(getByText('Hall')).toBeTruthy();
    expect(getByText('2.2 s decay')).toBeTruthy();
    expect(getByLabelText('Concert spatial preset').props.accessibilityState.checked).toBe(true);

    // Select Café
    fireEvent.press(getByLabelText('Café spatial preset'));
    expect(useSpatialStore.getState().preset).toBe('cafe');

    // Select Hall
    fireEvent.press(getByLabelText('Hall spatial preset'));
    expect(useSpatialStore.getState().preset).toBe('hall');
  });

  it('MOB-SPATIAL-013 SpatialAudioSection compare button toggles bypass and displays bypass indicator banner', () => {
    act(() => {
      useSpatialStore.setState({
        ...DEFAULT_SPATIAL,
        enabled: true,
        mode: 'presets',
        bypass: false,
      });
    });

    const { getByLabelText, getByText, queryByText } = render(<SpatialAudioSection />);

    const compareBtn = getByLabelText('Compare spatial audio bypass');
    expect(getByText('Compare')).toBeTruthy();
    expect(queryByText('Spatial processing bypassed for A/B comparison')).toBeNull();

    // Press compare
    fireEvent.press(compareBtn);
    expect(useSpatialStore.getState().bypass).toBe(true);
    expect(getByText('Bypassed')).toBeTruthy();
    expect(getByText('Spatial processing bypassed for A/B comparison')).toBeTruthy();

    // Press again to exit bypass
    fireEvent.press(compareBtn);
    expect(useSpatialStore.getState().bypass).toBe(false);
    expect(getByText('Compare')).toBeTruthy();
    expect(queryByText('Spatial processing bypassed for A/B comparison')).toBeNull();
  });

  it('MOB-SPATIAL-014 Soundstage renders 2D disc with polar readout and handles touch or accessibility adjustment', () => {
    act(() => {
      useSpatialStore.setState({
        ...DEFAULT_SPATIAL,
        enabled: true,
        mode: 'custom',
        custom: {
          x: 0,
          y: 0.5,
          width: 100,
          intensity: 100,
          ambience: 50,
        },
      });
    });

    const { getByLabelText, getByTestId, getByText } = render(<SpatialAudioSection />);

    const disc = getByLabelText('Soundstage 2D position disc');
    expect(disc).toBeTruthy();

    // Verify polar readout display
    expect(getByText(/Front\s+\(0°\)/)).toBeTruthy();
    expect(getByText(/Near\s+\(50%\)/)).toBeTruthy();

    // Accessibility action: increment Y
    fireEvent(disc, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(useSpatialStore.getState().custom.y).toBeCloseTo(0.6);

    // Accessibility action: decrement Y
    fireEvent(disc, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(useSpatialStore.getState().custom.y).toBeCloseTo(0.5);

    // Direct touch gesture on disc (responder move & release). The 240 dp drawing holds a disc of
    // radius 95 dp (95 of its 120 units), whose edge is distance 1: the marker lands under the finger.
    const touchTarget = getByTestId('soundstage-disc');
    fireEvent(touchTarget, 'responderMove', {
      nativeEvent: { locationX: 180, locationY: 60 },
    });
    expect(useSpatialStore.getState().custom.x).toBeCloseTo(60 / 95);
    expect(useSpatialStore.getState().custom.y).toBeCloseTo(60 / 95);

    fireEvent(touchTarget, 'responderRelease', {
      nativeEvent: { locationX: 120, locationY: 25 },
    });
    expect(useSpatialStore.getState().custom.x).toBeCloseTo(0);
    expect(useSpatialStore.getState().custom.y).toBeCloseTo(1);
  });

  it('MOB-SPATIAL-015 SpatialControls renders quick placement buttons and sliders for distance, width, intensity, ambience', () => {
    act(() => {
      useSpatialStore.setState({
        ...DEFAULT_SPATIAL,
        enabled: true,
        mode: 'custom',
      });
    });

    const { getByLabelText } = render(<SpatialAudioSection />);

    // Quick placement buttons
    fireEvent.press(getByLabelText('Place soundstage Left'));
    expect(useSpatialStore.getState().custom.x).toBeCloseTo(-0.5);
    expect(useSpatialStore.getState().custom.y).toBeCloseTo(0);

    fireEvent.press(getByLabelText('Place soundstage Right'));
    expect(useSpatialStore.getState().custom.x).toBeCloseTo(0.5);
    expect(useSpatialStore.getState().custom.y).toBeCloseTo(0);

    fireEvent.press(getByLabelText('Place soundstage Behind'));
    expect(useSpatialStore.getState().custom.x).toBeCloseTo(0);
    expect(useSpatialStore.getState().custom.y).toBeCloseTo(-0.6);

    fireEvent.press(getByLabelText('Place soundstage Front'));
    expect(useSpatialStore.getState().custom.x).toBeCloseTo(0);
    expect(useSpatialStore.getState().custom.y).toBeCloseTo(0.5);

    // Reset position: back to the starting position, the sliders stay
    act(() => useSpatialStore.getState().setCustom({ width: 12 }));
    fireEvent.press(getByLabelText('Reset position'));
    expect(useSpatialStore.getState().custom).toEqual({ ...DEFAULT_SPATIAL.custom, width: 12 });
    act(() => useSpatialStore.getState().setCustom({ width: DEFAULT_SPATIAL.custom.width }));

    // Sliders accessibility adjust
    const widthSlider = getByLabelText('Soundstage width');
    fireEvent(widthSlider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(useSpatialStore.getState().custom.width).toBe(59);

    const intensitySlider = getByLabelText('Spatial intensity');
    fireEvent(intensitySlider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(useSpatialStore.getState().custom.intensity).toBe(69);

    const ambienceSlider = getByLabelText('Room ambience');
    fireEvent(ambienceSlider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(useSpatialStore.getState().custom.ambience).toBe(31);

    const distanceSlider = getByLabelText('Soundstage distance');
    fireEvent(distanceSlider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    const polar = toPolar(useSpatialStore.getState().custom.x, useSpatialStore.getState().custom.y);
    expect(polar.distance).toBeCloseTo(0.41, 2);
  });

  it('MOB-SPATIAL-016 leaving the Audio screen ends Compare', () => {
    act(() => {
      useSpatialStore.setState({ ...DEFAULT_SPATIAL, enabled: true, bypass: false });
    });
    const { getByLabelText, unmount } = render(<SpatialAudioSection />);
    fireEvent.press(getByLabelText('Compare spatial audio bypass'));
    expect(useSpatialStore.getState().bypass).toBe(true);
    unmount();
    expect(useSpatialStore.getState().bypass).toBe(false);
    expect(useSpatialStore.getState().enabled).toBe(true);
  });
});
