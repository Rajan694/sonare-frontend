import { useEffect, useState, type DependencyList } from 'react';

/**
 * Loads on mount and whenever deps change. While a reload runs, `data` keeps the previous
 * result so the page holds its layout (callers dim it with `loading`).
 */
export const useLoad = <T>(load: () => Promise<T>, deps: DependencyList) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    load()
      .then(
        (d) => {
          if (!live) return;
          setData(d);
          setError(null);
        },
        (e: Error) => live && setError(e.message),
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, setData, error, loading, reload: () => setNonce((n) => n + 1) };
};
