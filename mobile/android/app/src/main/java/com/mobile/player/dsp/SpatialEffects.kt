package com.mobile.player.dsp

import com.facebook.react.bridge.ReadableMap
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

data class EarlyReflectionParam(
  val delayMs: Double,
  val gain: Double,
  val channel: String, // "L" or "R"
)

data class RoomDef(
  val id: String,
  val name: String,
  val rt60Low: Double,
  val rt60High: Double,
  val preDelayMs: Double,
  val dampingHz: Double,
  val sendLowCutHz: Double,
  val earlyReflections: List<EarlyReflectionParam>,
  val sendLevelDb: Double,
  val sizeScale: Double,
  val Re: Double,
  val Eer: Double,
)

data class SpatialStageParams(
  val active: Boolean = false,
  val azimuth: Double = 0.0, // radians (-PI..PI)
  val distance: Double = 0.5, // 0.1..1.0
  val spread: Double = Math.toRadians(30.0), // radians
  val rearShelfDb: Double = 0.0, // dB
  val airHz: Double = 20000.0, // 8000..20000 Hz
  val toneType: String = "none", // "none" | "highshelf" | "lowpass"
  val toneFrequency: Double = 0.0,
  val toneGainDb: Double = 0.0,
  val gDir: Double = 1.0, // linear gain
  val gRev: Double = 0.0, // linear gain
  val gEr: Double = 0.0, // linear gain
  val trimDb: Double = 0.0, // dB
  val preGainDb: Double = -3.0, // -3 dB headroom
  val rt60Low: Double = 1.5,
  val rt60High: Double = 0.9,
  val preDelayMs: Double = 18.0,
  val dampingHz: Double = 6000.0,
  val sendLowCutHz: Double = 150.0,
  val sizeScale: Double = 0.8,
  val earlyReflections: List<EarlyReflectionParam> = DEFAULT_EARLY_REFLECTIONS,
) {
  companion object {
    val DEFAULT_EARLY_REFLECTIONS = listOf(
      EarlyReflectionParam(12.0, 0.55, "L"),
      EarlyReflectionParam(15.0, 0.5, "R"),
      EarlyReflectionParam(22.0, 0.45, "L"),
      EarlyReflectionParam(27.0, 0.4, "R"),
      EarlyReflectionParam(36.0, 0.35, "L"),
      EarlyReflectionParam(44.0, 0.3, "R"),
      EarlyReflectionParam(58.0, 0.25, "L"),
      EarlyReflectionParam(66.0, 0.2, "R"),
    )
  }
}

object SpatialEffects {
  val ROOM_CAFE = RoomDef(
    id = "cafe",
    name = "Café",
    rt60Low = 0.55,
    rt60High = 0.35,
    preDelayMs = 6.0,
    dampingHz = 3500.0,
    sendLowCutHz = 220.0,
    earlyReflections = listOf(
      EarlyReflectionParam(7.0, 0.5, "L"),
      EarlyReflectionParam(11.0, 0.45, "R"),
      EarlyReflectionParam(17.0, 0.35, "L"),
      EarlyReflectionParam(23.0, 0.3, "R"),
      EarlyReflectionParam(31.0, 0.22, "L"),
    ),
    sendLevelDb = -16.0,
    sizeScale = 0.5,
    Re = 1.0,
    Eer = 0.5.pow(2) + 0.45.pow(2) + 0.35.pow(2) + 0.3.pow(2) + 0.22.pow(2),
  )

  val ROOM_STAGE = RoomDef(
    id = "stage",
    name = "Concert",
    rt60Low = 1.5,
    rt60High = 0.9,
    preDelayMs = 18.0,
    dampingHz = 6000.0,
    sendLowCutHz = 150.0,
    earlyReflections = listOf(
      EarlyReflectionParam(12.0, 0.55, "L"),
      EarlyReflectionParam(15.0, 0.5, "R"),
      EarlyReflectionParam(22.0, 0.45, "L"),
      EarlyReflectionParam(27.0, 0.4, "R"),
      EarlyReflectionParam(36.0, 0.35, "L"),
      EarlyReflectionParam(44.0, 0.3, "R"),
      EarlyReflectionParam(58.0, 0.25, "L"),
      EarlyReflectionParam(66.0, 0.2, "R"),
    ),
    sendLevelDb = -11.0,
    sizeScale = 0.8,
    Re = 1.0,
    Eer = 0.55.pow(2) + 0.5.pow(2) + 0.45.pow(2) + 0.4.pow(2) + 0.35.pow(2) + 0.3.pow(2) + 0.25.pow(2) + 0.2.pow(2),
  )

