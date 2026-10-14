package com.mobile.player

import java.util.concurrent.ConcurrentHashMap

/**
 * Stream urls swapped while a track plays. googlevideo sometimes refuses a url partway
 * through a song (403); ExoPlayer retries the load a few times, JS hears about it
 * (`SonarePlayer.streamRefused`), fetches a fresh url for the same file and puts it here,
 * and the next retry goes to it. Playback carries on from the buffer meanwhile, instead of
 * stopping and reloading the track. Keyed by the url the track was loaded with.
 */
object StreamUrls {
  private const val MAX_KEPT = 50
  private val replaced = ConcurrentHashMap<String, String>()

  fun replace(original: String, fresh: String) {
    if (replaced.size >= MAX_KEPT) replaced.clear()
    replaced[original] = fresh
  }

  /** The url to fetch for a track loaded with `url`. */
  fun resolve(url: String): String = replaced[url] ?: url
}
