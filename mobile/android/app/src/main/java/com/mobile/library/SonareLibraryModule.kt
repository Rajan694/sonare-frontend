package com.mobile.library

import android.content.ContentUris
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * The music on the phone, read from MediaStore: other apps' songs, files copied over, and
 * Sonare's own downloads (Music/Sonare), which a reinstalled app no longer owns. Needs
 * READ_MEDIA_AUDIO (Android 13+) or READ_EXTERNAL_STORAGE, which JS asks for.
 *
 * JS:
 *  - `scan()` -> [{ mediaId, uri, title, artist, album, durationMs, folder, fileName, size, modifiedAt }]
 */
class SonareLibraryModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  @ReactMethod
  fun scan(promise: Promise) {
    Thread {
      try {
        promise.resolve(query())
      } catch (e: SecurityException) {
        promise.reject("E_PERMISSION", "No permission to read music on this phone", e)
      } catch (e: Exception) {
        promise.reject("E_SCAN", e.message ?: "Could not read the music on this phone", e)
      }
    }.start()
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

  companion object {
    const val NAME = "SonareLibrary"
  }
}
