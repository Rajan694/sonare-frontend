package com.mobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

/**
 * 4x2 detailed home-screen widget displaying artwork cover, title, artist,
 * skip-back, play/pause, skip-forward, and heart (like) toggle.
 */
class SonareWidgetLarge : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    super.onUpdate(context, appWidgetManager, appWidgetIds)
    SonareWidgetUpdater.updateLargeWidgets(context, appWidgetManager, appWidgetIds)
  }
}
