import { useRef, useState } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs } from '../lib/motion';

/**
 * Drag a list row up or down. Returns the pan gesture, the animated style to put on the row and
 * whether it is being dragged; `onMove` is told how many rows the drop moved it by (negative up).
 */
export const useRowDrag = (rowHeight: number, onMove: (by: number) => void) => {
  const dragY = useSharedValue(0);
  // The end event carries no translation, so the last update's is kept here.
  const lastY = useRef(0);
  const [dragging, setDragging] = useState(false);

  const gesture = usePanGesture({
    runOnJS: true,
    disableReanimated: true,
    minDistance: 0,
    onBegin: () => {
      lastY.current = 0;
      setDragging(true);
    },
    onUpdate: (e) => {
      lastY.current = e.translationY;
      dragY.value = e.translationY;
    },
    onFinalize: () => {
      setDragging(false);
      dragY.value = withSpring(0, springs.slide);
      onMove(Math.round(lastY.current / rowHeight));
    },
  });

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  return { gesture, style, dragging };
};
