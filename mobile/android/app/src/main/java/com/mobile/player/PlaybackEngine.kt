package com.mobile.player

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.HttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.LoadEventInfo
import androidx.media3.exoplayer.source.MediaLoadData
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import com.mobile.player.dsp.SonareAudioProcessor
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin

/** How tracks follow each other; set from JS (SonarePlayerModule.setTransitions). */
data class Transitions(val crossfadeMs: Long = 0, val gapless: Boolean = false)

private enum class RampType { IN, OUT }

/** A play / pause / skip fade on one player; [onDone] runs when it ends (pause, load the next track). */
private data class Ramp(val player: ExoPlayer, val type: RampType, val onDone: (() -> Unit)? = null)

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
  private var pitch = pendingPitch
  private var fades = pendingFades

  /** The play / pause / skip fade running now ([setFades]); null when the volume is steady. */
  private var currentRamp: Ramp? = null
  private var rampElapsedMs = 0L

  /** Called with the new active player when a crossfade hands over (the session follows it). */
  var onActiveChanged: ((ExoPlayer) -> Unit)? = null


  /** A stream url the server refused (403/410): tell JS, which swaps in a fresh one ([StreamUrls]). */
  private val refusedStreams =
    object : AnalyticsListener {
      override fun onLoadError(
        eventTime: AnalyticsListener.EventTime,
        loadEventInfo: LoadEventInfo,
        mediaLoadData: MediaLoadData,
        error: java.io.IOException,
        wasCanceled: Boolean,
      ) {
        val status = (error as? HttpDataSource.InvalidResponseCodeException)?.responseCode ?: return
        if (status != 403 && status != 410) return
        val timeline = eventTime.timeline
        val mediaId =
          if (timeline.isEmpty || eventTime.windowIndex >= timeline.windowCount) null
          else timeline.getWindow(eventTime.windowIndex, Timeline.Window()).mediaItem.mediaId
        EngineEvents.streamRefused(mediaId, loadEventInfo.dataSpec.uri.toString())
      }
    }

  init {
    // Only the active player holds audio focus; see startCrossfade().
    active.setAudioAttributes(attributes, true)
    active.addListener(activeListener(active))
    standby.addListener(activeListener(standby))
    active.addAnalyticsListener(refusedStreams)
    standby.addAnalyticsListener(refusedStreams)
    applyPlaybackParameters(active)
    applyPlaybackParameters(standby)
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
    // Two minutes ahead instead of ExoPlayer's 50 s: a slow or dropped connection mid-song has
    // that long to recover in. Not the whole song: a song skipped or stopped early then costs
    // only what was buffered. Loading resumes in bursts once less than BUFFER_MIN_MS is left.
    // The byte cap bounds high-bitrate files.
    val loadControl =
      DefaultLoadControl.Builder()
        .setBufferDurationsMs(
          /* minBufferMs= */ BUFFER_MIN_MS,
          /* maxBufferMs= */ BUFFER_AHEAD_MS,
          /* bufferForPlaybackMs= */ 1_500,
          /* bufferForPlaybackAfterRebufferMs= */ 3_000,
        )
        .setTargetBufferBytes(BUFFER_BYTES)
        .setPrioritizeTimeOverSizeThresholds(false)
        .build()
    // A dropped connection is retried for about half a minute (1 s, 2 s … 5 s apart) before
    // playback gives up; the default gave up after 3 tries.
    val sources =
      DefaultMediaSourceFactory(dataSourceFactory).setLoadErrorHandlingPolicy(DefaultLoadErrorHandlingPolicy(LOAD_RETRIES))
    return ExoPlayer.Builder(context, renderers)
      .setLoadControl(loadControl)
      .setMediaSourceFactory(sources)
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

  /**
   * Replaces whatever plays with one track. With fades on, a track that is audible fades out
   * first and the new one fades in.
   */
  fun load(item: MediaItem, startMs: Long, autoplay: Boolean) {
    finishFade()
    next = null
    val start = {
      active.setMediaItem(item, startMs)
      active.prepare()
      if (fades && autoplay) {
        fadeIn()
      } else {
        active.volume = 1f
        active.playWhenReady = autoplay
      }
    }
    if (fades && active.isPlaying) startRamp(active, RampType.OUT, start) else start()
  }

  /** Plays; with fades on, from silence up to full volume. */
  fun play() {
    finishRamp()
    if (fades && !active.isPlaying) {
      fadeIn()
    } else {
      active.volume = 1f
      active.play()
    }
  }

  /** Pauses; with fades on, an audible track fades out first. Paused, the volume is back to full. */
  fun pause() {
    finishRamp()
    val player = active
    if (fades && player.isPlaying) {
      startRamp(player, RampType.OUT) {
        player.pause()
        player.volume = 1f
      }
    } else {
      player.pause()
      player.volume = 1f
    }
  }

  fun setPlayWhenReady(playWhenReady: Boolean) = if (playWhenReady) play() else pause()

  private fun fadeIn() {
    active.volume = 0f
    active.play()
    startRamp(active, RampType.IN)
  }

  /** Stops and unloads; the notification goes away with it. */
  fun stop() {
    finishFade()
    next = null
    active.stop()
    active.clearMediaItems()
    active.volume = 1f
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

  /** Playback speed (0.5..2); pitch is preserved. */
  fun setSpeed(value: Float) {
    speed = value.coerceIn(0.5f, 2f)
    applyPlaybackParameters(active)
    applyPlaybackParameters(standby)
  }

  /** Pitch shift in semitones (-6..6), independent of speed. Factor is 2^(s/12). */
  fun setPitch(semitones: Float) {
    pitch = semitones.coerceIn(-6f, 6f)
    applyPlaybackParameters(active)
    applyPlaybackParameters(standby)
  }

  /** Short fades on play, pause and skip ([SIMPLE_FADE_MS]); crossfades between songs are separate. */
  fun setFades(enabled: Boolean) {
    fades = enabled
  }

  private fun applyPlaybackParameters(player: ExoPlayer) {
    val pitchFactor = pitchFactor(pitch)
    player.playbackParameters = PlaybackParameters(speed, pitchFactor)
  }

  /**
   * A play / pause / skip fade still running when another command comes: jump to its end and do
   * what it was for (pause, load the next track), so no command is lost and nothing stays silent.
   */
  private fun finishRamp() {
    val ramp = currentRamp ?: return
    currentRamp = null
    main.removeCallbacks(rampTick)
    if (ramp.type == RampType.IN) ramp.player.volume = 1f
    ramp.onDone?.invoke()
  }

  private fun startRamp(player: ExoPlayer, type: RampType, onDone: (() -> Unit)? = null) {
    finishRamp()
    rampElapsedMs = 0
    currentRamp = Ramp(player, type, onDone)
    main.post(rampTick)
  }

  private val rampTick =
    object : Runnable {
      override fun run() {
        val ramp = currentRamp ?: return
        if (ramp.type == RampType.IN) {
          // Paused or failed elsewhere: nothing to fade in any more.
          if (!ramp.player.playWhenReady || ramp.player.playbackState == Player.STATE_IDLE) {
            finishRamp()
            return
          }
          // The clock only runs while the track is audible, so buffering doesn't eat the fade-in.
          if (ramp.player.isPlaying) rampElapsedMs += FADE_STEP_MS
          ramp.player.volume = fadeInVolume(rampElapsedMs, SIMPLE_FADE_MS)
        } else {
          rampElapsedMs += FADE_STEP_MS
          ramp.player.volume = fadeOutVolume(rampElapsedMs, SIMPLE_FADE_MS)
        }
        if (rampElapsedMs >= SIMPLE_FADE_MS) {
          currentRamp = null
          ramp.onDone?.invoke()
        } else {
          main.postDelayed(this, FADE_STEP_MS)
        }
      }
    }

  /** Called by the session player before any user command (play, pause, seek, stop…). */
  fun finishFade() {
    finishRamp()
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
        // Not while a pause or skip fades out: that command decides what plays next.
        if (fadingOut == null && currentRamp == null && crossfadeNext() && duration != C.TIME_UNSET) {
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
    applyPlaybackParameters(incoming)
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
        active.volume = fadeInVolume(fadeElapsedMs, fadeLengthMs)
        out.volume = fadeOutVolume(fadeElapsedMs, fadeLengthMs)
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
    const val SIMPLE_FADE_MS = 300L

    /** Computes ExoPlayer pitch factor from semitones: 2^(s/12). */
    fun pitchFactor(semitones: Float): Float = 2.0.pow(semitones.coerceIn(-6f, 6f) / 12.0).toFloat()

    /** Computes equal-power fade-in volume for elapsed time within duration. */
    fun fadeInVolume(elapsedMs: Long, lengthMs: Long): Float {
      if (lengthMs <= 0) return 1f
      val t = (elapsedMs.toDouble() / lengthMs).coerceIn(0.0, 1.0)
      return sin(t * PI / 2).toFloat()
    }

    /** Computes equal-power fade-out volume for elapsed time within duration. */
    fun fadeOutVolume(elapsedMs: Long, lengthMs: Long): Float {
      if (lengthMs <= 0) return 0f
      val t = (elapsedMs.toDouble() / lengthMs).coerceIn(0.0, 1.0)
      return cos(t * PI / 2).toFloat()
    }

    /** The running engine, created by [SonarePlaybackService]; null while the service is down. */
    @Volatile var instance: PlaybackEngine? = null

    // JS sends these at start-up, possibly before the service exists; a new engine starts with them.
    @Volatile var pendingTransitions = Transitions()
    @Volatile var pendingSpeed = 1f
    @Volatile var pendingPitch = 0f
    @Volatile var pendingFades = false

    private const val BUFFER_AHEAD_MS = 2 * 60_000
    private const val BUFFER_MIN_MS = 90_000
    private const val BUFFER_BYTES = 24 * 1024 * 1024
    private const val LOAD_RETRIES = 8
  }
}

/** The track the engine moved on to by itself, delivered to whoever listens (the JS module). */
object EngineEvents {
  @Volatile var advanceListener: ((String) -> Unit)? = null
  @Volatile var refusedListener: ((mediaId: String?, url: String) -> Unit)? = null

  fun advance(mediaId: String) {
    advanceListener?.invoke(mediaId)
  }

  fun streamRefused(mediaId: String?, url: String) {
    refusedListener?.invoke(mediaId, url)
  }
}
