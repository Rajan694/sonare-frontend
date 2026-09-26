import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Run an async loader and track its result. `deps` re-run it; `refetchOnFocus` re-runs it
 * whenever the screen comes back into view (lists the user can change from elsewhere).
 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: unknown[],
  { enabled = true, refetchOnFocus = false }: { enabled?: boolean; refetchOnFocus?: boolean } = {},
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refetch = useCallback(() => setNonce(n => n + 1), []);
  const depKey = JSON.stringify(deps);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError(null);
    loadRef.current()
      .then(res => live && setData(res))
      .catch(err => live && setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [enabled, nonce, depKey]);

  // Skip the first focus: the effect above already loaded on mount.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus) return;
      if (focusedOnce.current) refetch();
      focusedOnce.current = true;
    }, [refetchOnFocus, refetch]),
  );

  return { data, loading, error, refetch };
}
