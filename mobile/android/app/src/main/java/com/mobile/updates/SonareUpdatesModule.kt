package com.mobile.updates

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.MessageDigest

/**
 * App updates for JS (src/native/SonareUpdates.ts): the new APK is fetched by Android's
 * DownloadManager (it carries on with the app in the background and shows its own notification)
 * into this app's own Downloads folder, checked against the sha256 the backend recorded, and
 * handed to the system installer. Android asks the user once to let Sonare install apps.
 */
class SonareUpdatesModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  private val manager get() = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

  @ReactMethod
  fun download(url: String, fileName: String, title: String, promise: Promise) {
    try {
      val request =
        DownloadManager.Request(Uri.parse(url))
          .setTitle(title)
          .setMimeType(APK_MIME)
          .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
          .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, fileName)
      promise.resolve(manager.enqueue(request).toDouble())
    } catch (e: Exception) {
      promise.reject("E_DOWNLOAD", e.message ?: "Could not start the download", e)
    }
  }

  /** { state: pending | running | paused | done | failed | missing, bytes, total, reason }. */
  @ReactMethod
  fun status(id: Double, promise: Promise) {
    val map = Arguments.createMap()
    manager.query(DownloadManager.Query().setFilterById(id.toLong())).use { c ->
      if (c == null || !c.moveToFirst()) {
        map.putString("state", "missing")
        promise.resolve(map)
        return
      }
      val status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
      map.putString(
        "state",
        when (status) {
          DownloadManager.STATUS_PENDING -> "pending"
          DownloadManager.STATUS_RUNNING -> "running"
          DownloadManager.STATUS_PAUSED -> "paused"
          DownloadManager.STATUS_SUCCESSFUL -> "done"
          else -> "failed"
        },
      )
      map.putDouble("bytes", c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)).toDouble())
      map.putDouble("total", c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)).toDouble())
      map.putInt("reason", c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)))
    }
    promise.resolve(map)
  }

  /** Hex sha256 of a finished download, read off the main thread. */
  @ReactMethod
  fun checksum(id: Double, promise: Promise) {
    Thread {
      try {
        val digest = MessageDigest.getInstance("SHA-256")
        manager.openDownloadedFile(id.toLong()).use { pfd ->
          java.io.FileInputStream(pfd.fileDescriptor).use { input ->
            val buf = ByteArray(256 * 1024)
            while (true) {
              val n = input.read(buf)
              if (n < 0) break
              digest.update(buf, 0, n)
            }
          }
        }
        promise.resolve(digest.digest().joinToString("") { "%02x".format(it) })
      } catch (e: Exception) {
        promise.reject("E_CHECKSUM", e.message ?: "Could not read the download", e)
      }
    }.start()
  }

  /**
   * Open the system installer for a finished download. Resolves "permission" instead when
   * Android first needs the user to let Sonare install apps (its settings page is opened).
   */
  @ReactMethod
  fun install(id: Double, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
        val settings =
          Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(settings)
        promise.resolve("permission")
        return
      }
      val uri = manager.getUriForDownloadedFile(id.toLong())
      if (uri == null) {
        promise.reject("E_MISSING", "The download is gone. Download it again.")
        return
      }
      val intent =
        Intent(Intent.ACTION_VIEW)
          .setDataAndType(uri, APK_MIME)
          .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      promise.resolve("started")
    } catch (e: Exception) {
      promise.reject("E_INSTALL", e.message ?: "Could not open the installer", e)
    }
  }

  @ReactMethod
  fun remove(id: Double, promise: Promise) {
    manager.remove(id.toLong())
    promise.resolve(null)
  }

  companion object {
    const val NAME = "SonareUpdates"
    private const val APK_MIME = "application/vnd.android.package-archive"
  }
}
