// Cursor encoding/decoding - port of backend encodeCursor/decodeCursor
// Base64url of UTF-8 text with 'L.' prefix.
// Pure TS: TextEncoder + TextDecoder + btoa + atob. No Node Buffer.

import { CatalogInputError } from './ids.js';

/**
 * Encode a nextpage token as a cursor with 'L.' prefix.
 * Base64url of UTF-8 text.
 */
export const encodeCursor = (nextpage: string | null | undefined): string | undefined => {
  if (!nextpage) return undefined;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(nextpage);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const base64url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `L.${base64url}`;
};

/**
 * Decode a cursor string back to a nextpage token.
 * Rejects cursors without 'L.' prefix by throwing CatalogInputError.
 */
export const decodeCursor = (cursor: unknown): string | undefined => {
  if (typeof cursor !== 'string' || !cursor) return undefined;

  if (!cursor.startsWith('L.')) {
    throw new CatalogInputError(`Invalid cursor: missing local prefix 'L.': ${cursor}`);
  }

  const base64url = cursor.slice(2);
  const padded = base64url.padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    throw new CatalogInputError(`Invalid cursor encoding: ${cursor}`);
  }
};
