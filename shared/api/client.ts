/**
 * The parts of the API client both apps share. Each app keeps its own transport (fetch on
 * desktop, XMLHttpRequest on Android, which keeps working while the app is in the background)
 * and its own session handling; what an answer means, and how the in-app YouTube catalog and
 * the backend take turns, is the same.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The error for an answer with an error status: the server's message and code when it sent them. */
export const apiErrorFrom = (status: number, json: unknown): ApiError => {
  const error = (json as { error?: { message?: unknown; code?: unknown } } | null)?.error;
  const message =
    typeof error?.message === 'string' && error.message ? error.message : `Request failed with status ${status}`;
  return new ApiError(message, status, typeof error?.code === 'string' ? error.code : undefined);
};

/** Only YouTube items can come from the in-app catalog. */
export const isYouTubeId = (id: string): boolean => !id.startsWith('local:') && !id.startsWith('sonare:');

export const ytId = (id: string): string => (id.startsWith('yt:') ? id : `yt:${id}`);

/**
 * `localFirst` asks the in-app catalog first (when this app may fetch YouTube itself) and falls
 * back to the backend on any error, saying so at most once a minute per method. `paged` does
 * the same for paged lists, where a cursor only works where it came from: `L.` cursors are the
 * in-app catalog's, the rest the backend's.
 */
export const createCatalogFallback = <C>(deps: { allowed: () => boolean; catalog: () => Promise<C> }) => {
  const lastWarning = new Map<string, number>();

  const localFirst = async <T>(
    method: string,
    local: (c: C) => Promise<T>,
    remote: () => Promise<T>,
    id?: string,
  ): Promise<T> => {
    if (deps.allowed() && (id === undefined || isYouTubeId(id))) {
      try {
        return await local(await deps.catalog());
      } catch (err) {
        const now = Date.now();
        if (now - (lastWarning.get(method) ?? 0) > 60_000) {
          lastWarning.set(method, now);
          console.warn(`[in-app-yt] ${method} fell back to the backend:`, err instanceof Error ? err.message : err);
        }
      }
    }
    return remote();
  };

  const paged = <T>(
    method: string,
    cursor: string | undefined,
    local: (c: C, cursor?: string) => Promise<T>,
    remote: (cursor?: string) => Promise<T>,
    id?: string,
  ): Promise<T> => {
    if (cursor?.startsWith('L.')) return deps.catalog().then((c) => local(c, cursor));
    if (cursor) return remote(cursor);
    return localFirst(
      method,
      (c) => local(c),
      () => remote(),
      id,
    );
  };

  return { localFirst, paged, resetWarnings: () => lastWarning.clear() };
};
