package com.mobile.player

import android.app.PendingIntent
import android.content.Intent
import androidx.annotation.OptIn
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSourceBitmapLoader
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
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
    val dataSource = DefaultDataSource.Factory(this, http)

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

    session =
      MediaSession.Builder(this, QueueForwardingPlayer(engine.active, engine))
        .setSessionActivity(openApp)
        .setBitmapLoader(DataSourceBitmapLoader(DataSourceBitmapLoader.DEFAULT_EXECUTOR_SERVICE.get(), dataSource))
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
    super.play()
  }

  override fun pause() {
    engine.finishFade()
    super.pause()
  }

  override fun setPlayWhenReady(playWhenReady: Boolean) {
    engine.finishFade()
    super.setPlayWhenReady(playWhenReady)
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
