import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Draw only the rows a scrolling list is showing (plus a few either side). A library of
 * thousands of songs scrolls smoothly instead of laying out every row at once. The list
 * keeps its natural markup structure: the caller renders the slice between two spacer
 * elements sized to stand in for the rows that are not drawn. Until the container has been
 * measured (before the first paint, or in a test with no layout) every row is drawn.
 */

export interface VirtualRows {
  /** First row to draw. */
  start: number;
  /** One past the last row to draw. */
  end: number;
  /** Height of the spacer above the drawn rows. */
  topPad: number;
  /** Height of the spacer below the drawn rows. */
  bottomPad: number;
}

export interface VirtualRowsOptions {
  /** How many rows there are. */
  count: number;
  /** The height of one row, in pixels. */
  rowHeight: number;
  /** Space between rows, in pixels; part of the stride. */
  gap?: number;
  /** Rows drawn beyond the visible ones, so a fast scroll does not flash blank. */
  overscan?: number;
  /** The scrolling element the rows live in. */
  scrollRef: RefObject<HTMLElement | null>;
  /**
   * Re-measure when these change: the container was replaced (a new tab or view), which
   * also resets its scroll position. Rows themselves come in through `count`.
   */
  deps?: (string | number | boolean | null | undefined)[];
}

export const useVirtualRows = ({
  count,
  rowHeight,
  gap = 0,
  overscan = 8,
  scrollRef,
  deps = [],
}: VirtualRowsOptions): VirtualRows => {
  const stride = rowHeight + gap;
  // null until the container has a height: then the whole list is drawn.
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    const height = el?.clientHeight ?? 0;
    if (!el || height === 0) {
      setRange((prev) => (prev === null ? prev : null));
      return;
    }
    const first = Math.max(0, Math.floor(el.scrollTop / stride));
    const visible = Math.ceil(height / stride);
    const start = Math.max(0, Math.min(count, first - overscan));
    const end = Math.min(count, first + visible + overscan);
    setRange((prev) => (prev && prev.start === start && prev.end === end ? prev : { start, end }));
  }, [scrollRef, stride, count, overscan]);

  // The dependency list is the caller's list of "the container changed" values.
  const depKey = deps.join('\u0001');
  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, depKey, scrollRef]);

  const { start, end } = range ?? { start: 0, end: count };
  return {
    start,
    end,
    topPad: start * stride,
    bottomPad: Math.max(0, (count - end) * stride),
  };
};
