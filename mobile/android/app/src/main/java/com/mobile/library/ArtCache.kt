package com.mobile.library

import android.graphics.Bitmap
import android.util.Base64
import java.io.File
import java.io.FileOutputStream

/**
 * Pure and Android-assisted caching utilities for device song artwork.
 * Keeps artwork in `cacheDir/art/<mediaId>.jpg`, or an empty `<mediaId>.none` marker
 * when no cover could be extracted.
 */
object ArtCache {
  const val MAX_BATCH = 64
  const val THUMBNAIL_SIZE = 512
  const val JPEG_QUALITY = 85

  /**
   * Returns the directory where song artwork and markers are cached (`cacheDir/art`).
   */
  fun ensureArtDir(cacheDir: File): File =
    File(cacheDir, "art").apply { if (!exists()) mkdirs() }

  /**
   * Cleans a MediaStore ID for safe filesystem use.
   */
  fun sanitizeId(mediaId: String): String =
    mediaId.replace(Regex("[^A-Za-z0-9_-]"), "_")

  fun artFile(cacheDir: File, mediaId: String): File =
    File(ensureArtDir(cacheDir), "${sanitizeId(mediaId)}.jpg")

  fun noneFile(cacheDir: File, mediaId: String): File =
    File(ensureArtDir(cacheDir), "${sanitizeId(mediaId)}.none")

  fun tempFile(cacheDir: File, mediaId: String): File =
    File(ensureArtDir(cacheDir), "${sanitizeId(mediaId)}.tmp")

  /**
   * A cache file is valid if it exists and the song has not been modified since.
   * If song's modification time is unknown (<= 0), the existing cache is considered valid.
   */
  fun isCacheValid(cachedFile: File, songModifiedAtMs: Long): Boolean {
    if (!cachedFile.exists()) return false
    if (songModifiedAtMs <= 0L) return true
    return cachedFile.lastModified() >= songModifiedAtMs
  }

  /**
   * Marks that the given song has no artwork by creating a `<id>.none` marker
   * and clearing any stale art file.
   */
  fun markNone(cacheDir: File, mediaId: String) {
    val art = artFile(cacheDir, mediaId)
    val none = noneFile(cacheDir, mediaId)
    if (art.exists()) art.delete()
    try {
      if (!none.exists()) {
        none.createNewFile()
      } else {
        none.setLastModified(System.currentTimeMillis())
      }
    } catch (_: Exception) {}
  }

  /**
   * Compresses [bitmap] as JPEG (quality 85) into `<id>.jpg`, atomically replacing any
   * previous file and removing any `.none` marker.
   */
  fun saveBitmap(cacheDir: File, mediaId: String, bitmap: Bitmap, quality: Int = JPEG_QUALITY): File? {
    val art = artFile(cacheDir, mediaId)
    val tmp = tempFile(cacheDir, mediaId)
    val none = noneFile(cacheDir, mediaId)
    return try {
      FileOutputStream(tmp).use { out ->
        if (!bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)) {
          tmp.delete()
          return null
        }
      }
      if (none.exists()) none.delete()
      if (art.exists()) art.delete()
      if (tmp.renameTo(art)) {
        art
      } else {
        tmp.delete()
        null
      }
    } catch (_: Exception) {
      tmp.delete()
      null
    }
  }

  /**
   * Calculates largest power-of-two `inSampleSize` so decoded dimensions are at least
   * [reqWidth] and [reqHeight].
   */
  fun calculateInSampleSize(width: Int, height: Int, reqWidth: Int, reqHeight: Int): Int {
    var inSampleSize = 1
    if (height > reqHeight || width > reqWidth) {
      val halfHeight = height / 2
      val halfWidth = width / 2
      while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
        inSampleSize *= 2
      }
    }
    return inSampleSize
  }

  /**
   * Converts packed ARGB (0xAARRGGBB) integer pixels into RGBA byte array [R, G, B, A].
   */
  fun argbToRgbaBytes(pixels: IntArray): ByteArray {
    val bytes = ByteArray(pixels.size * 4)
    var idx = 0
    for (color in pixels) {
      bytes[idx++] = ((color ushr 16) and 0xFF).toByte() // R
      bytes[idx++] = ((color ushr 8) and 0xFF).toByte()  // G
      bytes[idx++] = (color and 0xFF).toByte()         // B
      bytes[idx++] = ((color ushr 24) and 0xFF).toByte() // A
    }
    return bytes
  }

  /**
   * Base64 encodes bytes with NO_WRAP. Works across Android runtime and JVM tests.
   */
  fun base64Encode(bytes: ByteArray): String =
    try {
      Base64.encodeToString(bytes, Base64.NO_WRAP)
    } catch (_: Throwable) {
      java.util.Base64.getEncoder().encodeToString(bytes)
    }
}
