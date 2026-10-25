import React from 'react';
import { NativeModules } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { sanitize, useAudioStore } from '../src/store/audio';
import { EqualizerScreen } from '../src/screens/Equalizer';
import { SonarePlayer } from '../src/native/SonarePlayer';

jest.mock('@react-navigation/native', () => require('../test-utils').navigationMock());

const native = NativeModules.SonarePlayer as Record<string, jest.Mock>;

const adjust = (el: Parameters<typeof fireEvent>[0], actionName: 'increment' | 'decrement', times = 1) => {
  for (let i = 0; i < times; i++) {
    fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName } });
  }
};

describe('Audio controls (speed, pitch, fades, crossfade length)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAudioStore.setState({
      enabled: true,
      customGains: [0, 0, 0, 0, 0, 0, 0, 0],
      bassBoost: 0,
      virtualizer: 0,
      speed: 1,
      pitch: 0,
      fades: false,
      crossfade: false,
      crossfadeMs: 6000,
    });
  });

  it('MOB-ACTRL-001 sanitizes speed within 0.5..2 in steps of 0.05, pitch within -6..6 in steps of 0.5, and fades boolean', () => {
    expect(sanitize({ speed: 0.1 })).toEqual({ speed: 0.5 });
    expect(sanitize({ speed: 2.8 })).toEqual({ speed: 2.0 });
    expect(sanitize({ speed: 1.23 })).toEqual({ speed: 1.25 });
    expect(sanitize({ pitch: -10 })).toEqual({ pitch: -6 });
    expect(sanitize({ pitch: 7.2 })).toEqual({ pitch: 6 });
    expect(sanitize({ pitch: 1.3 })).toEqual({ pitch: 1.5 });
    expect(sanitize({ fades: true })).toEqual({ fades: true });
  });

  it('MOB-ACTRL-002 migrates legacy crossfade: true to crossfadeMs 6000 and sanitizes crossfadeMs clamp/step', () => {
    expect(sanitize({ crossfade: true })).toEqual({ crossfade: true, crossfadeMs: 6000 });
    expect(sanitize({ crossfadeMs: 0 })).toEqual({ crossfade: false });
    expect(sanitize({ crossfadeMs: 500 })).toEqual({ crossfade: true, crossfadeMs: 1000 });
    expect(sanitize({ crossfadeMs: 15000 })).toEqual({ crossfade: true, crossfadeMs: 12000 });
    expect(sanitize({ crossfadeMs: 3400 })).toEqual({ crossfade: true, crossfadeMs: 3500 });
  });

  it('MOB-ACTRL-003 SonarePlayer native methods setPitch, setFades and setTransitions pass arguments', () => {
    SonarePlayer.setPitch(2.5);
    expect(native.setPitch).toHaveBeenCalledWith(2.5);

    SonarePlayer.setFades(true);
    expect(native.setFades).toHaveBeenCalledWith(true);

    SonarePlayer.setTransitions({ crossfadeMs: 4500, gapless: false });
    expect(native.setTransitions).toHaveBeenCalledWith({ crossfadeMs: 4500, gapless: false });
  });

  it('MOB-ACTRL-004 speed slider and reset button update speed in store and UI', () => {
    const { getByLabelText } = render(<EqualizerScreen />);
    const speedSlider = getByLabelText('Playback speed');
    const resetSpeed = getByLabelText('Reset playback speed');

    expect(resetSpeed.props.accessibilityState.disabled).toBe(true);

    adjust(speedSlider, 'increment', 4); // 1.0 + 4 * 0.05 = 1.2
    expect(useAudioStore.getState().speed).toBe(1.2);
    expect(resetSpeed.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(resetSpeed);
    expect(useAudioStore.getState().speed).toBe(1);
    expect(resetSpeed.props.accessibilityState.disabled).toBe(true);
  });

  it('MOB-ACTRL-005 pitch slider and reset button update pitch in store and UI', () => {
    const { getByLabelText } = render(<EqualizerScreen />);
    const pitchSlider = getByLabelText('Pitch');
    const resetPitch = getByLabelText('Reset pitch');

    expect(resetPitch.props.accessibilityState.disabled).toBe(true);

    adjust(pitchSlider, 'decrement', 2); // 0 - 2 * 0.5 = -1
    expect(useAudioStore.getState().pitch).toBe(-1);
    expect(pitchSlider.props.accessibilityValue).toEqual({ text: '−1 st' });
    expect(resetPitch.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(resetPitch);
    expect(useAudioStore.getState().pitch).toBe(0);
    expect(pitchSlider.props.accessibilityValue).toEqual({ text: '0' });
    expect(resetPitch.props.accessibilityState.disabled).toBe(true);
  });

  it('MOB-ACTRL-006 crossfade length slider hides when crossfade is off and displays when on', () => {
    const { getByLabelText, queryByLabelText } = render(<EqualizerScreen />);

    expect(queryByLabelText('Crossfade length')).toBeNull();

    fireEvent.press(getByLabelText('Crossfade'));
    expect(useAudioStore.getState().crossfade).toBe(true);

    const lengthSlider = getByLabelText('Crossfade length');
    expect(lengthSlider).toBeTruthy();
    expect(lengthSlider.props.accessibilityValue).toEqual({ text: '6 s' });

    adjust(lengthSlider, 'increment', 1); // 6000 + 500 = 6500 ms
    expect(useAudioStore.getState().crossfadeMs).toBe(6500);
    expect(lengthSlider.props.accessibilityValue).toEqual({ text: '6.5 s' });

    adjust(lengthSlider, 'increment', 1);
    expect(useAudioStore.getState().crossfadeMs).toBe(7000);
    expect(lengthSlider.props.accessibilityValue).toEqual({ text: '7 s' });

    fireEvent.press(getByLabelText('Crossfade'));
    expect(useAudioStore.getState().crossfade).toBe(false);
    expect(queryByLabelText('Crossfade length')).toBeNull();
  });

  it('MOB-ACTRL-007 fade on play & pause switch toggles fades in audio store', () => {
    const { getByLabelText } = render(<EqualizerScreen />);
    const fadesSwitch = getByLabelText('Fade on play & pause');

    expect(useAudioStore.getState().fades).toBe(false);
    fireEvent.press(fadesSwitch);
    expect(useAudioStore.getState().fades).toBe(true);
    fireEvent.press(fadesSwitch);
    expect(useAudioStore.getState().fades).toBe(false);
  });
});
