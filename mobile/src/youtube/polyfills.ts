/* eslint-disable no-bitwise */
/**
 * Minimal pure-JS polyfills for Hermes in React Native.
 * Required by youtubei.js/react-native:
 * - TextDecoder (UTF-8)
 * - ReadableStream (minimal WHATWG shim)
 * - EventTarget & CustomEvent
 * - crypto (getRandomValues, randomUUID, subtle.digest for SHA-1)
 * - window alias for globalThis
 * - structuredClone (meriyah, the JS parser youtubei.js loads)
 */

const g = globalThis as any;

// 1. window alias
if (typeof g.window === 'undefined') {
  g.window = g;
}

// 2. TextDecoder
function decodeUtf8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const c = bytes[i++];
    if (c < 0x80) {
      out += String.fromCharCode(c);
    } else if (c < 0xe0) {
      const c2 = bytes[i++];
      out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f));
    } else if (c < 0xf0) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f));
    } else {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      const c4 = bytes[i++];
      let codepoint = ((c & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f);
      codepoint -= 0x10000;
      out += String.fromCharCode((codepoint >> 10) + 0xd800, (codepoint & 0x3ff) + 0xdc00);
    }
  }
  return out;
}

class PolyfillTextDecoder {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;

  constructor(label = 'utf-8', options?: { fatal?: boolean; ignoreBOM?: boolean }) {
    this.encoding = label.toLowerCase();
    this.fatal = options?.fatal ?? false;
    this.ignoreBOM = options?.ignoreBOM ?? false;
  }

  decode(input?: ArrayBufferView | ArrayBuffer | null): string {
    if (!input) return '';
    let bytes: Uint8Array;
    if (input instanceof Uint8Array) {
      bytes = input;
    } else if (ArrayBuffer.isView(input)) {
      bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    } else if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else {
      bytes = new Uint8Array(input as any);
    }
    return decodeUtf8(bytes);
  }
}

if (typeof g.TextDecoder === 'undefined') {
  g.TextDecoder = PolyfillTextDecoder;
}

// 3. Event, CustomEvent & EventTarget
class PolyfillEvent {
  readonly type: string;
  defaultPrevented = false;
  readonly cancelable: boolean;

  constructor(type: string, options?: { cancelable?: boolean }) {
    this.type = type;
    this.cancelable = options?.cancelable ?? false;
  }

  preventDefault(): void {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }
}

class PolyfillCustomEvent<T = any> extends PolyfillEvent {
  readonly detail: T;

  constructor(type: string, options?: { detail?: T; cancelable?: boolean }) {
    super(type, options);
    this.detail = options?.detail as T;
  }
}

class PolyfillEventTarget {
  private listeners: Record<string, Function[]> = {};

  addEventListener(type: string, listener: any): void {
    if (!listener) return;
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    if (!this.listeners[type].includes(listener)) {
      this.listeners[type].push(listener);
    }
  }

