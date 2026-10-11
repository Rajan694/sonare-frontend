package com.mobile.player.dsp

/**
 * The loudest sample decoded since JS last asked. [SonareAudioProcessor] offers each buffer's
 * peak; every progress event takes it, and JS draws the song's waveform from those levels.
 * A level offered while another thread takes one may be lost; the next buffer makes up for it.
 */
object LevelMeter {
  @Volatile private var peak = 0f

  fun offer(level: Float) {
    if (level > peak) peak = level
  }

  fun take(): Float {
    val p = peak
    peak = 0f
    return p
  }
}
