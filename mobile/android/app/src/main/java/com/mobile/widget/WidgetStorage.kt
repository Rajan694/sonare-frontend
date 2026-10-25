package com.mobile.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

/**
 * Persists widget state in SharedPreferences and caches scaled artwork on disk
 * so home-screen widgets remain visible after reboots or when the playback service stops.
 */
object WidgetStorage {
  private const val PREFS_NAME = "sonare_widget_state"
  private const val KEY_TITLE = "title"
  private const val KEY_ARTIST = "artist"
  private const val KEY_ARTWORK_PATH = "artwork_path"
  private const val KEY_IS_PLAYING = "is_playing"
  private const val KEY_LIKED = "liked"
  private const val KEY_HAS_TRACK = "has_track"
  private const val ARTWORK_FILENAME = "widget_artwork.png"

  private val ioExecutor = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "sonare-widget-io").apply { isDaemon = true }
  }

  /**
   * Computes scaled target dimensions (width to height) constrained to [maxDim],
   * preserving aspect ratio.
   */
  fun calculateScaledDimensions(width: Int, height: Int, maxDim: Int): Pair<Int, Int> {
    if (width <= 0 || height <= 0 || maxDim <= 0) return width to height
    if (width <= maxDim && height <= maxDim) return width to height
    val ratio = width.toFloat() / height.toFloat()
    return if (ratio > 1f) {
      maxDim to (maxDim / ratio).toInt().coerceAtLeast(1)
    } else {
      (maxDim * ratio).toInt().coerceAtLeast(1) to maxDim
    }
  }

  /**
   * Scales [bitmap] so neither width nor height exceeds [maxDim], preserving aspect ratio.
   */
  fun scaleArtwork(bitmap: Bitmap, maxDim: Int = 300): Bitmap {
    if (maxDim <= 0) return bitmap
    val width = bitmap.width
    val height = bitmap.height
    if (width <= maxDim && height <= maxDim) return bitmap
    val (targetWidth, targetHeight) = calculateScaledDimensions(width, height, maxDim)
    return Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
  }

  /**
   * Clips [bitmap] with rounded corners of [radiusPx].
   */
  fun roundCorners(bitmap: Bitmap, radiusPx: Float): Bitmap {
    if (radiusPx <= 0f) return bitmap
    val output = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val rect = RectF(0f, 0f, bitmap.width.toFloat(), bitmap.height.toFloat())
    canvas.drawRoundRect(rect, radiusPx, radiusPx, paint)
    paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
    canvas.drawBitmap(bitmap, 0f, 0f, paint)
    return output
  }

  /**
   * Saves [state] to SharedPreferences and asynchronously writes the scaled artwork to disk.
   */
  fun saveState(context: Context, state: WidgetState) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val artworkFile = File(context.cacheDir, ARTWORK_FILENAME)

    val bitmapToSave = state.artworkBitmap
    if (bitmapToSave != null) {
      ioExecutor.execute {
        try {
          FileOutputStream(artworkFile).use { out ->
            bitmapToSave.compress(Bitmap.CompressFormat.PNG, 90, out)
          }
        } catch (_: Exception) {}
      }
    } else if (!state.hasTrack) {
      ioExecutor.execute {
        try {
          if (artworkFile.exists()) artworkFile.delete()
        } catch (_: Exception) {}
      }
    }

    prefs.edit()
      .putString(KEY_TITLE, state.title)
      .putString(KEY_ARTIST, state.artist)
      .putString(KEY_ARTWORK_PATH, if (state.artworkBitmap != null || (state.hasTrack && artworkFile.exists())) artworkFile.absolutePath else null)
      .putBoolean(KEY_IS_PLAYING, state.isPlaying)
      .putBoolean(KEY_LIKED, state.liked)
      .putBoolean(KEY_HAS_TRACK, state.hasTrack)
      .apply()
  }

  /**
   * Reads the last known widget state from SharedPreferences and disk cache.
   */
  fun loadState(context: Context): WidgetState {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val hasTrack = prefs.getBoolean(KEY_HAS_TRACK, false)
    val title = prefs.getString(KEY_TITLE, null)
    val artist = prefs.getString(KEY_ARTIST, null)
    val artworkPath = prefs.getString(KEY_ARTWORK_PATH, null)
    val isPlaying = prefs.getBoolean(KEY_IS_PLAYING, false)
    val liked = prefs.getBoolean(KEY_LIKED, false)

    var bitmap: Bitmap? = null
    if (artworkPath != null) {
      val file = File(artworkPath)
      if (file.exists()) {
        try {
          bitmap = BitmapFactory.decodeFile(file.absolutePath)
        } catch (_: Exception) {}
      }
    }

    return WidgetState(
      title = title,
      artist = artist,
      artworkBitmap = bitmap,
      isPlaying = isPlaying,
      liked = liked,
      hasTrack = hasTrack,
    )
  }
}
