package com.mobile.player

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.KeyEvent
import androidx.annotation.OptIn
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSourceBitmapLoader
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.ResolvingDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.session.CacheBitmapLoader
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.mobile.MainActivity

/**
 * Hosts the [PlaybackEngine] inside a media session. Media3 turns that into background
 * playback: a foreground service with the media notification, lock-screen and headset
 * controls, audio focus, and pausing when headphones are unplugged.
 *
 * The queue lives in JS; the engine only knows the current track and the next one.
 * Next/previous pressed outside the app are handed to JS through [RemoteCommands].
 */
@OptIn(UnstableApi::class)
class SonarePlaybackService : MediaSessionService() {
  private var session: MediaSession? = null
  private var engine: PlaybackEngine? = null

  override fun onCreate() {
    super.onCreate()
    // Artwork urls on our API redirect from http to https (i.ytimg.com); allow that hop.
    val http = DefaultHttpDataSource.Factory().setAllowCrossProtocolRedirects(true)
    // googlevideo sends a request without a Range header at ~35 KB/s; any Range gets full speed.
    // Media3 only sets one when it seeks, so add it to reads from the start. A url refused
    // mid-song goes to the fresh one JS fetched ([StreamUrls]).
    val resolvingHttp = ResolvingDataSource.Factory(http) { original ->
      val url = original.uri.toString()
      val fresh = StreamUrls.resolve(url)
      val dataSpec = if (fresh == url) original else original.withUri(Uri.parse(fresh))
      val host = dataSpec.uri.host
      if (host != null && host.endsWith(".googlevideo.com") && dataSpec.position == 0L) {
        val headers = dataSpec.httpRequestHeaders.toMutableMap()
        val hasRange = headers.keys.any { it.equals("Range", ignoreCase = true) }
        if (!hasRange) {
          headers["Range"] = "bytes=0-"
        }
        dataSpec.buildUpon().setHttpRequestHeaders(headers).build()
      } else {
        dataSpec
      }
    }
    // Streams go through the stream cache (files on the phone don't: DefaultDataSource only
    // uses this factory for http).
    val cachedHttp =
      CacheDataSource.Factory()
        .setCache(StreamCache.get(this))
        .setUpstreamDataSourceFactory(resolvingHttp)
        .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
    val dataSource = DefaultDataSource.Factory(this, cachedHttp)
    val artworkSource = DefaultDataSource.Factory(this, resolvingHttp)

    val engine = PlaybackEngine(this, dataSource)
    this.engine = engine
    PlaybackEngine.instance = engine

    val openApp =
      PendingIntent.getActivity(
        this,
        0,
        Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )

    val callback = HeadsetSessionCallback(engine)

    session =
      MediaSession.Builder(this, QueueForwardingPlayer(engine.active, engine))
        .setSessionActivity(openApp)
        .setCallback(callback)
        // Cached: without it every notification and session update downloads the artwork again
        // (the default loader is wrapped the same way; a custom one isn't).
        .setBitmapLoader(
          CacheBitmapLoader(DataSourceBitmapLoader(DataSourceBitmapLoader.DEFAULT_EXECUTOR_SERVICE.get(), artworkSource)),
        )
        .build()
    // A crossfade hands playback to the other player; the session (notification, lock
    // screen, the app's controller) follows it.
    engine.onActiveChanged = { player -> session?.player = QueueForwardingPlayer(player, engine) }
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Swiping the app away keeps music going; with nothing playing, shut down instead.
    val player = session?.player
    if (player == null || !player.playWhenReady || player.mediaItemCount == 0) stopSelf()
  }

  override fun onDestroy() {
    session?.release()
    session = null
    engine?.release()
    engine = null
    PlaybackEngine.instance = null
    super.onDestroy()
  }

  companion object {
    /** Stored actions for headset button presses, set from JS; survives service restarts. */
    @Volatile var headsetActions: HeadsetActions = HeadsetActions.DEFAULT
  }
}

/**
 * Handles media button events for headset hook and play/pause buttons.
 *
 * Counts rapid presses within 400 ms. When the window expires with no further presses,
 * runs the action assigned to 1, 2, or 3 presses (e.g. play/pause, next, previous, like).
 * Other buttons or long presses fall back to Media3 defaults.
 */
