import { useEffect, useRef, useState } from 'react';

export const isReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const hasIntersectionObserver = (): boolean =>
  typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined';

export interface UseRevealOptions {
  rootMargin?: string;
  threshold?: number | number[];
}

export function useReveal<T extends HTMLElement = HTMLDivElement>(options: UseRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(() => {
    if (!hasIntersectionObserver()) return true;
    if (isReducedMotion()) return true;
    return false;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!hasIntersectionObserver() || isReducedMotion()) {
      setIsVisible(true);
      el.classList.add('visible');
      return;
    }

    if (isVisible) {
      el.classList.add('visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          el.classList.add('visible');
          observer.disconnect();
        }
      },
      { rootMargin: options.rootMargin ?? '-80px', threshold: options.threshold ?? 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible, options.rootMargin, options.threshold]);

  const result = [ref, isVisible] as [typeof ref, boolean] & {
    ref: typeof ref;
    isVisible: boolean;
  };
  result.ref = ref;
  result.isVisible = isVisible;
  return result;
}
