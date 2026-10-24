import { useEffect, useRef, useState, type ComponentRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

/**
 * A long list of sections under a row of chips that jump to them (Settings). The highlighted chip
 * is the last section whose top has scrolled up to the chip row, or the last section once the list
 * can't scroll further (its top may never get that far). After a jump the chosen chip stays
 * highlighted until the user drags the list, so a section near the end isn't overruled.
 */
export const useSectionJump = <Id extends string>(ids: readonly Id[]) => {
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const chipRowRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const sectionY = useRef<Partial<Record<Id, number>>>({});
  const chipX = useRef<Partial<Record<Id, number>>>({});
  const jumped = useRef(false);
  const [active, setActive] = useState<Id>(ids[0]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (jumped.current) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const y = contentOffset.y;
    let current = ids[0];
    for (const id of ids) {
      const top = sectionY.current[id];
      if (top !== undefined && y >= top - 10) current = id;
    }
    const atEnd =
      !!layoutMeasurement && !!contentSize && y > 0 && y + layoutMeasurement.height >= contentSize.height - 2;
    if (atEnd) current = ids[ids.length - 1];
    setActive(current);
  };

  const onScrollBeginDrag = () => {
    jumped.current = false;
  };

  const jumpTo = (id: Id) => {
    jumped.current = true;
    setActive(id);
    const y = sectionY.current[id];
    if (y !== undefined) listRef.current?.scrollTo({ y, animated: true });
  };

  // Keep the highlighted chip in view in its row.
  useEffect(() => {
    const x = chipX.current[active];
    if (x !== undefined) chipRowRef.current?.scrollTo({ x: Math.max(0, x - 20), animated: true });
  }, [active]);

  const sectionLayout = (id: Id) => (e: LayoutChangeEvent) => {
    sectionY.current[id] = e.nativeEvent.layout.y;
  };
  const chipLayout = (id: Id) => (e: LayoutChangeEvent) => {
    chipX.current[id] = e.nativeEvent.layout.x;
  };

  return { active, listRef, chipRowRef, onScroll, onScrollBeginDrag, jumpTo, sectionLayout, chipLayout };
};
