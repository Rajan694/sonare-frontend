package com.mobile.player.dsp

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.log10
import kotlin.math.sin
import kotlin.math.sqrt
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SpatialStageTest {
  private val rate = 48_000

  private fun sine(hz: Double, amplitude: Double, channels: Int = 2, seconds: Double = 0.5): FloatArray {
    val frames = (rate * seconds).toInt()
    return FloatArray(frames * channels) { i ->
      (amplitude * sin(2.0 * PI * hz * (i / channels) / rate)).toFloat()
    }
  }

  private fun levelDb(samples: DoubleArray): Double {
    var sum = 0.0
    for (v in samples) sum += v * v
    val rms = sqrt(sum / samples.size)
    return if (rms > 1e-9) 20.0 * log10(rms) else -180.0
  }

  @Test
  fun `when inactive, spatial stage leaves signal untouched`() {
    val stage = SpatialStage(rate)
    val frame = doubleArrayOf(0.42, -0.35)
    val original = frame.clone()
    stage.process(frame)
    assertArrayEquals(original, frame, 1e-9)
    assertFalse(stage.isActive)
  }

  @Test
  fun `when active with center azimuth, stereo response is balanced and symmetric`() {
    val stage = SpatialStage(rate)
    val params = SpatialEffects.resolve(
      active = true,
      azimuth = 0.0,
      distance = 0.5,
      width = 60.0,
      intensity = 70.0,
      ambience = 0.0, // test direct path symmetry without reverb
      room = SpatialEffects.ROOM_STAGE,
    )
    stage.update(params)
    stage.reset() // sets wetGain=1 immediately

    val frames = 1000
    val leftSamples = DoubleArray(frames)
    val rightSamples = DoubleArray(frames)

    for (i in 0 until frames) {
      val s = sin(2.0 * PI * 1000.0 * i / rate) * 0.5
      val frame = doubleArrayOf(s, s)
      stage.process(frame)
      leftSamples[i] = frame[0]
      rightSamples[i] = frame[1]
    }

    val lvlL = levelDb(leftSamples.copyOfRange(500, frames))
    val lvlR = levelDb(rightSamples.copyOfRange(500, frames))
    assertEquals(lvlL, lvlR, 0.2) // within 0.2 dB symmetry
  }

  @Test
  fun `sound positioned on right creates head-shadow attenuation on left ear`() {
    val stage = SpatialStage(rate)
    // 5 kHz tone (head-shadow shelf at 2500 Hz actively attenuates this)
    val params = SpatialEffects.resolve(
      active = true,
      azimuth = PI / 2.0, // 90° right
      distance = 0.5,
      width = 50.0,
      intensity = 80.0,
      ambience = 0.0,
      room = SpatialEffects.ROOM_STAGE,
    )
    stage.update(params)
    stage.reset()

    val frames = 2000
    val leftSamples = DoubleArray(frames)
    val rightSamples = DoubleArray(frames)

    for (i in 0 until frames) {
      val s = sin(2.0 * PI * 5000.0 * i / rate) * 0.5
      val frame = doubleArrayOf(s, s)
      stage.process(frame)
      leftSamples[i] = frame[0]
      rightSamples[i] = frame[1]
    }

    val lvlL = levelDb(leftSamples.copyOfRange(1000, frames))
    val lvlR = levelDb(rightSamples.copyOfRange(1000, frames))

    // Right ear should be noticeably louder than left ear due to head shadow
    assertTrue("Right ear ($lvlR dB) must be louder than left ear ($lvlL dB)", lvlR > lvlL + 2.0)
  }

  @Test
  fun `sound positioned behind attenuates high frequencies via rear shelf`() {
    // Compare front (azimuth 0) vs back (azimuth PI) for a 10 kHz tone
    fun runTone(azimuth: Double): Double {
      val stage = SpatialStage(rate)
      val params = SpatialEffects.resolve(
        active = true,
        azimuth = azimuth,
        distance = 0.5,
        width = 50.0,
        intensity = 100.0,
        ambience = 0.0,
        room = SpatialEffects.ROOM_STAGE,
      )
      stage.update(params)
      stage.reset()

      val frames = 2000
      val out = DoubleArray(frames)
      for (i in 0 until frames) {
        val s = sin(2.0 * PI * 10000.0 * i / rate) * 0.5
        val frame = doubleArrayOf(s, s)
        stage.process(frame)
        out[i] = (frame[0] + frame[1]) * 0.5
      }
      return levelDb(out.copyOfRange(1000, frames))
    }

    val frontLvl = runTone(0.0)
    val backLvl = runTone(PI)
    assertTrue("Back level ($backLvl dB) should be lower than front ($frontLvl dB)", backLvl < frontLvl - 2.0)
  }

  @Test
  fun `fdn reverb produces decaying reverberation from an impulse`() {
    val stage = SpatialStage(rate)
    val params = SpatialEffects.resolve(
      active = true,
      azimuth = 0.0,
      distance = 0.5,
      width = 60.0,
      intensity = 90.0,
      ambience = 80.0,
      room = SpatialEffects.ROOM_STAGE, // rt60 ~1.5s
    )
    stage.update(params)
    stage.reset()

    // Send single impulse
    val impulseFrame = doubleArrayOf(1.0, 1.0)
    stage.process(impulseFrame)

    val decayFrames = rate * 2 // 2 seconds
    val energyEarly = DoubleArray(rate / 4) // 0 to 250ms
    val energyLate = DoubleArray(rate / 4) // 1.5s to 1.75s

    for (i in 0 until decayFrames) {
      val frame = doubleArrayOf(0.0, 0.0)
      stage.process(frame)
      val e = frame[0] * frame[0] + frame[1] * frame[1]
      if (i < energyEarly.size) energyEarly[i] = e
      val lateStart = (rate * 1.5).toInt()
      if (i in lateStart until (lateStart + energyLate.size)) {
        energyLate[i - lateStart] = e
      }
    }

    val earlySum = energyEarly.sum()
    val lateSum = energyLate.sum()
    assertTrue("Reverb impulse must produce early energy", earlySum > 1e-4)
    assertTrue("Late energy ($lateSum) must decay relative to early ($earlySum)", lateSum < earlySum * 0.1)
  }

  @Test
  fun `smooth transitions do not produce NaNs or infinities during rapid moves`() {
    val stage = SpatialStage(rate)
    stage.update(SpatialEffects.resolve(active = true, azimuth = 0.0))
    stage.reset()

    val frame = doubleArrayOf(0.2, -0.2)
    // Rapidly change azimuth in large jumps
    val angles = listOf(-PI, -PI / 2, 0.0, PI / 3, PI * 0.9, -PI * 0.8)
    for (ang in angles) {
      stage.update(SpatialEffects.resolve(active = true, azimuth = ang))
      for (f in 0 until 64) {
        frame[0] = 0.3 * sin(f.toDouble())
        frame[1] = -0.3 * cos(f.toDouble())
        stage.process(frame)
        assertFalse("Output must not be NaN", frame[0].isNaN() || frame[1].isNaN())
        assertFalse("Output must not be Infinite", frame[0].isInfinite() || frame[1].isInfinite())
      }
    }
  }

  @Test
  fun `dsp chain processes spatial audio and limits peaks`() {
    val chain = DspChain(rate, 2)
    val spatialParams = SpatialEffects.resolve(
      active = true,
      azimuth = 0.0,
      distance = 0.5,
      intensity = 100.0,
      ambience = 100.0,
      room = SpatialEffects.ROOM_HALL,
    )
    chain.updateSpatial(spatialParams)

    // Run high amplitude input through chain
    val input = FloatArray(1024 * 2) { 0.9f }
    chain.process(input, 1024)

    for (s in input) {
      assertFalse("Output must be finite", s.isNaN() || s.isInfinite())
      assertTrue("Limiter must clamp peak below or near limit", abs(s) <= 1.05f)
    }
  }
}