  removeEventListener(type: string, listener: any): void {
    if (!listener || !this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  dispatchEvent(event: any): boolean {
    if (!event || !event.type) return true;
    const list = this.listeners[event.type];
    if (list) {
      for (const listener of list.slice()) {
        try {
          const fn = listener as any;
          if (typeof fn === 'function') {
            fn.call(this, event);
          } else if (fn && typeof fn.handleEvent === 'function') {
            fn.handleEvent(event);
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    return !event.defaultPrevented;
  }
}

if (typeof g.Event === 'undefined') {
  g.Event = PolyfillEvent;
}
if (typeof g.CustomEvent === 'undefined') {
  g.CustomEvent = PolyfillCustomEvent;
}
if (typeof g.EventTarget === 'undefined') {
  g.EventTarget = PolyfillEventTarget;
}

// 4. ReadableStream minimal WHATWG shim
class PolyfillReadableStream {
  locked = false;

  constructor(_underlyingSource?: any) {
    // Minimal stub
  }

  getReader(): {
    read: () => Promise<{ done: boolean; value: any }>;
    releaseLock: () => void;
    cancel: () => Promise<void>;
  } {
    this.locked = true;
    return {
      read: async () => ({ done: true, value: undefined }),
      releaseLock: () => {
        this.locked = false;
      },
      cancel: async () => {},
    };
  }

  cancel(): Promise<void> {
    return Promise.resolve();
  }
}

if (typeof g.ReadableStream === 'undefined') {
  g.ReadableStream = PolyfillReadableStream;
}

// 5. Crypto: getRandomValues, randomUUID, subtle.digest (SHA-1)
// Math.random is NOT cryptographically strong: enough for youtubei.js's request ids, but
// nothing in the app may use this crypto for secrets (add a native module first).
function polyfillGetRandomValues<T extends ArrayBufferView>(array: T): T {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

function polyfillRandomUUID(): string {
  const bytes = new Uint8Array(16);
  polyfillGetRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Pure-JS SHA-1 implementation (FIPS 180-1). */
function sha1(bytes: Uint8Array): ArrayBuffer {
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const len = bytes.length;
  const bitLen = len * 8;
  const withOne = len + 1;
  const padLen = withOne % 64 <= 56 ? 56 - (withOne % 64) : 56 + (64 - (withOne % 64));
  const totalLen = withOne + padLen + 8;

  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen, false);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(80);

  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (x << 1) | (x >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f: number;
      let k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const result = new ArrayBuffer(20);
  const resultView = new DataView(result);
  resultView.setUint32(0, h0, false);
  resultView.setUint32(4, h1, false);
  resultView.setUint32(8, h2, false);
  resultView.setUint32(12, h3, false);
  resultView.setUint32(16, h4, false);
  return result;
}

async function polyfillDigest(algorithm: string | { name: string }, data: BufferSource): Promise<ArrayBuffer> {
  const algo = typeof algorithm === 'string' ? algorithm.toUpperCase() : algorithm?.name?.toUpperCase();
  if (algo === 'SHA-1' || algo === 'SHA1') {
    let bytes: Uint8Array;
    if (data instanceof Uint8Array) {
      bytes = data;
    } else if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else {
      throw new TypeError('Unsupported data type for digest');
    }
    return sha1(bytes);
  }
  throw new Error(`Unsupported digest algorithm: ${algo}`);
}

if (typeof g.crypto === 'undefined') {
  g.crypto = {};
}
if (!g.crypto.getRandomValues) {
  g.crypto.getRandomValues = polyfillGetRandomValues;
}
if (!g.crypto.randomUUID) {
  g.crypto.randomUUID = polyfillRandomUUID;
}
if (!g.crypto.subtle) {
  g.crypto.subtle = {};
}
if (!g.crypto.subtle.digest) {
  g.crypto.subtle.digest = polyfillDigest;
}

// 6. structuredClone: Hermes has none, and meriyah (youtubei.js's JS parser) clones plain AST
// nodes with it. Covers plain objects, arrays, dates, maps, sets, typed arrays and cycles.
const polyfillStructuredClone = <T>(value: T): T => {
  const seen = new Map<unknown, unknown>();
  const clone = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return seen.get(v);
    if (v instanceof Date) return new Date(v.getTime());
    if (ArrayBuffer.isView(v)) return (v as unknown as { slice: () => unknown }).slice();
    if (v instanceof ArrayBuffer) return v.slice(0);
    if (v instanceof Map) {
      const out = new Map();
      seen.set(v, out);
      v.forEach((val, key) => out.set(clone(key), clone(val)));
      return out;
    }
    if (v instanceof Set) {
      const out = new Set();
      seen.set(v, out);
      v.forEach((val) => out.add(clone(val)));
      return out;
    }
    const out: Record<string, unknown> | unknown[] = Array.isArray(v) ? [] : {};
    seen.set(v, out);
    for (const key of Object.keys(v))
      (out as Record<string, unknown>)[key] = clone((v as Record<string, unknown>)[key]);
    return out;
  };
  return clone(value) as T;
};

if (typeof g.structuredClone !== 'function') {
  g.structuredClone = polyfillStructuredClone;
}

export {
  PolyfillTextDecoder,
  PolyfillReadableStream,
  PolyfillEventTarget,
  PolyfillEvent,
  PolyfillCustomEvent,
  polyfillGetRandomValues,
  polyfillRandomUUID,
  sha1,
  polyfillDigest,
  polyfillStructuredClone,
};
