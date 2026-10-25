package com.mobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

/**
 * 2x1 compact home-screen widget displaying artwork cover, play/pause, and skip-forward.
 */
class SonareWidgetSmall : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    super.onUpdate(context, appWidgetManager, appWidgetIds)
    SonareWidgetUpdater.updateSmallWidgets(context, appWidgetManager, appWidgetIds)
  }
}
