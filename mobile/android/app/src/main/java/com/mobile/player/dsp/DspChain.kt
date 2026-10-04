package com.mobile.player.dsp

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.pow

/** What the Audio screen controls. Immutable: the UI thread swaps in a new one. */
data class DspSettings(
  /** Master switch; off passes the audio through untouched. */
  val enabled: Boolean = true,
  /** One gain per [EQ_BANDS] entry, in dB, -12..12. */
  val gains: List<Double> = List(EQ_BANDS.size) { 0.0 },
  /** 0..100 → 0..+12 dB low shelf at 80 Hz. */
  val bassBoost: Double = 0.0,
  /** 0..100 → stereo width 1× .. 2.5×. */
  val virtualizer: Double = 0.0,
  /** Gentle compression that evens out loudness between and within tracks. */
  val normalization: Boolean = false,
) {
  companion object {
    /** Same bands and filter types as the desktop app (desktop/src/audio/dsp.ts). */
    val EQ_BANDS = doubleArrayOf(32.0, 64.0, 150.0, 400.0, 1000.0, 2400.0, 6000.0, 14000.0)
    const val MAX_GAIN_DB = 12.0
  }
}

/**
 * The processing chain, the same one the desktop app builds from Web Audio nodes:
 *
 *   8 × EQ band → bass low shelf → mid/side widener → compressor (normalization) → limiter
 *
 * Works on interleaved float samples in -1..1. Pure Kotlin, so it is unit-tested on the JVM.
 *
 * The limiter looks ahead, so the output lags the input by [latencyFrames] (5 ms); [drain]
 * returns what is still held back at the end of a stream.
 */
class DspChain(private val sampleRate: Int, private val channels: Int) {
  private val bands = Array(DspSettings.EQ_BANDS.size) { Biquad(channels) }
  private val bass = Biquad(channels)
  private var settings = DspSettings()
  private var width = 1.0

  // Compressor (normalization): threshold -24 dB, ratio 4, 12 dB knee, 10 ms attack,
  // 250 ms release, like the desktop's DynamicsCompressorNode settings, with the same kind
  // of automatic make-up gain Web Audio applies.
  private val compAttack = coefficient(0.010)
  private val compRelease = coefficient(0.250)
  private var compGainDb = 0.0

  // Look-ahead peak limiter at -1 dBFS so EQ and bass boosts don't clip. The audio is held
  // back `lookahead` frames; the gain needed for every frame in that window is known before
  // the frame plays, so the gain ramps down smoothly ahead of a peak instead of flattening it.
  private val lookahead = max(1, (0.005 * sampleRate).toInt())
  private val delay = Array(channels) { DoubleArray(lookahead) }
  private var delayPos = 0
  // Sliding minimum of the needed gain over the last lookahead + 1 frames (monotonic deque).
  private val minIdx = LongArray(lookahead + 2)
  private val minVal = DoubleArray(lookahead + 2)
  private var minHead = 0
  private var minSize = 0
  // Box filter (moving average) over that minimum: the smooth attack ramp.
  private val box = DoubleArray(lookahead) { 1.0 }
  private var boxSum = lookahead.toDouble()
  private var boxPos = 0
  private var frameIndex = 0L
  private val limiterRelease = coefficient(0.100)
  private var limiterGain = 1.0

  /** How far the output lags the input, in frames. */
  val latencyFrames: Int
    get() = lookahead

  init {
    update(settings)
  }

  private fun coefficient(seconds: Double) = exp(-1.0 / (seconds * sampleRate))

  fun update(next: DspSettings) {
    settings = next
    DspSettings.EQ_BANDS.forEachIndexed { i, hz ->
      val type =
        when (i) {
          0 -> Biquad.Type.LOW_SHELF
          DspSettings.EQ_BANDS.lastIndex -> Biquad.Type.HIGH_SHELF
          else -> Biquad.Type.PEAKING
        }
      val gain = next.gains.getOrElse(i) { 0.0 }.coerceIn(-DspSettings.MAX_GAIN_DB, DspSettings.MAX_GAIN_DB)
      bands[i].set(type, sampleRate, hz, gain)
    }
    bass.set(Biquad.Type.LOW_SHELF, sampleRate, 80.0, next.bassBoost.coerceIn(0.0, 100.0) / 100.0 * 12.0)
    width = 1.0 + next.virtualizer.coerceIn(0.0, 100.0) / 100.0 * 1.5
  }

