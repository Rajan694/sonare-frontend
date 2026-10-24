package com.mobile.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.sqrt

class PlaybackEngineTest {

  @Test
  fun `pitch factor converts 0 semitones to exactly 1`() {
    assertEquals(1.0f, PlaybackEngine.pitchFactor(0f), 1e-6f)
  }

  @Test
  fun `pitch factor converts 12 semitones to 2 when unclamped or clamped at 6`() {
    // 6 semitones is half an octave: 2^(6/12) = sqrt(2) ≈ 1.41421356
    val factorPlus6 = PlaybackEngine.pitchFactor(6f)
    assertEquals(sqrt(2.0).toFloat(), factorPlus6, 1e-5f)

    // -6 semitones: 2^(-6/12) = 1/sqrt(2) ≈ 0.70710678
    val factorMinus6 = PlaybackEngine.pitchFactor(-6f)
    assertEquals((1.0 / sqrt(2.0)).toFloat(), factorMinus6, 1e-5f)
  }

  @Test
  fun `pitch factor clamps to -6 and +6 semitones`() {
    val factorOver = PlaybackEngine.pitchFactor(12f)
    val factorAtMax = PlaybackEngine.pitchFactor(6f)
    assertEquals(factorAtMax, factorOver, 1e-6f)

    val factorUnder = PlaybackEngine.pitchFactor(-12f)
    val factorAtMin = PlaybackEngine.pitchFactor(-6f)
    assertEquals(factorAtMin, factorUnder, 1e-6f)
  }

  @Test
  fun `fade in volume starts at 0 and reaches 1 at duration`() {
    assertEquals(0.0f, PlaybackEngine.fadeInVolume(0, 300), 1e-6f)
    assertEquals(1.0f, PlaybackEngine.fadeInVolume(300, 300), 1e-6f)
    assertEquals(1.0f, PlaybackEngine.fadeInVolume(500, 300), 1e-6f) // clamped
  }

  @Test
  fun `fade out volume starts at 1 and reaches 0 at duration`() {
    assertEquals(1.0f, PlaybackEngine.fadeOutVolume(0, 300), 1e-6f)
    assertEquals(0.0f, PlaybackEngine.fadeOutVolume(300, 300), 1e-6f)
    assertEquals(0.0f, PlaybackEngine.fadeOutVolume(500, 300), 1e-6f) // clamped
  }

  @Test
  fun `fade in and out follow equal-power curve`() {
    // Equal-power sum of squares should remain constant (~1.0)
    for (t in 0..300 step 25) {
      val inVol = PlaybackEngine.fadeInVolume(t.toLong(), 300)
      val outVol = PlaybackEngine.fadeOutVolume(t.toLong(), 300)
      val power = inVol * inVol + outVol * outVol
      assertEquals(1.0f, power, 1e-5f)
    }
  }

  @Test
  fun `fade steps monotonically advance`() {
    var prevIn = 0f
    var prevOut = 1f
    for (t in 1..300 step 50) {
      val inVol = PlaybackEngine.fadeInVolume(t.toLong(), 300)
      val outVol = PlaybackEngine.fadeOutVolume(t.toLong(), 300)
      assertTrue("inVol increases", inVol >= prevIn)
      assertTrue("outVol decreases", outVol <= prevOut)
      prevIn = inVol
      prevOut = outVol
    }
  }
}
