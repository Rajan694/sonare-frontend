package com.mobile.player.dsp

import kotlin.math.PI
import kotlin.math.log10
import kotlin.math.sin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** The background music presets (My Room, Living Room, Café) and the low shelf they use. */
class BackgroundMusicTest {
  private val rate = 48_000

  /**
   * What resolveSpatial(..., { renderer: 'headModel' }) in shared/spatial.ts sends for each preset,
   * and the level it should end up at. Regenerate these if the presets there change.
   */
  private val presets: Map<String, Pair<SpatialStageParams, Double>> = mapOf(
    // myRoom: wanted about -3 dB
    "myRoom" to (SpatialStageParams(
        active = true,
        azimuth = 0.0,
        distance = 0.55,
        spread = 0.3490658503988659,
        rearShelfDb = 0.0,
        airHz = 11000.0,
        toneType = "lowshelf",
        toneFrequency = 200.0,
        toneGainDb = -2.0,
        gDir = 0.7079457843841379,
        gRev = 0.5011872336272722,
        gEr = 0.5011872336272722,
        trimDb = -0.9133226850584648,
        preGainDb = -3.0,
        rt60Low = 0.35,
        rt60High = 0.25,
        preDelayMs = 2.0,
        dampingHz = 5000.0,
        sendLowCutHz = 150.0,
        sizeScale = 0.35,
        earlyReflections = listOf(
          EarlyReflectionParam(3.0, 0.5, "L"),
          EarlyReflectionParam(4.5, 0.45, "R"),
          EarlyReflectionParam(7.0, 0.38, "L"),
          EarlyReflectionParam(9.5, 0.32, "R"),
          EarlyReflectionParam(13.0, 0.25, "L"),
          EarlyReflectionParam(18.0, 0.18, "R"),
        ),
      ) to -3.0),
    // livingRoom: wanted about -5 dB
    "livingRoom" to (SpatialStageParams(
        active = true,
        azimuth = 0.0,
        distance = 0.8,
        spread = 0.41887902047863906,
        rearShelfDb = 0.0,
        airHz = 8000.0,
        toneType = "lowshelf",
        toneFrequency = 180.0,
        toneGainDb = -2.5,
        gDir = 0.3981071705534972,
        gRev = 0.6309573444801932,
        gEr = 0.6309573444801932,
        trimDb = -0.47250466095879284,
        preGainDb = -3.0,
        rt60Low = 0.55,
        rt60High = 0.4,
        preDelayMs = 6.0,
        dampingHz = 4200.0,
        sendLowCutHz = 160.0,
        sizeScale = 0.55,
        earlyReflections = listOf(
          EarlyReflectionParam(6.0, 0.48, "L"),
          EarlyReflectionParam(9.0, 0.44, "R"),
          EarlyReflectionParam(13.0, 0.38, "L"),
          EarlyReflectionParam(18.0, 0.32, "R"),
          EarlyReflectionParam(25.0, 0.25, "L"),
          EarlyReflectionParam(33.0, 0.18, "R"),
        ),
      ) to -5.0),
    // bgmCafe: wanted about -7 dB
    "bgmCafe" to (SpatialStageParams(
        active = true,
        azimuth = 0.0,
        distance = 1.0,
        spread = 0.6632251157578452,
        rearShelfDb = 0.0,
        airHz = 6000.0,
        toneType = "lowshelf",
        toneFrequency = 200.0,
        toneGainDb = -4.0,
        gDir = 0.251188643150958,
        gRev = 0.7943282347242815,
        gEr = 0.7943282347242815,
        trimDb = -2.778688836785603,
        preGainDb = -3.0,
        rt60Low = 0.9,
        rt60High = 0.6,
        preDelayMs = 12.0,
        dampingHz = 3200.0,
        sendLowCutHz = 200.0,
        sizeScale = 0.8,
        earlyReflections = listOf(
          EarlyReflectionParam(9.0, 0.42, "L"),
          EarlyReflectionParam(12.0, 0.4, "R"),
          EarlyReflectionParam(17.0, 0.36, "L"),
          EarlyReflectionParam(23.0, 0.33, "R"),
          EarlyReflectionParam(31.0, 0.28, "L"),
          EarlyReflectionParam(42.0, 0.22, "R"),
          EarlyReflectionParam(56.0, 0.16, "L"),
        ),
      ) to -7.0),
  )