  fun reset() {
    bands.forEach { it.reset() }
    bass.reset()
    compGainDb = 0.0
    delay.forEach { it.fill(0.0) }
    delayPos = 0
    minHead = 0
    minSize = 0
    box.fill(1.0)
    boxSum = lookahead.toDouble()
    boxPos = 0
    frameIndex = 0
    limiterGain = 1.0
  }

  /** The [latencyFrames] frames still held back, processed; call at the end of a stream. */
  fun drain(): FloatArray {
    val out = FloatArray(lookahead * channels)
    if (!settings.enabled) return out
    val silent = DoubleArray(channels)
    for (f in 0 until lookahead) limitAndDelay(silent, 1.0, out, f * channels)
    return out
  }

  /** Processes `frames` frames of `samples` (interleaved) in place. */
  fun process(samples: FloatArray, frames: Int) {
    if (!settings.enabled) return
    val frame = DoubleArray(channels)
    for (f in 0 until frames) {
      val base = f * channels
      for (c in 0 until channels) {
        var x = samples[base + c].toDouble()
        for (band in bands) if (!band.isIdentity) x = band.process(x, c)
        if (!bass.isIdentity) x = bass.process(x, c)
        frame[c] = x
      }

      if (channels == 2 && width != 1.0) {
        val mid = (frame[0] + frame[1]) * 0.5
        val side = (frame[0] - frame[1]) * 0.5 * width
        frame[0] = mid + side
        frame[1] = mid - side
      }

      var peak = 0.0
      for (c in 0 until channels) peak = max(peak, abs(frame[c]))

      val comp = if (settings.normalization) compressorGain(peak) else 1.0
      limitAndDelay(frame, comp, samples, base)
    }
  }

  /**
   * Puts one frame (times `gain`) into the look-ahead line and writes the frame leaving it,
   * limited, to `out` at `offset`.
   */
  private fun limitAndDelay(frame: DoubleArray, gain: Double, out: FloatArray, offset: Int) {
    var peak = 0.0
    for (c in 0 until channels) peak = max(peak, abs(frame[c] * gain))
    val needed = if (peak > LIMIT) LIMIT / peak else 1.0

    // Minimum needed gain over frames [n - lookahead, n]: covers the frame leaving now.
    val n = frameIndex++
    while (minSize > 0 && minVal[(minHead + minSize - 1) % minVal.size] >= needed) minSize--
    val tail = (minHead + minSize) % minVal.size
    minIdx[tail] = n
    minVal[tail] = needed
    minSize++
    while (minIdx[minHead] < n - lookahead) {
      minHead = (minHead + 1) % minVal.size
      minSize--
    }
    val hold = minVal[minHead]

    // Averaging `lookahead` holds that all cover the leaving frame never exceeds what that
    // frame needs, and turns steps into ramps.
    boxSum += hold - box[boxPos]
    box[boxPos] = hold
    boxPos = (boxPos + 1) % lookahead
    val smooth = boxSum / lookahead
    limiterGain = if (smooth < limiterGain) smooth else smooth + limiterRelease * (limiterGain - smooth)

    for (c in 0 until channels) {
      val leaving = delay[c][delayPos]
      delay[c][delayPos] = frame[c] * gain
      out[offset + c] = (leaving * limiterGain).toFloat()
    }
    delayPos = (delayPos + 1) % lookahead
  }

  private fun compressorGain(peak: Double): Double {
    val levelDb = if (peak > 1e-9) 20.0 * log10(peak) else -180.0
    val target = staticCurveDb(levelDb) - levelDb // ≤ 0: how much to turn this level down
    val coeff = if (target < compGainDb) compAttack else compRelease
    compGainDb = target + coeff * (compGainDb - target)
    return 10.0.pow((compGainDb + MAKEUP_DB) / 20.0)
  }

  /** The compressor's input → output level curve (dB), with a soft knee. */
  private fun staticCurveDb(x: Double): Double {
    val over = x - THRESHOLD_DB
    return when {
      2 * over < -KNEE_DB -> x
      2 * abs(over) <= KNEE_DB -> x + (1.0 / RATIO - 1.0) * (over + KNEE_DB / 2).pow(2) / (2 * KNEE_DB)
      else -> THRESHOLD_DB + over / RATIO
    }
  }

  companion object {
    const val THRESHOLD_DB = -24.0
    const val RATIO = 4.0
    const val KNEE_DB = 12.0
    /** 0.6 × the gain reduction at 0 dBFS, the rule Web Audio's compressor uses. */
    val MAKEUP_DB = 0.6 * -(THRESHOLD_DB - THRESHOLD_DB / RATIO)
    /** -1 dBFS. */
    val LIMIT = 10.0.pow(-1.0 / 20.0)
  }
}