  val ROOM_HALL = RoomDef(
    id = "hall",
    name = "Hall",
    rt60Low = 2.2,
    rt60High = 1.1,
    preDelayMs = 32.0,
    dampingHz = 4500.0,
    sendLowCutHz = 250.0,
    earlyReflections = listOf(
      EarlyReflectionParam(21.0, 0.4, "L"),
      EarlyReflectionParam(27.0, 0.36, "R"),
      EarlyReflectionParam(39.0, 0.32, "L"),
      EarlyReflectionParam(48.0, 0.28, "R"),
      EarlyReflectionParam(63.0, 0.23, "L"),
      EarlyReflectionParam(77.0, 0.18, "R"),
    ),
    sendLevelDb = -13.0,
    sizeScale = 1.0,
    Re = 1.0,
    Eer = 0.4.pow(2) + 0.36.pow(2) + 0.32.pow(2) + 0.28.pow(2) + 0.23.pow(2) + 0.18.pow(2),
  )

  val ROOM_STUDIO = RoomDef(
    id = "studio",
    name = "Studio",
    rt60Low = 1.0,
    rt60High = 0.6,
    preDelayMs = 12.0,
    dampingHz = 5000.0,
    sendLowCutHz = 180.0,
    earlyReflections = listOf(
      EarlyReflectionParam(9.0, 0.5, "L"),
      EarlyReflectionParam(14.0, 0.42, "R"),
      EarlyReflectionParam(20.0, 0.35, "L"),
      EarlyReflectionParam(28.0, 0.28, "R"),
      EarlyReflectionParam(38.0, 0.22, "L"),
    ),
    sendLevelDb = -14.0,
    sizeScale = 0.7,
    Re = 1.0,
    Eer = 0.5.pow(2) + 0.42.pow(2) + 0.35.pow(2) + 0.28.pow(2) + 0.22.pow(2),
  )

  val ROOMS = mapOf(
    "cafe" to ROOM_CAFE,
    "stage" to ROOM_STAGE,
    "hall" to ROOM_HALL,
    "studio" to ROOM_STUDIO,
  )

  /** Same as HEADMODEL_POWER_TABLE in shared/spatial.ts. */
  private val HEADMODEL_POWER_TABLE = doubleArrayOf(
    2.13, 2.19, 2.54, 2.34, 2.25, 2.21, 2.21, 2.2, 2.24, 2.32, 2.52, 2.18, 2.13,
  )

  fun getDirectPower(azimuthRad: Double): Double {
    val deg = Math.toDegrees(kotlin.math.abs(azimuthRad)).coerceIn(0.0, 180.0)
    val step = deg / 15.0
    val idx = step.toInt()
    val frac = step - idx
    if (idx >= HEADMODEL_POWER_TABLE.size - 1) {
      return HEADMODEL_POWER_TABLE.last()
    }
    return HEADMODEL_POWER_TABLE[idx] * (1.0 - frac) + HEADMODEL_POWER_TABLE[idx + 1] * frac
  }

  fun resolve(
    active: Boolean = true,
    azimuth: Double = 0.0,
    distance: Double = 0.5,
    width: Double = 60.0,
    intensity: Double = 70.0,
    ambience: Double = 30.0,
    room: RoomDef = ROOM_STAGE,
    toneType: String = "none",
    toneFrequency: Double = 0.0,
    toneGainDb: Double = 0.0,
  ): SpatialStageParams {
    val dClamped = distance.coerceIn(0.1, 1.0)
    val intensityFactor = (intensity / 100.0).coerceIn(0.0, 1.0)
    val ambienceFactor = (ambience / 100.0).coerceIn(0.0, 1.0)

    val wNorm = width / 50.0
    val spreadDegRaw = 30.0 * (0.6 + 0.8 * wNorm) * (1.0 - 0.4 * dClamped)
    val spreadDegClamped = spreadDegRaw.coerceIn(12.0, 55.0)
    val spreadDeg = 30.0 + (spreadDegClamped - 30.0) * intensityFactor
    val spread = Math.toRadians(spreadDeg)

    val rearShelfDb = -4.0 * max(0.0, -cos(azimuth)) * intensityFactor

    val dNorm = (dClamped - 0.1) / 0.9
    val airHz = 20000.0 - 12000.0 * dNorm

    val gDirDb = -1.5 * dClamped
    val gDir = 10.0.pow(gDirDb / 20.0)

    // As in shared/spatial.ts.
    val sendDb = -24.0 + (room.sendLevelDb + 12.0 - -24.0) * ambienceFactor
    val sendGain = 10.0.pow(sendDb / 20.0)
    val gRev = sendGain * intensityFactor
    val gEr = sendGain * intensityFactor

    val hAz = getDirectPower(azimuth)
    val p = gDir * gDir * hAz + gRev * gRev * room.Re + gEr * gEr * room.Eer
    val effectiveP = max(1e-4, p)
    // As in shared/spatial.ts: trim also makes up for the -3 dB pre-gain.
    val trimDb = (-10.0 * log10(effectiveP)).coerceIn(-6.0, 1.5) + 3.0

    return SpatialStageParams(
      active = active,
      azimuth = azimuth,
      distance = dClamped,
      spread = spread,
      rearShelfDb = rearShelfDb,
      airHz = airHz,
      toneType = toneType,
      toneFrequency = toneFrequency,
      toneGainDb = toneGainDb,
      gDir = gDir,
      gRev = gRev,
      gEr = gEr,
      trimDb = trimDb,
      preGainDb = -3.0,
      rt60Low = room.rt60Low,
      rt60High = room.rt60High,
      preDelayMs = room.preDelayMs,
      dampingHz = room.dampingHz,
      sendLowCutHz = room.sendLowCutHz,
      sizeScale = room.sizeScale,
      earlyReflections = room.earlyReflections,
    )
  }