@OptIn(UnstableApi::class)
private class HeadsetSessionCallback(private val engine: PlaybackEngine) : MediaSession.Callback {
  private val handler = Handler(Looper.getMainLooper())
  private val detector = HeadsetButtonDetector(400L)

  private val commitTask = Runnable {
    val count = detector.takeCount()
    if (count <= 0) return@Runnable
    val action = SonarePlaybackService.headsetActions.actionForCount(count)
    executeAction(action)
  }

  override fun onMediaButtonEvent(
    session: MediaSession,
    controllerInfo: MediaSession.ControllerInfo,
    intent: Intent,
  ): Boolean {
    val keyEvent =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT, KeyEvent::class.java)
      } else {
        @Suppress("DEPRECATION")
        intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT) as? KeyEvent
      } ?: return super.onMediaButtonEvent(session, controllerInfo, intent)

    val keyCode = keyEvent.keyCode
    val isHeadsetButton = keyCode == KeyEvent.KEYCODE_HEADSETHOOK || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE

    if (!isHeadsetButton) {
      return super.onMediaButtonEvent(session, controllerInfo, intent)
    }

    // Long presses have repeatCount > 0 or are left to the system; only count initial down.
    if (keyEvent.action != KeyEvent.ACTION_DOWN || keyEvent.repeatCount != 0) {
      return super.onMediaButtonEvent(session, controllerInfo, intent)
    }

    handler.removeCallbacks(commitTask)
    detector.recordPress(SystemClock.uptimeMillis())
    handler.postDelayed(commitTask, 400L)
    return true
  }

  private fun executeAction(action: HeadsetAction) {
    when (action) {
      HeadsetAction.PLAY_PAUSE -> {
        // Forwarding player path: finish fade then toggle play/pause so volume ramps apply.
        engine.finishFade()
        if (engine.active.playWhenReady) {
          engine.pause()
        } else {
          engine.play()
        }
      }
      HeadsetAction.NEXT -> RemoteCommands.send("next")
      HeadsetAction.PREVIOUS -> RemoteCommands.send("previous")
      HeadsetAction.LIKE -> RemoteCommands.send("like")
      HeadsetAction.NONE -> { /* do nothing */ }
    }
  }
}

/**
 * Advertises next/previous so the notification and lock screen show them, even though the
 * player itself holds a single item, and routes the presses to JS.
 */
@OptIn(UnstableApi::class)
private class QueueForwardingPlayer(player: Player, private val engine: PlaybackEngine) : ForwardingPlayer(player) {
  private val queueCommands =
    intArrayOf(
      Player.COMMAND_SEEK_TO_NEXT,
      Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
      Player.COMMAND_SEEK_TO_PREVIOUS,
      Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM,
    )

  override fun getAvailableCommands(): Player.Commands =
    super.getAvailableCommands().buildUpon().addAll(*queueCommands).build()

  override fun isCommandAvailable(command: Int): Boolean =
    command in queueCommands || super.isCommandAvailable(command)

  // Any command from the user ends a crossfade at once rather than fighting it.
  override fun play() {
    engine.finishFade()
    engine.play()
  }

  override fun pause() {
    engine.finishFade()
    engine.pause()
  }

  override fun setPlayWhenReady(playWhenReady: Boolean) {
    engine.finishFade()
    engine.setPlayWhenReady(playWhenReady)
  }

  override fun seekTo(positionMs: Long) {
    engine.finishFade()
    super.seekTo(positionMs)
  }

  override fun seekTo(mediaItemIndex: Int, positionMs: Long) {
    engine.finishFade()
    super.seekTo(mediaItemIndex, positionMs)
  }

  override fun stop() {
    engine.finishFade()
    super.stop()
  }

  override fun seekToNext() = RemoteCommands.send("next")

  override fun seekToNextMediaItem() = RemoteCommands.send("next")

  override fun seekToPrevious() = RemoteCommands.send("previous")

  override fun seekToPreviousMediaItem() = RemoteCommands.send("previous")
}

/** Next/previous pressed outside the app, delivered to whoever is listening (the JS module). */
object RemoteCommands {
  @Volatile var listener: ((String) -> Unit)? = null

  fun send(command: String) {
    listener?.invoke(command)
  }
}
