import { REQUEST_TIMEOUT_MS, ServerTimeoutError, trackServerRequest } from '../../../shared/net/serverWake';

/**
 * fetch for the Sonare backend: gives up after REQUEST_TIMEOUT_MS (fetch alone waits forever)
 * and feeds the "waking up" notice. A caller's own abort signal still works.
 */
export const serverFetch = (input: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> =>
  trackServerRequest(async () => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const outer = init.signal;
    const forward = () => controller.abort();
    if (outer?.aborted) controller.abort();
    else outer?.addEventListener('abort', forward, { once: true });
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (err) {
      if (timedOut) throw new ServerTimeoutError();
      throw err;
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', forward);
    }
  });
