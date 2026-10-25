package com.mobile.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.mobile.player.SonarePlaybackService

/**
 * The widgets' play/pause, next, previous and heart buttons. A broadcast rather than a service
 * start: starting the playback service from a widget would oblige it to go foreground within
 * seconds even for "next" while paused, or crash. The buttons are only wired here while the
 * service runs ([SonareWidgetUpdater]); otherwise they open the app.
 */
class SonareWidgetReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    val service = SonarePlaybackService.instance
    if (service != null) {
      service.handleWidgetAction(action)
    } else {
      // The player went away since the widget was drawn: draw it again with "open the app" buttons.
      SonareWidgetUpdater.updateAll(context, WidgetStorage.loadState(context))
    }
  }
}
