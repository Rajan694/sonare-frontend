package com.mobile.player.dsp

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sin
import kotlin.math.sqrt
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DspChainTest {
  private val rate = 48_000

  /** One second of a sine at `hz`, `amplitude` peak, on every channel. */
  private fun sine(hz: Double, amplitude: Double, channels: Int = 2, seconds: Double = 1.0): FloatArray {
    val frames = (rate * seconds).toInt()
    return FloatArray(frames * channels) { i -> (amplitude * sin(2 * PI * hz * (i / channels) / rate)).toFloat() }
  }

  /** RMS level in dB of channel `channel`, over the second half (filters have settled). */
  private fun levelDb(samples: FloatArray, channels: Int = 2, channel: Int = 0): Double {
    val frames = samples.size / channels
    var sum = 0.0
    var n = 0
    for (f in frames / 2 until frames) {
      val v = samples[f * channels + channel].toDouble()
      sum += v * v
      n++
    }
    return 20 * log10(sqrt(sum / n))
  }

  /** Runs `input` through a chain and lines the output up with it (the limiter delays it). */
  private fun processed(settings: DspSettings, input: FloatArray, channels: Int = 2): FloatArray {
    val chain = DspChain(rate, channels).apply { update(settings) }
    val buf = input.copyOf()
    chain.process(buf, buf.size / channels)
    val tail = chain.drain()
    val all = buf + tail
    val skip = if (settings.enabled) chain.latencyFrames * channels else 0
    return all.copyOfRange(skip, skip + input.size)
  }

  private fun gainDb(settings: DspSettings, hz: Double, amplitude: Double = 0.05): Double {
    val input = sine(hz, amplitude)
    return levelDb(processed(settings, input)) - levelDb(input)
  }

  private fun eq(band: Int, db: Double) = DspSettings(gains = List(8) { if (it == band) db else 0.0 })

  @Test
  fun `switched off, the audio passes through untouched`() {
    val input = sine(1000.0, 0.99)
    val settings = DspSettings(enabled = false, gains = List(8) { 12.0 }, bassBoost = 100.0, normalization = true)
    assertArrayEquals(input, processed(settings, input), 0f)
  }

  @Test
  fun `flat settings leave a normal-level signal unchanged`() {
    val input = sine(440.0, 0.5)
    assertArrayEquals(input, processed(DspSettings(), input), 1e-6f)
  }

  @Test
  fun `a boosted band raises its own frequency by its gain and leaves distant ones alone`() {
    // Band 4 is 1 kHz (peaking).
    assertEquals(6.0, gainDb(eq(4, 6.0), 1000.0), 0.3)
    assertEquals(-6.0, gainDb(eq(4, -6.0), 1000.0), 0.3)
    assertEquals(0.0, gainDb(eq(4, 6.0), 64.0), 0.5)
    assertEquals(0.0, gainDb(eq(4, 6.0), 14000.0), 0.5)
  }

  @Test
  fun `the outer bands are shelves`() {
    // 32 Hz low shelf lifts everything below it, 14 kHz high shelf everything above.
    assertEquals(6.0, gainDb(eq(0, 6.0), 20.0), 1.0)
    assertEquals(6.0, gainDb(eq(7, 6.0), 18000.0), 1.0)
  }

  @Test
  fun `bass boost lifts lows by up to 12 dB and not the mids`() {
    assertEquals(12.0, gainDb(DspSettings(bassBoost = 100.0), 30.0), 1.0)
    assertEquals(6.0, gainDb(DspSettings(bassBoost = 50.0), 30.0), 1.0)
    assertEquals(0.0, gainDb(DspSettings(bassBoost = 100.0), 3000.0), 0.3)
  }

  @Test
  fun `the virtualizer widens the stereo image with a mid-side matrix`() {
    // Left only: mid = side = 0.2; width 2.5 → L = 0.2 + 0.5, R = 0.2 - 0.5.
    val out = processed(DspSettings(virtualizer = 100.0), floatArrayOf(0.4f, 0f))
    assertEquals(0.7f, out[0], 1e-5f)
    assertEquals(-0.3f, out[1], 1e-5f)
    // Centre (mono) content has no side, so it is untouched.
    assertArrayEquals(floatArrayOf(0.3f, 0.3f), processed(DspSettings(virtualizer = 100.0), floatArrayOf(0.3f, 0.3f)), 1e-6f)
  }

  @Test
  fun `the virtualizer leaves mono streams alone`() {
    val input = sine(500.0, 0.3, channels = 1)
    assertArrayEquals(input, processed(DspSettings(virtualizer = 100.0), input, channels = 1), 1e-6f)
  }

  @Test
  fun `the limiter turns a too-loud sine down evenly instead of flattening its peaks`() {
    // +12 dB on a 0.5 sine = about 2.0 peak: needs about 6.5 dB of limiting.
    val input = sine(1000.0, 0.5)
    val out = processed(eq(4, 12.0), input)
    val frames = out.size / 2
    var peak = 0.0
    for (f in frames / 2 until frames) peak = maxOf(peak, abs(out[f * 2].toDouble()))
    assertTrue("peak $peak at most -1 dBFS", peak <= DspChain.LIMIT + 1e-6)
    assertTrue("peak $peak still near the limit", peak > DspChain.LIMIT - 0.02)
    // A clipped sine has a crest factor (peak / RMS) well under √2; an evenly scaled one keeps it.
    var sum = 0.0
    for (f in frames / 2 until frames) sum += out[f * 2].toDouble() * out[f * 2]
    val crest = peak / sqrt(sum / (frames - frames / 2))
    assertEquals(sqrt(2.0), crest, 0.03)
  }

  @Test
  fun `a sudden loud hit never gets past -1 dBFS`() {
    val input = FloatArray(4800 * 2)
    for (f in 2400 until 2400 + 48) {
      input[f * 2] = 1.0f
      input[f * 2 + 1] = -1.0f
    }
    val out = processed(eq(4, 6.0), input)
    assertTrue(out.all { abs(it) <= DspChain.LIMIT + 1e-6 })
  }

  @Test
  fun `drain lets out the held-back end of a stream`() {
    val chain = DspChain(rate, 2)
    val buf = sine(440.0, 0.5, seconds = 0.1)
    val last = buf.copyOfRange(buf.size - chain.latencyFrames * 2, buf.size)
    chain.process(buf, buf.size / 2)
    assertArrayEquals(last, chain.drain(), 1e-6f)
  }

  @Test
  fun `boosts never clip - the limiter holds peaks at -1 dBFS`() {
    val out = processed(DspSettings(gains = List(8) { 12.0 }, bassBoost = 100.0), sine(100.0, 0.9))
    val frames = out.size / 2
    var peak = 0.0
    for (f in frames / 2 until frames) peak = maxOf(peak, abs(out[f * 2].toDouble()))
    assertTrue("peak $peak should be at most -1 dBFS", peak <= DspChain.LIMIT + 1e-6)
    assertTrue("peak $peak should still be loud", peak > 0.8)
  }

  @Test
  fun `normalization brings quiet and loud tracks closer together`() {
    val quiet = sine(1000.0, 0.01) // -43 dBFS peak
    val loud = sine(1000.0, 0.5) // -9 dBFS peak
    val before = levelDb(loud) - levelDb(quiet)
    val on = DspSettings(normalization = true)
    val after = levelDb(processed(on, loud)) - levelDb(processed(on, quiet))
    assertEquals(34.0, before, 0.5)
    assertTrue("difference should shrink from $before dB, was $after dB", after < before - 8)
    // Quiet material gets the make-up gain.
    assertTrue(levelDb(processed(on, quiet)) > levelDb(quiet) + 8)
  }
}
