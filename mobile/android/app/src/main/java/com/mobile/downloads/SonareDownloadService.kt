package com.mobile.downloads

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Keeps downloads going while Sonare is in the background. Since Android 15 an app in the
 * background loses network access within seconds unless it runs a foreground service, so
 * the download queue runs under this one (type dataSync) for as long as anything is queued,
 * with a "Downloading N songs" notification. JS reports the queue size through
 * SonareDownloadsModule.setActive(), which calls [sync].
 */
class SonareDownloadService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // startForegroundService() must be answered with startForeground(), even if the queue
    // emptied while the service was starting.
    val count = wanted
    try {
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        build(maxOf(count, 1)),
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC else 0,
      )
    } catch (e: Exception) {
      // Not allowed right now (e.g. the dataSync time limit is used up): downloads carry on
      // while the app is open.
      finish()
      return START_NOT_STICKY
    }
    if (count <= 0) finish()
    return START_NOT_STICKY
  }

  /** Android 15+: dataSync services get about 6 hours a day. Downloads resume when the app is next open. */
  override fun onTimeout(startId: Int, fgsType: Int) {
    finish()
  }

  override fun onDestroy() {
    if (instance === this) instance = null
    super.onDestroy()
  }

  private fun show(count: Int) {
    getSystemService(NotificationManager::class.java)?.notify(NOTIFICATION_ID, build(count))
  }

  private fun finish() {
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun build(count: Int): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(NotificationManager::class.java)
      if (manager?.getNotificationChannel(CHANNEL_ID) == null) {
        manager?.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Downloads", NotificationManager.IMPORTANCE_LOW))
      }
    }
    val open =
      packageManager.getLaunchIntentForPackage(packageName)?.let {
        PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_download)
      .setContentTitle(if (count == 1) "Downloading 1 song" else "Downloading $count songs")
      .setProgress(0, 0, true)
      .setOngoing(true)
      .setSilent(true)
      .setContentIntent(open)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "downloads"
    private const val NOTIFICATION_ID = 0x5d2

    @Volatile private var instance: SonareDownloadService? = null
    @Volatile private var wanted = 0

    /** Queued + running downloads. Starts the service at > 0, updates it, and stops it at 0. */
    fun sync(context: Context, count: Int) {
      wanted = count
      val running = instance
      when {
        running != null && count <= 0 -> running.finish()
        running != null -> running.show(count)
        count > 0 ->
          try {
            ContextCompat.startForegroundService(context, Intent(context, SonareDownloadService::class.java))
          } catch (e: Exception) {
            // Can't start one from the background (Android 12+); it starts the next time
            // the queue changes while the app is open.
          }
      }
    }
  }
}