  fun fromReadableMap(map: ReadableMap): SpatialStageParams {
    val active = if (map.hasKey("active")) map.getBoolean("active") else false
    val azimuth = if (map.hasKey("azimuth")) map.getDouble("azimuth") else 0.0
    val distance = if (map.hasKey("distance")) map.getDouble("distance") else 0.5
    val spread = if (map.hasKey("spread")) map.getDouble("spread") else Math.toRadians(30.0)
    val rearShelfDb = if (map.hasKey("rearShelfDb")) map.getDouble("rearShelfDb") else 0.0
    val airHz = if (map.hasKey("airHz")) map.getDouble("airHz") else 20000.0
    val toneType = if (map.hasKey("toneType")) map.getString("toneType") ?: "none" else "none"
    val toneFrequency = if (map.hasKey("toneFrequency")) map.getDouble("toneFrequency") else 0.0
    val toneGainDb = if (map.hasKey("toneGainDb")) map.getDouble("toneGainDb") else 0.0
    val gDir = if (map.hasKey("gDir")) map.getDouble("gDir") else 1.0
    val gRev = if (map.hasKey("gRev")) map.getDouble("gRev") else 0.0
    val gEr = if (map.hasKey("gEr")) map.getDouble("gEr") else 0.0
    val trimDb = if (map.hasKey("trimDb")) map.getDouble("trimDb") else 0.0
    val preGainDb = if (map.hasKey("preGainDb")) map.getDouble("preGainDb") else -3.0
    val rt60Low = if (map.hasKey("rt60Low")) map.getDouble("rt60Low") else 1.5
    val rt60High = if (map.hasKey("rt60High")) map.getDouble("rt60High") else 0.9
    val preDelayMs = if (map.hasKey("preDelayMs")) map.getDouble("preDelayMs") else 18.0
    val dampingHz = if (map.hasKey("dampingHz")) map.getDouble("dampingHz") else 6000.0
    val sendLowCutHz = if (map.hasKey("sendLowCutHz")) map.getDouble("sendLowCutHz") else 150.0
    val sizeScale = if (map.hasKey("sizeScale")) map.getDouble("sizeScale") else 0.8

    val earlyReflections = mutableListOf<EarlyReflectionParam>()
    if (map.hasKey("earlyReflections")) {
      val erArray = map.getArray("earlyReflections")
      if (erArray != null) {
        for (i in 0 until erArray.size()) {
          val item = erArray.getMap(i)
          if (item != null) {
            val d = if (item.hasKey("delayMs")) item.getDouble("delayMs") else 0.0
            val g = if (item.hasKey("gain")) item.getDouble("gain") else 0.0
            val ch = if (item.hasKey("channel")) item.getString("channel") ?: "L" else "L"
            earlyReflections.add(EarlyReflectionParam(d, g, ch))
          }
        }
      }
    }
    if (earlyReflections.isEmpty()) {
      earlyReflections.addAll(SpatialStageParams.DEFAULT_EARLY_REFLECTIONS)
    }

    return SpatialStageParams(
      active = active,
      azimuth = azimuth,
      distance = distance,
      spread = spread,
      rearShelfDb = rearShelfDb,
      airHz = airHz,
      toneType = toneType,
      toneFrequency = toneFrequency,
      toneGainDb = toneGainDb,
      gDir = gDir,
      gRev = gRev,
      gEr = gEr,
      trimDb = trimDb,
      preGainDb = preGainDb,
      rt60Low = rt60Low,
      rt60High = rt60High,
      preDelayMs = preDelayMs,
      dampingHz = dampingHz,
      sendLowCutHz = sendLowCutHz,
      sizeScale = sizeScale,
      earlyReflections = earlyReflections,
    )
  }
}
