package com.mobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.mobile.MainActivity
import com.mobile.R
import com.mobile.player.SonarePlaybackService

/**
 * Renders RemoteViews and binds pending intents for Sonare's home-screen widgets.
 */
object SonareWidgetUpdater {
  const val ACTION_PLAY_PAUSE = "com.mobile.widget.PLAY_PAUSE"
  const val ACTION_NEXT = "com.mobile.widget.NEXT"
  const val ACTION_PREVIOUS = "com.mobile.widget.PREVIOUS"
  const val ACTION_LIKE = "com.mobile.widget.LIKE"

  val WIDGET_ACTIONS = setOf(ACTION_PLAY_PAUSE, ACTION_NEXT, ACTION_PREVIOUS, ACTION_LIKE)

  fun updateAll(context: Context, state: WidgetState) {
    val manager = AppWidgetManager.getInstance(context) ?: return
    val smallIds = manager.getAppWidgetIds(ComponentName(context, SonareWidgetSmall::class.java))
    if (smallIds != null && smallIds.isNotEmpty()) {
      updateSmall(context, manager, smallIds, state)
    }
    val largeIds = manager.getAppWidgetIds(ComponentName(context, SonareWidgetLarge::class.java))
    if (largeIds != null && largeIds.isNotEmpty()) {
      updateLarge(context, manager, largeIds, state)
    }
  }

  fun updateSmallWidgets(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    val state = SonarePlaybackService.currentWidgetState ?: WidgetStorage.loadState(context)
    updateSmall(context, manager, appWidgetIds, state)
  }

  fun updateLargeWidgets(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    val state = SonarePlaybackService.currentWidgetState ?: WidgetStorage.loadState(context)
    updateLarge(context, manager, appWidgetIds, state)
  }

  private fun updateSmall(
    context: Context,
    manager: AppWidgetManager,
    appWidgetIds: IntArray,
    state: WidgetState,
  ) {
    val views = RemoteViews(context.packageName, R.layout.widget_small)
    val openApp = activityIntent(context, 100)
    val live = state.hasTrack && SonarePlaybackService.instance != null

    views.setOnClickPendingIntent(R.id.widget_small_root, openApp)
    views.setOnClickPendingIntent(R.id.widget_small_artwork, openApp)

    if (live) {
      views.setImageViewResource(
        R.id.widget_small_play_pause,
        if (state.isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play,
      )
      views.setOnClickPendingIntent(
        R.id.widget_small_play_pause,
        buttonIntent(context, ACTION_PLAY_PAUSE, 101),
      )
      views.setOnClickPendingIntent(
        R.id.widget_small_next,
        buttonIntent(context, ACTION_NEXT, 102),
      )
    } else {
      views.setImageViewResource(R.id.widget_small_play_pause, R.drawable.ic_widget_play)
      views.setOnClickPendingIntent(R.id.widget_small_play_pause, openApp)
      views.setOnClickPendingIntent(R.id.widget_small_next, openApp)
    }

    if (state.artworkBitmap != null) {
      val density = context.resources.displayMetrics.density
      val rounded = WidgetStorage.roundCorners(state.artworkBitmap, 8f * density)
      views.setImageViewBitmap(R.id.widget_small_artwork, rounded)
    } else {
      views.setImageViewResource(R.id.widget_small_artwork, R.drawable.widget_artwork_placeholder)
    }

    manager.updateAppWidget(appWidgetIds, views)
  }

  private fun updateLarge(
    context: Context,
    manager: AppWidgetManager,
    appWidgetIds: IntArray,
    state: WidgetState,
  ) {
    val views = RemoteViews(context.packageName, R.layout.widget_large)
    val openApp = activityIntent(context, 200)
    // The last song stays on show after the player is gone (or a reboot); its buttons then open the app.
    val live = state.hasTrack && SonarePlaybackService.instance != null

    views.setOnClickPendingIntent(R.id.widget_large_root, openApp)
    views.setOnClickPendingIntent(R.id.widget_large_artwork, openApp)

    if (state.hasTrack) {
      views.setTextViewText(R.id.widget_large_title, state.title ?: "Unknown Title")
      views.setTextViewText(R.id.widget_large_artist, state.artist ?: "")
    } else {
      views.setTextViewText(R.id.widget_large_title, "Sonare")
      views.setTextViewText(R.id.widget_large_artist, "No track playing")
    }

    if (live) {
      views.setImageViewResource(
        R.id.widget_large_play_pause,
        if (state.isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play,
      )
      views.setImageViewResource(
        R.id.widget_large_heart,
        if (state.liked) R.drawable.ic_widget_heart_filled else R.drawable.ic_widget_heart,
      )

      views.setOnClickPendingIntent(
        R.id.widget_large_previous,
        buttonIntent(context, ACTION_PREVIOUS, 201),
      )
      views.setOnClickPendingIntent(
        R.id.widget_large_play_pause,
        buttonIntent(context, ACTION_PLAY_PAUSE, 202),
      )
      views.setOnClickPendingIntent(
        R.id.widget_large_next,
        buttonIntent(context, ACTION_NEXT, 203),
      )
      views.setOnClickPendingIntent(
        R.id.widget_large_heart,
        buttonIntent(context, ACTION_LIKE, 204),
      )
    } else {
      views.setImageViewResource(R.id.widget_large_play_pause, R.drawable.ic_widget_play)
      views.setImageViewResource(R.id.widget_large_heart, R.drawable.ic_widget_heart)

      views.setOnClickPendingIntent(R.id.widget_large_previous, openApp)
      views.setOnClickPendingIntent(R.id.widget_large_play_pause, openApp)
      views.setOnClickPendingIntent(R.id.widget_large_next, openApp)
      views.setOnClickPendingIntent(R.id.widget_large_heart, openApp)
    }

    if (state.artworkBitmap != null) {
      val density = context.resources.displayMetrics.density
      val rounded = WidgetStorage.roundCorners(state.artworkBitmap, 10f * density)
      views.setImageViewBitmap(R.id.widget_large_artwork, rounded)
    } else {
      views.setImageViewResource(R.id.widget_large_artwork, R.drawable.widget_artwork_placeholder)
    }

    manager.updateAppWidget(appWidgetIds, views)
  }

  /** A button press, delivered to [SonareWidgetReceiver]. */
  private fun buttonIntent(context: Context, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, SonareWidgetReceiver::class.java).setAction(action)
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun activityIntent(context: Context, requestCode: Int): PendingIntent {
    val intent = Intent(context, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
