package com.mobile.downloads

data class Cover(
  val data: ByteArray,
  val mime: String,
  val width: Int,
  val height: Int
)

/**
 * Parses image type and dimensions directly from JPEG or PNG header bytes.
 * JPEG: first SOF0..SOF15 marker (skipping C4, C8, CC).
 * PNG: IHDR chunk.
 * Returns null for WebP and other unsupported formats.
 */
object CoverArt {

  fun be16(b: ByteArray, i: Int): Int =
    ((b[i].toInt() and 0xFF) shl 8) or (b[i + 1].toInt() and 0xFF)

  fun be32(b: ByteArray, i: Int): Long =
    ((b[i].toLong() and 0xFF) shl 24) or
      ((b[i + 1].toLong() and 0xFF) shl 16) or
      ((b[i + 2].toLong() and 0xFF) shl 8) or
      (b[i + 3].toLong() and 0xFF)

  fun imageInfo(b: ByteArray): Cover? {
    if (b.size > 24 && be32(b, 0) == 0x89504E47L && be32(b, 12) == 0x49484452L) {
      val width = be32(b, 16).toInt()
      val height = be32(b, 20).toInt()
      return Cover(b, "image/png", width, height)
    }
    if (b.size < 4 || (b[0].toInt() and 0xFF) != 0xFF || (b[1].toInt() and 0xFF) != 0xD8) {
      return null
    }
    var i = 2
    while (i + 9 < b.size) {
      if ((b[i].toInt() and 0xFF) != 0xFF) return null
      val marker = b[i + 1].toInt() and 0xFF
      if (marker == 0xFF) {
        i++
        continue
      }
      if (marker == 0x01 || (marker in 0xD0..0xD8)) {
        i += 2
        continue
      }
      if (marker in 0xC0..0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC) {
        val height = be16(b, i + 5)
        val width = be16(b, i + 7)
        return Cover(b, "image/jpeg", width, height)
      }
      val len = be16(b, i + 2)
      i += 2 + len
    }
    return null
  }
}
