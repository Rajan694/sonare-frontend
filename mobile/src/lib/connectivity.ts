export function hasInternet(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requests = [
    fetch('https://www.gstatic.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    }),
    fetch('https://cloudflare.com/cdn-cgi/trace', {
      method: 'GET',
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
