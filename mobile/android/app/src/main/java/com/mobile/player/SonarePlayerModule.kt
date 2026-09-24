package com.mobile.player

import android.content.ComponentName
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.google.common.util.concurrent.ListenableFuture

/**
 * JS face of [SonarePlaybackService]. Talks to the service through a MediaController, which
 * also starts it, so playback outlives the activity. Emits:
 *  - `SonarePlayer.state`    { playWhenReady, isPlaying, buffering, ended, mediaId }
 *  - `SonarePlayer.progress` { positionMs, durationMs, bufferedMs } every 500ms while playing
 *  - `SonarePlayer.error`    { message }
 *  - `SonarePlayer.remote`   { command: "next" | "previous" } from notification / lock screen
 */
class SonarePlayerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val main = Handler(Looper.getMainLooper())
  private var controller: MediaController? = null
  private var connecting: ListenableFuture<MediaController>? = null
  private val pending = mutableListOf<(MediaController) -> Unit>()

  override fun getName() = NAME

  /** Runs [block] on the main thread once a controller is connected (MediaController is main-thread only). */
  private fun withController(block: (MediaController) -> Unit) {
    main.post {
      val c = controller
      if (c != null) {
        block(c)
        return@post
      }
      pending += block
      if (connecting == null) connect()
    }
  }

  private fun connect() {
    val token = SessionToken(context, ComponentName(context, SonarePlaybackService::class.java))
    val future = MediaController.Builder(context, token).buildAsync()
    connecting = future
    future.addListener(
      {
        connecting = null
        val c =
          try {
            future.get()
          } catch (e: Exception) {
            pending.clear()
            emit(EVENT_ERROR, Arguments.createMap().apply { putString("message", "Player unavailable: ${e.message}") })
            return@addListener
          }
        controller = c
        c.addListener(listener)
        RemoteCommands.listener = { command ->
          emit(EVENT_REMOTE, Arguments.createMap().apply { putString("command", command) })
        }
        pending.forEach { it(c) }
        pending.clear()
      },
      ContextCompat.getMainExecutor(context),
    )
  }

  private val listener =
    object : Player.Listener {
      override fun onEvents(player: Player, events: Player.Events) {
        if (
          events.containsAny(
            Player.EVENT_PLAY_WHEN_READY_CHANGED,
            Player.EVENT_PLAYBACK_STATE_CHANGED,
            Player.EVENT_IS_PLAYING_CHANGED,
            Player.EVENT_MEDIA_ITEM_TRANSITION,
          )
        ) {
          emitState(player)
        }
        if (events.contains(Player.EVENT_IS_PLAYING_CHANGED)) {
          if (player.isPlaying) startProgress() else stopProgress()
          emitProgress(player)
        }
      }

      override fun onPlayerError(error: PlaybackException) {
        emit(EVENT_ERROR, Arguments.createMap().apply { putString("message", "${error.errorCodeName}: ${error.message}") })
      }
    }

  private val progressTick =
    object : Runnable {
      override fun run() {
        controller?.let { emitProgress(it) }
        main.postDelayed(this, PROGRESS_INTERVAL_MS)
      }
    }

  private fun startProgress() {
    main.removeCallbacks(progressTick)
    main.post(progressTick)
  }

  private fun stopProgress() = main.removeCallbacks(progressTick)

  private fun emitState(player: Player) {
    emit(
      EVENT_STATE,
      Arguments.createMap().apply {
        putBoolean("playWhenReady", player.playWhenReady)
        putBoolean("isPlaying", player.isPlaying)
        putBoolean("buffering", player.playbackState == Player.STATE_BUFFERING)
        putBoolean("ended", player.playbackState == Player.STATE_ENDED)
        putString("mediaId", player.currentMediaItem?.mediaId)
      },
    )
  }

  private fun emitProgress(player: Player) {
    val duration = player.duration.takeIf { it != C.TIME_UNSET } ?: 0L
    emit(
      EVENT_PROGRESS,
      Arguments.createMap().apply {
        putDouble("positionMs", player.currentPosition.toDouble())
        putDouble("durationMs", duration.toDouble())
        putDouble("bufferedMs", player.bufferedPosition.toDouble())
      },
    )
  }

  private fun emit(event: String, payload: WritableMap?) {
    if (context.hasActiveReactInstance()) context.emitDeviceEvent(event, payload)
  }

  /** Replace whatever is loaded with one track; the lock screen shows its metadata. */
  @ReactMethod
  fun load(options: ReadableMap, promise: Promise) {
    val url = options.getString("url")
    if (url.isNullOrEmpty()) {
      promise.reject("E_NO_URL", "load() needs a url")
      return
    }
    val metadata =
      MediaMetadata.Builder()
        .setTitle(options.getString("title"))
        .setArtist(options.getString("artist"))
        .setAlbumTitle(if (options.hasKey("album")) options.getString("album") else null)
        .setArtworkUri(if (options.hasKey("artworkUrl")) options.getString("artworkUrl")?.let(Uri::parse) else null)
        .build()
    val item =
      MediaItem.Builder()
        .setMediaId(if (options.hasKey("id")) options.getString("id") ?: url else url)
        .setUri(url)
        .setMediaMetadata(metadata)
        .build()
    val startMs = if (options.hasKey("startMs")) options.getDouble("startMs").toLong() else 0L
    val autoplay = !options.hasKey("autoplay") || options.getBoolean("autoplay")

    withController { c ->
      c.setMediaItem(item, startMs)
      c.prepare()
      c.playWhenReady = autoplay
      promise.resolve(null)
    }
  }

  @ReactMethod fun play() = withController { it.play() }

  @ReactMethod fun pause() = withController { it.pause() }

  @ReactMethod
  fun seekTo(positionMs: Double) = withController {
    it.seekTo(positionMs.toLong())
    emitProgress(it)
  }

  /** Stop and unload; the notification goes away with it. */
  @ReactMethod
  fun stop() = withController {
    it.stop()
    it.clearMediaItems()
  }

  // Required by NativeEventEmitter.
  @ReactMethod fun addListener(eventName: String) {}

  @ReactMethod fun removeListeners(count: Double) {}

  override fun invalidate() {
    main.post {
      stopProgress()
      RemoteCommands.listener = null
      controller?.release()
      controller = null
    }
    super.invalidate()
  }

  companion object {
    const val NAME = "SonarePlayer"
    private const val PROGRESS_INTERVAL_MS = 500L
    private const val EVENT_STATE = "SonarePlayer.state"
    private const val EVENT_PROGRESS = "SonarePlayer.progress"
    private const val EVENT_ERROR = "SonarePlayer.error"
    private const val EVENT_REMOTE = "SonarePlayer.remote"
  }
}
