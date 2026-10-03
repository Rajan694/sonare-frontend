package com.mobile.player

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import com.mobile.player.dsp.SonareAudioProcessor
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** How tracks follow each other; set from JS (SonarePlayerModule.setTransitions). */
data class Transitions(val crossfadeMs: Long = 0, val gapless: Boolean = false)

/**
 * The service's audio engine: two ExoPlayers, each with [SonareAudioProcessor] in its audio
 * pipeline, so the Audio screen's effects apply to whatever plays.
 *
 * The queue lives in JS, which tells the engine the current track ([load]) and the one after
 * it ([setNext]). From those the engine moves on by itself:
 *  - **gapless**: the next track is queued in the same player, which starts it with no gap;
 *  - **crossfade**: near the end of the track the other player starts the next one and the
 *    two fade over each other ([Transitions.crossfadeMs]);
 *  - with both on, two tracks from the same album play gapless and anything else crossfades;
 *  - with neither, the track ends and JS loads the next one, as before.
 * Each time the engine moves on it reports the new track through [EngineEvents] before anything
 * else, so JS can update its queue instead of loading the track again.
 *
 * Only one player is "active" (the one the media session shows). During a crossfade the
 * other one fades out in the background and is stopped at the end. Main thread only.
 */
@OptIn(UnstableApi::class)
class PlaybackEngine(private val context: Context, private val dataSourceFactory: DataSource.Factory) {
  private val main = Handler(Looper.getMainLooper())
  private val attributes =
    AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build()

  var active: ExoPlayer = buildPlayer()
    private set
  private var standby: ExoPlayer = buildPlayer()

  /** The player that is fading out during a crossfade; null otherwise. */
  private var fadingOut: ExoPlayer? = null
  private var fadeElapsedMs = 0L
  private var fadeLengthMs = 0L

  private var next: MediaItem? = null
  private var transitions = pendingTransitions
  private var speed = pendingSpeed

  /** Called with the new active player when a crossfade hands over (the session follows it). */
  var onActiveChanged: ((ExoPlayer) -> Unit)? = null


  init {
    // Only the active player holds audio focus; see startCrossfade().
    active.setAudioAttributes(attributes, true)
    active.addListener(activeListener(active))
    standby.addListener(activeListener(standby))
    setSpeed(speed)
  }

