package com.mobile.player

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File

/**
 * What the player has streamed, kept on the phone (up to [MAX_BYTES], least recently played
 * goes first), so a song played again doesn't download again. Entries are keyed by the
 * track and its stream format (the `cacheKey` JS passes with each load), not by url: YouTube
 * hands out a new url every time. Downloads are separate and never count against this.
 */
@OptIn(UnstableApi::class)
object StreamCache {
  const val MAX_BYTES = 300L * 1024 * 1024

  @Volatile private var cache: SimpleCache? = null

  /** One instance per folder per process; SimpleCache refuses a second one. */
  fun get(context: Context): SimpleCache =
    cache
      ?: synchronized(this) {
        cache
          ?: SimpleCache(
            File(context.applicationContext.cacheDir, "stream-cache"),
            LeastRecentlyUsedCacheEvictor(MAX_BYTES),
            StandaloneDatabaseProvider(context.applicationContext),
          ).also { cache = it }
      }

  fun bytes(context: Context): Long = get(context).cacheSpace

  /** Removes everything not being read right now. */
  fun clear(context: Context) {
    val c = get(context)
    for (key in c.keys.toList()) {
      try {
        c.removeResource(key)
      } catch (_: Exception) {
        // In use by the playing track; it stays until evicted.
      }
    }
  }
}
