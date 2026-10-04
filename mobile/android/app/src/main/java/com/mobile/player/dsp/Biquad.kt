package com.mobile.player.dsp

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * One second-order IIR filter (Robert Bristow-Johnson's audio EQ cookbook), the same filter
 * types the desktop app gets from Web Audio's BiquadFilterNode. Holds separate state per
 * channel; coefficients are shared.
 */
class Biquad(private val channels: Int) {
  enum class Type {
    PEAKING,
    LOW_SHELF,
    HIGH_SHELF,
  }

  private var b0 = 1.0
  private var b1 = 0.0
  private var b2 = 0.0
  private var a1 = 0.0
  private var a2 = 0.0

  // Transposed direct form II state, two values per channel.
  private val z1 = DoubleArray(channels)
  private val z2 = DoubleArray(channels)

  /** True when the filter passes the signal through unchanged (0 dB gain). */
  var isIdentity = true
    private set

  fun set(type: Type, sampleRate: Int, frequency: Double, gainDb: Double, q: Double = 1.1) {
    isIdentity = gainDb == 0.0
    if (isIdentity) {
      b0 = 1.0
      b1 = 0.0
      b2 = 0.0
      a1 = 0.0
      a2 = 0.0
      return
    }
    val a = 10.0.pow(gainDb / 40.0)
    val w0 = 2.0 * PI * frequency.coerceAtMost(sampleRate * 0.49) / sampleRate
    val cosW = cos(w0)
    val sinW = sin(w0)
    val nb0: Double
    val nb1: Double
    val nb2: Double
    val na0: Double
    val na1: Double
    val na2: Double
    when (type) {
      Type.PEAKING -> {
        val alpha = sinW / (2.0 * q)
        nb0 = 1.0 + alpha * a
        nb1 = -2.0 * cosW
        nb2 = 1.0 - alpha * a
        na0 = 1.0 + alpha / a
        na1 = -2.0 * cosW
        na2 = 1.0 - alpha / a
      }
      Type.LOW_SHELF, Type.HIGH_SHELF -> {
        // Shelf slope S = 1, as Web Audio uses (it ignores Q for shelves).
        val alpha = sinW / 2.0 * sqrt(2.0)
        val twoSqrtAAlpha = 2.0 * sqrt(a) * alpha
        if (type == Type.LOW_SHELF) {
          nb0 = a * ((a + 1) - (a - 1) * cosW + twoSqrtAAlpha)
          nb1 = 2 * a * ((a - 1) - (a + 1) * cosW)
          nb2 = a * ((a + 1) - (a - 1) * cosW - twoSqrtAAlpha)
          na0 = (a + 1) + (a - 1) * cosW + twoSqrtAAlpha
          na1 = -2 * ((a - 1) + (a + 1) * cosW)
          na2 = (a + 1) + (a - 1) * cosW - twoSqrtAAlpha
        } else {
          nb0 = a * ((a + 1) + (a - 1) * cosW + twoSqrtAAlpha)
          nb1 = -2 * a * ((a - 1) + (a + 1) * cosW)
          nb2 = a * ((a + 1) + (a - 1) * cosW - twoSqrtAAlpha)
          na0 = (a + 1) - (a - 1) * cosW + twoSqrtAAlpha
          na1 = 2 * ((a - 1) - (a + 1) * cosW)
          na2 = (a + 1) - (a - 1) * cosW - twoSqrtAAlpha
        }
      }
    }
    b0 = nb0 / na0
    b1 = nb1 / na0
    b2 = nb2 / na0
    a1 = na1 / na0
    a2 = na2 / na0
  }

  fun process(x: Double, channel: Int): Double {
    val y = b0 * x + z1[channel]
    z1[channel] = b1 * x - a1 * y + z2[channel]
    z2[channel] = b2 * x - a2 * y
    return y
  }

  fun reset() {
    z1.fill(0.0)
    z2.fill(0.0)
  }
}