  private fun buildPlayer(): ExoPlayer {
    val renderers =
      object : DefaultRenderersFactory(context) {
        override fun buildAudioSink(
          context: Context,
          enableFloatOutput: Boolean,
          enableAudioTrackPlaybackParams: Boolean,
        ): AudioSink =
          DefaultAudioSink.Builder(context)
            .setAudioProcessors(arrayOf(SonareAudioProcessor()))
            .setEnableFloatOutput(enableFloatOutput)
            .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
            .build()
      }
    return ExoPlayer.Builder(context, renderers)
      .setMediaSourceFactory(DefaultMediaSourceFactory(dataSourceFactory))
      .setAudioAttributes(attributes, /* handleAudioFocus= */ false)
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_NETWORK)
      .build()
  }

  /** Gapless hand-over inside one player: drop the finished item and report the new one. */
  private fun activeListener(player: ExoPlayer) =
    object : Player.Listener {
      override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
        if (player !== active || reason != Player.MEDIA_ITEM_TRANSITION_REASON_AUTO || mediaItem == null) return
        if (player.currentMediaItemIndex > 0) player.removeMediaItems(0, player.currentMediaItemIndex)
        next = null
        EngineEvents.advance(mediaItem.mediaId)
      }

      override fun onIsPlayingChanged(isPlaying: Boolean) {
        if (player === active && isPlaying) startWatching()
      }
    }

  // ---- commands from JS ----

  /** Replaces whatever plays with one track. */
  fun load(item: MediaItem, startMs: Long, autoplay: Boolean) {
    finishFade()
    next = null
    active.setMediaItem(item, startMs)
    active.prepare()
    active.playWhenReady = autoplay
  }

  /** The track to move on to after the current one, or null (end of queue, repeat one). */
  fun setNext(item: MediaItem?) {
    next = item
    syncQueuedNext()
  }

  fun setTransitions(value: Transitions) {
    transitions = value
    syncQueuedNext()
  }

  /** Playback speed; Media3 time-stretches, so pitch stays the same. */
  fun setSpeed(value: Float) {
    speed = value
    active.setPlaybackSpeed(value)
    standby.setPlaybackSpeed(value)
  }

  /** Called by the session player before any user command (play, pause, seek, stop…). */
  fun finishFade() {
    val out = fadingOut ?: return
    fadingOut = null
    main.removeCallbacks(fadeTick)
    out.stop()
    out.clearMediaItems()
    out.volume = 1f
    active.volume = 1f
  }

  fun release() {
    main.removeCallbacksAndMessages(null)
    active.release()
    standby.release()
  }

  // ---- transitions ----

  private fun sameAlbum(a: MediaItem?, b: MediaItem?): Boolean {
    val x = a?.mediaMetadata?.albumTitle?.toString()
    val y = b?.mediaMetadata?.albumTitle?.toString()
    return !x.isNullOrBlank() && x == y
  }

  private fun crossfadeNext(): Boolean =
    transitions.crossfadeMs > 0 && next != null && !(transitions.gapless && sameAlbum(active.currentMediaItem, next))

  private fun gaplessNext(): Boolean = transitions.gapless && next != null && !crossfadeNext()

  /** Keeps the item after the current one in the active player only when it should play gapless. */
  private fun syncQueuedNext() {
    val p = active
    if (p.mediaItemCount == 0) return
    val after = p.currentMediaItemIndex + 1
    if (p.mediaItemCount > after) p.removeMediaItems(after, p.mediaItemCount)
    if (gaplessNext()) p.addMediaItem(next!!)
  }

  private val watchTick =
    object : Runnable {
      override fun run() {
        val p = active
        if (!p.isPlaying) return // resumes from onIsPlayingChanged
        val duration = p.duration
        if (fadingOut == null && crossfadeNext() && duration != C.TIME_UNSET) {
          val remaining = duration - p.currentPosition
          // Leave out very short tracks: the fade would swallow them.
          if (remaining <= transitions.crossfadeMs && duration > transitions.crossfadeMs * 2) {
            startCrossfade(remaining)
            return
          }
        }
        main.postDelayed(this, WATCH_INTERVAL_MS)
      }
    }

  private fun startWatching() {
    main.removeCallbacks(watchTick)
    main.post(watchTick)
  }

  private fun startCrossfade(remainingMs: Long) {
    val item = next ?: return
    val incoming = standby
    val outgoing = active
    next = null

    incoming.setMediaItem(item)
    incoming.setPlaybackSpeed(speed)
    incoming.volume = 0f
    incoming.prepare()
    incoming.play()

    // Hand the session and audio focus to the incoming track now, so the lock screen and
    // the app show it; the outgoing one keeps playing quietly until the fade is done.
    outgoing.setAudioAttributes(attributes, false)
    incoming.setAudioAttributes(attributes, true)
    active = incoming
    standby = outgoing
    fadingOut = outgoing
    fadeElapsedMs = 0
    fadeLengthMs = remainingMs.coerceAtLeast(WATCH_INTERVAL_MS)

    EngineEvents.advance(item.mediaId)
    onActiveChanged?.invoke(incoming)
    main.post(fadeTick)
  }

  private val fadeTick =
    object : Runnable {
      override fun run() {
        val out = fadingOut ?: return
        // The clock only runs while the new track is audible, so a slow start doesn't skip the fade-in.
        if (active.isPlaying) fadeElapsedMs += FADE_STEP_MS
        val t = (fadeElapsedMs.toDouble() / fadeLengthMs).coerceIn(0.0, 1.0)
        // Equal-power curve: the sum stays about as loud as either track alone.
        active.volume = sin(t * PI / 2).toFloat()
        out.volume = cos(t * PI / 2).toFloat()
        if (t >= 1.0 || out.playbackState == Player.STATE_ENDED) {
          finishFade()
          startWatching()
        } else {
          main.postDelayed(this, FADE_STEP_MS)
        }
      }
    }

  companion object {
    private const val WATCH_INTERVAL_MS = 100L
    private const val FADE_STEP_MS = 50L

    /** The running engine, created by [SonarePlaybackService]; null while the service is down. */
    @Volatile var instance: PlaybackEngine? = null

    // JS sends these at start-up, possibly before the service exists; a new engine starts with them.
    @Volatile var pendingTransitions = Transitions()
    @Volatile var pendingSpeed = 1f
  }
}

/** The track the engine moved on to by itself, delivered to whoever listens (the JS module). */
object EngineEvents {
  @Volatile var advanceListener: ((String) -> Unit)? = null

  fun advance(mediaId: String) {
    advanceListener?.invoke(mediaId)
  }
}
