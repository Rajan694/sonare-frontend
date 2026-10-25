import { describe, expect, it } from 'vitest';
import { imageInfo } from '../../src/storage/coverArt';

describe('coverArt: what a downloaded cover is', () => {
  it('WEB-COVER-001 reads a JPEG size from its start-of-frame, past other markers', () => {
    const app0 = [0xff, 0xe0, 0, 6, 1, 2, 3, 4];
    const sof2 = [0xff, 0xc2, 0, 17, 8, 1, 0xe0, 2, 0x80, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
    expect(imageInfo(Uint8Array.from([0xff, 0xd8, ...app0, ...sof2, 0xff, 0xd9]))).toEqual({
      mime: 'image/jpeg',
      width: 640,
      height: 480,
    });
  });

  it('WEB-COVER-002 reads a PNG size from IHDR and gives null for other images', () => {
    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 2, 0x80, 0, 0, 1, 0xe0,
      8,
    ]);
    expect(imageInfo(png)).toEqual({ mime: 'image/png', width: 640, height: 480 });
    const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
    expect(imageInfo(webp)).toBeNull();
    expect(imageInfo(Uint8Array.from([0xff, 0xd8, 0xff]))).toBeNull();
  });
});
