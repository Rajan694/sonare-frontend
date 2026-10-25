package com.mobile.widget

import android.graphics.Bitmap

/**
 * Snapshot of playback state rendered by Sonare's home-screen widgets.
 */
data class WidgetState(
  val title: String? = null,
  val artist: String? = null,
  val artworkBitmap: Bitmap? = null,
  val isPlaying: Boolean = false,
  val liked: Boolean = false,
  val hasTrack: Boolean = false,
)
