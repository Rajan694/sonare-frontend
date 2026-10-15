import React from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Icon from '../ui/Icon';

interface DragHandleProps {
  /** The row's pan gesture, from useRowDrag. */
  gesture: ReturnType<typeof usePanGesture>;
  accessibilityLabel: string;
  /** How many rows to move: +1 / -1 from the screen reader's increment / decrement actions. */
  onMove: (by: number) => void;
}

/** The grip at the end of a draggable row; screen readers move it with increment / decrement. */
export const DragHandle = ({ gesture, accessibilityLabel, onMove }: DragHandleProps) => (
  <GestureDetector gesture={gesture}>
    <View
      className="w-8 h-11 items-center justify-center"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onMove(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <Icon name="drag" size={16} color="#5A5A66" />
    </View>
  </GestureDetector>
);
