// Sonare web: keeps the songs the browser streamed, so playing one again costs no data and
// starts at once. The desktop and Android apps keep their own stream cache; this is the web's.
//
// - A stream request the player tagged with `sonare_ck=<track>:<quality>` goes to the network
//   as usual. When it brings the whole file from byte 0, a copy is saved.
// - `/__sonare_song/<key>` (same origin) is answered from that copy, ranges included, which is
//   how the player plays a saved song without asking the server for a stream at all.
// - Up to MAX_BYTES; the least recently played go first. Keep the names in step with
//   src/audio/songCache.ts, which reads and clears the same cache.

const CACHE = 'sonare-songs-v1';
const SONG_PREFIX = '/__sonare_song/';
const INDEX_URL = '/__sonare_song_index';
const MAX_BYTES = 100_000_000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(SONG_PREFIX)) {
    event.respondWith(fromCache(decodeURIComponent(url.pathname.slice(SONG_PREFIX.length)), request));
    return;
  }
  const key = url.searchParams.get('sonare_ck');
  if (!key || !url.pathname.includes('/stream/')) return;
  let saved;
  const done = new Promise((resolve) => (saved = resolve));
  event.waitUntil(done);
  event.respondWith(fromNetwork(request, key, saved));
});

// ── The index: key -> { size, at } (bytes, last played) ────────────────────────────────

let indexWork = Promise.resolve();
/** Index changes one at a time, so two songs finishing together don't lose an entry. */
const withIndex = (change) => {
  const run = indexWork.then(async () => {
    const cache = await caches.open(CACHE);
    const res = await cache.match(INDEX_URL);
    const index = res ? await res.json().catch(() => ({})) : {};
    const result = await change(index, cache);
    await cache.put(
      INDEX_URL,
      new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } }),
    );
    return result;
  });
  indexWork = run.catch(() => {});
  return run;
};

const songUrl = (key) => SONG_PREFIX + encodeURIComponent(key);

const save = (key, blob, type) =>
  withIndex(async (index, cache) => {
    await cache.put(
      songUrl(key),
      new Response(blob, { headers: { 'Content-Type': type, 'Content-Length': String(blob.size) } }),
    );
    index[key] = { size: blob.size, at: Date.now() };
    let total = Object.values(index).reduce((sum, e) => sum + e.size, 0);
    for (const [k, e] of Object.entries(index).sort(([, a], [, b]) => a.at - b.at)) {
      if (total <= MAX_BYTES) break;
      if (k === key) continue;
      await cache.delete(songUrl(k));
      delete index[k];
      total -= e.size;
    }
  });

// ── Answers ─────────────────────────────────────────────────────────────────────────────

/** A saved song, whole or the range asked for. 404 when it isn't saved (the player then streams it). */
const fromCache = async (key, request) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(songUrl(key));
  if (!hit) return new Response(null, { status: 404 });
  void withIndex((index) => {
    if (index[key]) index[key].at = Date.now();
  }).catch(() => {});
  const blob = await hit.blob();
  const type = hit.headers.get('Content-Type') || 'audio/webm';
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || '');
  if (!range) {
    return new Response(blob, {
      status: 200,
      headers: { 'Content-Type': type, 'Content-Length': String(blob.size), 'Accept-Ranges': 'bytes' },
    });
  }
  let start = range[1] === '' ? blob.size - Number(range[2]) : Number(range[1]);
  let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : blob.size - 1;
  start = Math.max(0, start);
  end = Math.min(end, blob.size - 1);
  if (start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': type,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${blob.size}`,
      'Accept-Ranges': 'bytes',
    },
  });
};

/** Total size when the response is the whole file: a 200, or a 206 from byte 0 to the end. */
const wholeFileSize = (res) => {
  if (res.status === 200) return Number(res.headers.get('Content-Length')) || null;
  const m = /^bytes 0-(\d+)\/(\d+)$/.exec(res.headers.get('Content-Range') || '');
  return res.status === 206 && m && Number(m[1]) + 1 === Number(m[2]) ? Number(m[2]) : null;
};

/**
 * The stream from the network, handed to the player as it arrives. A whole file is copied on
 * the way and saved at the end. If the player lets go early (a seek, another song), the copy is
 * dropped and the download stops with it - nothing is fetched just for the cache.
 */
const fromNetwork = async (request, key, saved) => {
  let res;
  try {
    res = await fetch(request);
  } catch (err) {
    saved();
    throw err;
  }
  const size = wholeFileSize(res);
  if (!size || !res.body) {
    saved();
    return res;
  }
  const chunks = [];
  let received = 0;
  const copy = new TransformStream({
    transform(chunk, controller) {
      chunks.push(chunk);
      received += chunk.byteLength;
      controller.enqueue(chunk);
    },
    flush() {
      const type = res.headers.get('Content-Type') || 'audio/webm';
      if (received !== size) return saved();
      save(key, new Blob(chunks, { type }), type)
        .catch(() => {})
        .finally(saved);
    },
  });
  res.body.pipeTo(copy.writable).catch(() => saved());
  return new Response(copy.readable, { status: res.status, statusText: res.statusText, headers: res.headers });
};
