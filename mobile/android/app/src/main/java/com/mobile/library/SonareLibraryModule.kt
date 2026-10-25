package com.mobile.library

import android.content.ContentUris
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import android.util.Size
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.mobile.downloads.HttpUtil
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * The music on the phone, read from MediaStore: other apps' songs, files copied over, and
 * Sonare's own downloads (Music/Sonare), which a reinstalled app no longer owns. Needs
 * READ_MEDIA_AUDIO (Android 13+) or READ_EXTERNAL_STORAGE, which JS asks for.
 *
 * JS:
 *  - `scan()` -> [{ mediaId, uri, title, artist, album, durationMs, folder, fileName, size, modifiedAt }]
 *  - `artworkFor(mediaIds)` -> { [mediaId]: "file:///..." | null }
 *  - `artworkPixels(uri, size)` -> base64 RGBA | null
 */
class SonareLibraryModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val executor: ExecutorService = Executors.newFixedThreadPool(2)

  override fun getName() = NAME

  @ReactMethod
  fun scan(promise: Promise) {
    executor.execute {
      try {
        promise.resolve(query())
      } catch (e: SecurityException) {
        promise.reject("E_PERMISSION", "No permission to read music on this phone", e)
      } catch (e: Exception) {
        promise.reject("E_SCAN", e.message ?: "Could not read the music on this phone", e)
      }
    }
  }

  /**
   * Extracts or retrieves cached album art for a batch of media store IDs.
   * Resolves a map of mediaId -> file:// uri | null. Capped to [ArtCache.MAX_BATCH] items.
   */
  @ReactMethod
  fun artworkFor(mediaIds: ReadableArray, promise: Promise) {
    executor.execute {
      val resultMap = Arguments.createMap()
      val count = minOf(mediaIds.size(), ArtCache.MAX_BATCH)
      val ids = ArrayList<String>(count)
      for (i in 0 until count) {
        val id = mediaIds.getString(i)
        if (!id.isNullOrEmpty()) {
          ids.add(id)
        }
      }

      if (ids.isEmpty()) {
        promise.resolve(resultMap)
        return@execute
      }

      val cacheDir = context.cacheDir
      val idLongs = ids.mapNotNull { it.toLongOrNull() }
      val modifiedMap = mutableMapOf<Long, Long>()

      val collection =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        else MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

      if (idLongs.isNotEmpty()) {
        try {
          val projection = arrayOf(MediaStore.Audio.Media._ID, MediaStore.Audio.Media.DATE_MODIFIED)
          val selection = "${MediaStore.Audio.Media._ID} IN (${idLongs.joinToString(",") { "?" }})"
          val args = idLongs.map { it.toString() }.toTypedArray()
          context.contentResolver.query(collection, projection, selection, args, null)?.use { cursor ->
            while (cursor.moveToNext()) {
              val id = cursor.getLong(0)
              val modifiedSec = cursor.getLong(1)
              modifiedMap[id] = modifiedSec * 1000L
            }
          }
        } catch (e: Exception) {
          Log.w(NAME, "Could not query DATE_MODIFIED for mediaIds: ${e.message}")
        }
      }

      for (id in ids) {
        try {
          val idLong = id.toLongOrNull()
          val artFile = ArtCache.artFile(cacheDir, id)
          val noneFile = ArtCache.noneFile(cacheDir, id)
          val songModified = idLong?.let { modifiedMap[it] } ?: 0L

          // Invalidate cached artwork or none marker if song is newer
          if (artFile.exists() && !ArtCache.isCacheValid(artFile, songModified)) {
            artFile.delete()
          }
          if (noneFile.exists() && !ArtCache.isCacheValid(noneFile, songModified)) {
            noneFile.delete()
          }

          if (artFile.exists()) {
            resultMap.putString(id, Uri.fromFile(artFile).toString())
            continue
          }
          if (noneFile.exists()) {
            resultMap.putNull(id)
            continue
          }

          if (idLong == null) {
            resultMap.putNull(id)
            continue
          }

          val audioUri = ContentUris.withAppendedId(collection, idLong)
          var savedFile: File? = null

          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
              val bitmap = context.contentResolver.loadThumbnail(audioUri, Size(ArtCache.THUMBNAIL_SIZE, ArtCache.THUMBNAIL_SIZE), null)
              savedFile = ArtCache.saveBitmap(cacheDir, id, bitmap, ArtCache.JPEG_QUALITY)
              bitmap.recycle()
            } catch (_: Exception) {
              // Thrown when file has no art; fall back to MediaMetadataRetriever
            }
          }

          if (savedFile == null) {
            val retriever = MediaMetadataRetriever()
            try {
              retriever.setDataSource(context, audioUri)
              val picture = retriever.embeddedPicture
              if (picture != null) {
                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(picture, 0, picture.size, bounds)
                val sampleSize = ArtCache.calculateInSampleSize(bounds.outWidth, bounds.outHeight, ArtCache.THUMBNAIL_SIZE, ArtCache.THUMBNAIL_SIZE)
                val decodeOpts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
                val bitmap = BitmapFactory.decodeByteArray(picture, 0, picture.size, decodeOpts)
                if (bitmap != null) {
                  savedFile = ArtCache.saveBitmap(cacheDir, id, bitmap, ArtCache.JPEG_QUALITY)
                  bitmap.recycle()
                }
              }
            } catch (e: Exception) {
              Log.w(NAME, "MediaMetadataRetriever failed for $id: ${e.message}")
            } finally {
              runCatching { retriever.release() }
            }
          }

          if (savedFile != null && savedFile.exists()) {
            resultMap.putString(id, Uri.fromFile(savedFile).toString())
          } else {
            ArtCache.markNone(cacheDir, id)
            resultMap.putNull(id)
          }
        } catch (e: Exception) {
          Log.w(NAME, "Failed processing artwork for $id: ${e.message}")
          resultMap.putNull(id)
        }
      }

      promise.resolve(resultMap)
    }
  }

  /**
   * Decodes an image from file://, content://, or http(s):// with sampling, scales to
   * size x size, and resolves with base64 encoded RGBA bytes (or null on failure).
   */
  @ReactMethod
  fun artworkPixels(uri: String, size: Int, promise: Promise) {
    executor.execute {
      try {
        val targetSize = size.coerceIn(1, 1024)
        val sampled = decodeSampledBitmap(uri, targetSize)
        if (sampled == null) {
          promise.resolve(null)
          return@execute
        }

        val scaled =
          if (sampled.width == targetSize && sampled.height == targetSize) sampled
          else Bitmap.createScaledBitmap(sampled, targetSize, targetSize, true)

        val pixels = IntArray(targetSize * targetSize)
        scaled.getPixels(pixels, 0, targetSize, 0, 0, targetSize, targetSize)
        val rgbaBytes = ArtCache.argbToRgbaBytes(pixels)

        if (scaled != sampled) scaled.recycle()
        sampled.recycle()

        val base64 = ArtCache.base64Encode(rgbaBytes)
        promise.resolve(base64)
      } catch (e: Exception) {
        Log.w(NAME, "Failed to extract artworkPixels from $uri: ${e.message}")
        promise.resolve(null)
      }
    }
  }

  private fun decodeSampledBitmap(uriString: String, targetSize: Int): Bitmap? {
    val uri = Uri.parse(uriString)
    val scheme = uri.scheme?.lowercase()

    if (scheme == "http" || scheme == "https") {
      val bytes = HttpUtil.fetchBytes(uriString) ?: return null
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
      val sampleSize = ArtCache.calculateInSampleSize(bounds.outWidth, bounds.outHeight, targetSize, targetSize)
      val opts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
      return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
    }

    if (scheme == "content") {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      context.contentResolver.openInputStream(uri)?.use {
        BitmapFactory.decodeStream(it, null, bounds)
      } ?: return null
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
      val sampleSize = ArtCache.calculateInSampleSize(bounds.outWidth, bounds.outHeight, targetSize, targetSize)
      val opts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
      return context.contentResolver.openInputStream(uri)?.use {
        BitmapFactory.decodeStream(it, null, opts)
      }
    }

    // file:// or local file path
    val path = if (scheme == "file") uri.path ?: "" else uriString
    val file = File(path)
    if (!file.exists()) return null
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    val sampleSize = ArtCache.calculateInSampleSize(bounds.outWidth, bounds.outHeight, targetSize, targetSize)
    val opts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
    return BitmapFactory.decodeFile(file.absolutePath, opts)
  }

  private fun query() =
    Arguments.createArray().apply {
      val collection =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        else MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
      val folderColumn =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.Audio.Media.RELATIVE_PATH
        else MediaStore.Audio.Media.DATA
      val columns =
        arrayOf(
          MediaStore.Audio.Media._ID,
          MediaStore.Audio.Media.TITLE,
          MediaStore.Audio.Media.ARTIST,
          MediaStore.Audio.Media.ALBUM,
          MediaStore.Audio.Media.DURATION,
          MediaStore.Audio.Media.DISPLAY_NAME,
          MediaStore.Audio.Media.SIZE,
          MediaStore.Audio.Media.DATE_MODIFIED,
          folderColumn,
        )
      // Songs, not ringtones or voice notes; Sonare's own downloads count either way.
      val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0 OR $folderColumn LIKE ?"
      val args = arrayOf("%Music/Sonare%")
      context.contentResolver.query(collection, columns, selection, args, null)?.use { c ->
        while (c.moveToNext()) {
          val id = c.getLong(0)
          val rawFolder = c.getString(8) ?: ""
          // Before Android 10 the column is the file's whole path.
          val folder =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) rawFolder.trimEnd('/')
            else rawFolder.substringBeforeLast('/').substringAfter("/0/").trimEnd('/')
          pushMap(
            Arguments.createMap().apply {
              putString("mediaId", id.toString())
              putString("uri", ContentUris.withAppendedId(collection, id).toString())
              putString("title", c.getString(1))
              putString("artist", c.getString(2)?.takeUnless { it == MediaStore.UNKNOWN_STRING })
              putString("album", c.getString(3)?.takeUnless { it == MediaStore.UNKNOWN_STRING })
              putDouble("durationMs", c.getLong(4).toDouble())
              putString("fileName", c.getString(5))
              putDouble("size", c.getLong(6).toDouble())
              putDouble("modifiedAt", c.getLong(7) * 1000.0)
              putString("folder", folder)
            },
          )
        }
      }
    }

  override fun invalidate() {
    executor.shutdown()
    super.invalidate()
  }

  companion object {
    const val NAME = "SonareLibrary"
  }
}
