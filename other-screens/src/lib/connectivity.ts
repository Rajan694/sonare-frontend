export function hasInternet(timeoutMs = 4000): Promise<boolean> {
  // If navigator.onLine is false, we can return false immediately (desktop only)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.resolve(false);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requests = [
    fetch('https://www.gstatic.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    }),
    fetch('https://cloudflare.com/cdn-cgi/trace', {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    }),
  ];

  return Promise.any(requests)
    .then(() => {
      clearTimeout(timeoutId);
      return true;
    })
    .catch(() => {
      clearTimeout(timeoutId);
      return false;
    });
}