  /** Pink noise, as music's spectrum roughly is. */
  private fun pink(seed0: Long, n: Int): DoubleArray {
    var s = seed0
    fun rnd(): Double {
      s = (s * 1664525 + 1013904223) and 0xffffffffL
      return s.toDouble() / 4294967296.0 * 2 - 1
    }
    var b0 = 0.0
    var b1 = 0.0
    var b2 = 0.0
    var b3 = 0.0
    var b4 = 0.0
    var b5 = 0.0
    var b6 = 0.0
    return DoubleArray(n) {
      val w = rnd()
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      val out = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.05
      b6 = w * 0.115926
      out
    }
  }

  /** Output level against input, dB, for stereo pink noise with 50% L/R correlation, once the room has built up. */
  private fun levelChangeDb(params: SpatialStageParams): Double {
    val n = rate * 3
    val common = pink(1, n)
    val left = pink(2, n)
    val right = pink(3, n)
    val stage = SpatialStage(rate)
    stage.update(params)
    stage.reset()
    val from = rate
    var inPower = 0.0
    var outPower = 0.0
    val frame = DoubleArray(2)
    for (i in 0 until n) {
      val l = (common[i] + left[i]) * 0.7071
      val r = (common[i] + right[i]) * 0.7071
      frame[0] = l
      frame[1] = r
      stage.process(frame)
      assertTrue("output is finite", frame[0].isFinite() && frame[1].isFinite())
      if (i >= from) {
        inPower += l * l + r * r
        outPower += frame[0] * frame[0] + frame[1] * frame[1]
      }
    }
    return 10 * log10(outPower / inPower)
  }

  @Test
  fun `background music presets play quieter the further away they are, close to their target levels`() {
    var previous = 0.0
    for ((id, entry) in presets) {
      val (params, wantedDb) = entry
      val level = levelChangeDb(params)
      assertEquals("$id level", wantedDb, level, 1.5)
      assertTrue("$id is quieter than the one before", level < previous)
      previous = level
    }
  }

  @Test
  fun `in the cafe the room is louder than the direct sound`() {
    val cafe = presets.getValue("bgmCafe").first
    val direct = levelChangeDb(cafe.copy(gRev = 0.0, gEr = 0.0))
    val room = levelChangeDb(cafe.copy(gDir = 0.0))
    assertTrue("room $room dB vs direct $direct dB", room - direct > 6.0)
  }

  @Test
  fun `a low shelf tone cuts the bass and leaves the mids`() {
    fun levelOf(hz: Double, params: SpatialStageParams): Double {
      val stage = SpatialStage(rate)
      stage.update(params)
      stage.reset()
      val frame = DoubleArray(2)
      var power = 0.0
      val n = rate / 2
      for (i in 0 until n) {
        val v = 0.25 * sin(2.0 * PI * hz * i / rate)
        frame[0] = v
        frame[1] = v
        stage.process(frame)
        if (i >= n / 2) power += frame[0] * frame[0] + frame[1] * frame[1]
      }
      return 10 * log10(power)
    }
    val flat = SpatialStageParams(active = true, gRev = 0.0, gEr = 0.0)
    val shelf = flat.copy(toneType = "lowshelf", toneFrequency = 200.0, toneGainDb = -6.0)
    assertEquals(-6.0, levelOf(40.0, shelf) - levelOf(40.0, flat), 1.0)
    assertEquals(0.0, levelOf(2000.0, shelf) - levelOf(2000.0, flat), 0.5)
  }
}
