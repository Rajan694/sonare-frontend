package com.mobile.player.dsp

/**
 * How loud the audio decoded since JS last asked was, as RMS (0..1). [SonareAudioProcessor]
 * adds each buffer's sum of squares; every progress event takes the level, and JS draws the
 * song's waveform from those levels. Loudness rather than the loudest sample: mastered music
 * reaches full scale nearly all the time, so peaks drew a flat block.
 */
object LevelMeter {
  private val lock = Any()
  private var sumSquares = 0.0
  private var samples = 0L

  fun offer(sumOfSquares: Double, count: Int) {
    if (count <= 0) return
    synchronized(lock) {
      sumSquares += sumOfSquares
      samples += count
    }
  }

  fun take(): Float {
    synchronized(lock) {
      val level = if (samples > 0) kotlin.math.sqrt(sumSquares / samples).toFloat() else 0f
      sumSquares = 0.0
      samples = 0
      return level.coerceIn(0f, 1f)
    }
  }
}
