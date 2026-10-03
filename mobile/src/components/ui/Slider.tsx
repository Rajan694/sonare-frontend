import React, { useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { cn } from '../../lib/cn';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Called once the finger lifts (or after a screen-reader adjustment). */
  onCommit?: (value: number) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Where the fill starts: the low end, or the middle (for ±dB bands). */
  origin?: 'start' | 'center';
  accessibilityLabel: string;
  /** Spoken value, e.g. "+4 dB". */
  accessibilityValueText: string;
  variant?: 'default' | 'gold';
  disabled?: boolean;
  className?: string;
}

/**
 * A drag slider. Vertical sliders grow upwards. Screen readers adjust it in `step`s through
 * the increment / decrement actions.
 */
export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  orientation = 'horizontal',
  origin = 'start',
  accessibilityLabel,
  accessibilityValueText,
  variant = 'default',
  disabled = false,
  className,
}: SliderProps) {
  const vertical = orientation === 'vertical';
  const [length, setLength] = useState(0);
  // Gesture callbacks read the latest props through this ref.
  const latest = useRef({ length, min, max, step, onChange, onCommit, disabled, value });
  latest.current = { length, min, max, step, onChange, onCommit, disabled, value };

  const clamp = (v: number) => {
    const { min: lo, max: hi, step: s } = latest.current;
    return Math.max(lo, Math.min(hi, Math.round(v / s) * s));
  };

  /** The value under a touch at `pos` px along the slider (from the top for vertical ones). */
  const valueAt = (pos: number) => {
    const { length: len, min: lo, max: hi } = latest.current;
    if (len <= 0) return latest.current.value;
    const ratio = Math.max(0, Math.min(1, pos / len));
    return clamp(lo + (vertical ? 1 - ratio : ratio) * (hi - lo));
  };

  // A gesture-handler pan, not the JS responder: inside a ScrollView the native scroll view
  // takes moving touches away from a JS responder before it is granted.
  const pan = usePanGesture({
    runOnJS: true,
    disableReanimated: true,
    minDistance: 0,
    enabled: !disabled,
    onBegin: (e) => latest.current.onChange(valueAt(vertical ? e.y : e.x)),
    onUpdate: (e) => latest.current.onChange(valueAt(vertical ? e.y : e.x)),
    onFinalize: (e) => latest.current.onCommit?.(valueAt(vertical ? e.y : e.x)),
  });

  const adjust = (direction: 1 | -1) => {
    if (disabled) return;
    const next = clamp(value + direction * step);
    onChange(next);
    onCommit?.(next);
  };

  const ratio = (value - min) / (max - min);
  const centre = (0 - min) / (max - min);
  const fillStart = origin === 'center' ? Math.min(ratio, centre) : 0;
  const fillSize = origin === 'center' ? Math.abs(ratio - centre) : ratio;
  const fill = variant === 'gold' ? 'bg-gold' : 'bg-acc';

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e: LayoutChangeEvent) =>
          setLength(vertical ? e.nativeEvent.layout.height : e.nativeEvent.layout.width)
        }
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: accessibilityValueText }}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => adjust(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        // A wide touch target around a thin track.
        className={cn(vertical ? 'w-9 items-center' : 'h-7 justify-center', disabled && 'opacity-40', className)}
      >
        {/* Touch positions are measured on the slider itself, so its children take no touches. */}
        <View
          pointerEvents="none"
          className={cn('bg-ln2 rounded-full overflow-hidden', vertical ? 'w-1 h-full' : 'h-1 w-full')}
        >
          <View
            className={cn('absolute rounded-full', fill)}
            style={
              vertical
                ? { left: 0, right: 0, bottom: `${fillStart * 100}%`, height: `${fillSize * 100}%` }
                : { top: 0, bottom: 0, left: `${fillStart * 100}%`, width: `${fillSize * 100}%` }
            }
          />
        </View>
        <View
          pointerEvents="none"
          className="absolute w-3.5 h-3.5 rounded-full bg-white"
          style={
            vertical ? { bottom: `${ratio * 100}%`, marginBottom: -7 } : { left: `${ratio * 100}%`, marginLeft: -7 }
          }
        />
      </View>
    </GestureDetector>
  );
}
