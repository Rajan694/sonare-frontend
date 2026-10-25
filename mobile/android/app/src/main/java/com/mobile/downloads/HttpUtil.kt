package com.mobile.downloads

import android.util.Log
import java.net.HttpURLConnection
import java.net.URL

/**
 * Shared HTTP helper for fetching binary resources (such as cover art) over HTTP/HTTPS,
 * following redirects with a 10s timeout and a mobile user-agent.
 */
object HttpUtil {
  private const val TAG = "HttpUtil"
  const val DEFAULT_TIMEOUT_MS = 10_000
  const val MAX_REDIRECTS = 5

  /**
   * Fetches the raw bytes of a remote URL, following up to [maxRedirects] redirects.
   * Returns null on HTTP errors, timeouts, or empty responses. Never throws.
   */
  fun fetchBytes(
    urlStr: String?,
    timeoutMs: Int = DEFAULT_TIMEOUT_MS,
    maxRedirects: Int = MAX_REDIRECTS,
    userAgent: String = "Sonare/Mobile"
  ): ByteArray? {
    if (urlStr.isNullOrEmpty()) return null
    var currentUrl = urlStr
    var redirects = 0
    while (redirects < maxRedirects) {
      var conn: HttpURLConnection? = null
      try {
        val url = URL(currentUrl)
        conn = (url.openConnection() as HttpURLConnection).apply {
          instanceFollowRedirects = false
          connectTimeout = timeoutMs
          readTimeout = timeoutMs
          setRequestProperty("User-Agent", userAgent)
        }
        val code = conn.responseCode
        if (code in 300..399) {
          val location = conn.getHeaderField("Location") ?: return null
          currentUrl = URL(url, location).toString()
          redirects++
          continue
        }
        if (code != 200) return null
        val bytes = conn.inputStream.use { it.readBytes() }
        if (bytes.isEmpty()) return null
        return bytes
      } catch (e: Exception) {
        Log.w(TAG, "Failed to fetch bytes from $currentUrl: ${e.message}")
        return null
      } finally {
        conn?.disconnect()
      }
    }
    return null
  }
}
