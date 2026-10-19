package com.mobile.player.dsp

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Android native Spatial Audio stage running head-model ITD & shadow filters,
 * rear shelf cue, tone filter, air absorption lowpass, and live 8-line FDN reverb with early reflections.
 *
 * Positioned in DspChain between the stereo virtualizer widener and the normalization compressor.
 */
class SpatialStage(private val sampleRate: Int) {

  private class FractionalDelayLine(maxSamples: Int) {
    private val buffer = DoubleArray(maxSamples)
    private var writePos = 0

    fun write(sample: Double) {
      buffer[writePos] = sample
      writePos = (writePos + 1) % buffer.size
    }

    fun read(delaySamples: Double): Double {
      val d = delaySamples.coerceIn(0.0, (buffer.size - 2).toDouble())
      val i = d.toInt()
      val frac = d - i
      val pos1 = (writePos - 1 - i + buffer.size * 2) % buffer.size
      val pos2 = (pos1 - 1 + buffer.size) % buffer.size
      return buffer[pos1] * (1.0 - frac) + buffer[pos2] * frac
    }

    fun reset() {
      buffer.fill(0.0)
      writePos = 0
    }
  }

  class FdnReverbEngine(
    val rt60Low: Double,
    val dampingHz: Double,
    val preDelayMs: Double,
    val sendLowCutHz: Double,
    val sizeScale: Double,
    private val sampleRate: Int,
  ) {
    companion object {
      val NOMINAL_DELAYS = intArrayOf(1031, 1327, 1523, 1801, 2053, 2311, 2633, 2939)
    }

    val delays = IntArray(8) { i ->
      max(2, (NOMINAL_DELAYS[i] * sizeScale * (sampleRate / 48000.0) + 0.5).toInt())
    }
    private val lineBuffers = Array(8) { i -> DoubleArray(delays[i]) }
    private val lineIndices = IntArray(8)
    private val dampPrev = DoubleArray(8)
    private val lineGains = DoubleArray(8) { i ->
      10.0.pow((-3.0 * delays[i]) / (rt60Low * sampleRate))
    }

    private val dampCoeff: Double
    private val preDelayLength = max(1, (preDelayMs / 1000.0 * sampleRate + 0.5).toInt())
    private val preDelayBuffer = DoubleArray(preDelayLength)
    private var preDelayIndex = 0

    private var hpXPrev = 0.0
    private var hpYPrev = 0.0
    private val hpAlpha: Double

    init {
      val wc = (2.0 * PI * dampingHz) / sampleRate
      dampCoeff = exp(-wc).coerceIn(0.05, 0.75)

      val hpW = (2.0 * PI * sendLowCutHz) / sampleRate
      hpAlpha = exp(-hpW)
    }

    fun processSample(input: Double, out: DoubleArray) {
      val hpY = hpAlpha * (hpYPrev + input - hpXPrev)
      hpXPrev = input
      hpYPrev = hpY

      val delayedInput = preDelayBuffer[preDelayIndex]
      preDelayBuffer[preDelayIndex] = hpY
      preDelayIndex = (preDelayIndex + 1) % preDelayLength

      val out0 = lineBuffers[0][lineIndices[0]]
      val out1 = lineBuffers[1][lineIndices[1]]
      val out2 = lineBuffers[2][lineIndices[2]]
      val out3 = lineBuffers[3][lineIndices[3]]
      val out4 = lineBuffers[4][lineIndices[4]]
      val out5 = lineBuffers[5][lineIndices[5]]
      val out6 = lineBuffers[6][lineIndices[6]]
      val out7 = lineBuffers[7][lineIndices[7]]

      out[0] = (out0 - out2 + out4 - out6) * 0.5
      out[1] = (out1 + out3 - out5 - out7) * 0.5

      val sum = out0 + out1 + out2 + out3 + out4 + out5 + out6 + out7
      val quarterSum = 0.25 * sum

      val fb0 = out0 - quarterSum
      val fb1 = out1 - quarterSum
      val fb2 = out2 - quarterSum
      val fb3 = out3 - quarterSum
      val fb4 = out4 - quarterSum
      val fb5 = out5 - quarterSum
      val fb6 = out6 - quarterSum
      val fb7 = out7 - quarterSum

      val d = dampCoeff
      val oneMinusD = 1.0 - d

      val fb = doubleArrayOf(fb0, fb1, fb2, fb3, fb4, fb5, fb6, fb7)
      for (i in 0 until 8) {
        val inVal = delayedInput + fb[i] * lineGains[i]
        val dVal = oneMinusD * inVal + d * dampPrev[i]
        dampPrev[i] = dVal
        lineBuffers[i][lineIndices[i]] = dVal
        lineIndices[i] = (lineIndices[i] + 1) % delays[i]
      }
    }

    fun reset() {
      for (buf in lineBuffers) buf.fill(0.0)
      lineIndices.fill(0)
      dampPrev.fill(0.0)
      preDelayBuffer.fill(0.0)
      preDelayIndex = 0
      hpXPrev = 0.0
      hpYPrev = 0.0
    }
  }

  // Head-model delay lines: max 0.66 ms = ~32 samples at 48k, buffer 512 is plenty
  private val delayLL = FractionalDelayLine(512)
  private val delayLR = FractionalDelayLine(512)
  private val delayRL = FractionalDelayLine(512)
  private val delayRR = FractionalDelayLine(512)

  // Head-shadow filters: high-shelf at 2500 Hz per contralateral path
  private val shadowLR = Biquad(1)
  private val shadowRL = Biquad(1)

  // Direct path filters
  private val rearShelf = Biquad(2)
  private val toneFilter = Biquad(2)
  private val airLPF = Biquad(2)

  // FDN reverb engines (supports crossfade on room preset switch)
  private var activeFdn: FdnReverbEngine
  private var oldFdn: FdnReverbEngine? = null
  private var fdnCrossfadeProgress = 1.0
  private val fdnCrossfadeStep = 1.0 / (0.150 * sampleRate)

  // Early reflections circular buffer (100 ms)
  private val erBufferSize = max(1, (0.100 * sampleRate).toInt())
  private val erBuffer = DoubleArray(erBufferSize)
  private var erPos = 0

  // Smoothing and crossfading
  private val smoothAlpha = 1.0 - exp(-1.0 / (0.060 * sampleRate)) // 60 ms tau
  private val crossfadeStep = 1.0 / (0.100 * sampleRate) // 100 ms crossfade

  private var targetParams = SpatialStageParams()

  private var smoothAzimuth = 0.0
  private var smoothSpread = Math.toRadians(30.0)
  private var smoothGDir = 1.0
  private var smoothGRev = 0.0
  private var smoothGEr = 0.0
  private var smoothTrimDb = 0.0
  private var smoothRearShelfDb = 0.0
  private var smoothAirHz = 20000.0

  private var dryGain = 1.0
  private var wetGain = 0.0

  private var filterCountdown = 0
  private val fdnOutBuf = DoubleArray(2)
  private val oldFdnOutBuf = DoubleArray(2)

  val isActive: Boolean
    get() = targetParams.active || wetGain > 0.0

  init {
    activeFdn = createFdn(targetParams)
    updateFilters()
  }

  private fun createFdn(p: SpatialStageParams) = FdnReverbEngine(
    rt60Low = p.rt60Low,
    dampingHz = p.dampingHz,
    preDelayMs = p.preDelayMs,
    sendLowCutHz = p.sendLowCutHz,
    sizeScale = p.sizeScale,
    sampleRate = sampleRate,
  )

  private fun shortestArc(from: Double, to: Double): Double {
    var diff = (to - from) % (2.0 * PI)
    if (diff > PI) diff -= 2.0 * PI
    if (diff < -PI) diff += 2.0 * PI
    return diff
  }

  fun update(params: SpatialStageParams) {
    val old = targetParams
    targetParams = params

    val roomChanged = old.rt60Low != params.rt60Low ||
      old.dampingHz != params.dampingHz ||
      old.preDelayMs != params.preDelayMs ||
      old.sendLowCutHz != params.sendLowCutHz ||
      old.sizeScale != params.sizeScale

    if (roomChanged) {
      oldFdn = activeFdn
      activeFdn = createFdn(params)
      fdnCrossfadeProgress = 0.0
    }
  }

  fun reset() {
    delayLL.reset()
    delayLR.reset()
    delayRL.reset()
    delayRR.reset()
    shadowLR.reset()
    shadowRL.reset()
    rearShelf.reset()
    toneFilter.reset()
    airLPF.reset()
    activeFdn.reset()
    oldFdn?.reset()
    oldFdn = null
    fdnCrossfadeProgress = 1.0
    erBuffer.fill(0.0)
    erPos = 0
    dryGain = if (targetParams.active) 0.0 else 1.0
    wetGain = if (targetParams.active) 1.0 else 0.0
    smoothAzimuth = targetParams.azimuth
    smoothSpread = targetParams.spread
    smoothGDir = targetParams.gDir
    smoothGRev = targetParams.gRev
    smoothGEr = targetParams.gEr
    smoothTrimDb = targetParams.trimDb
    smoothRearShelfDb = targetParams.rearShelfDb
    smoothAirHz = targetParams.airHz
    filterCountdown = 0
    updateFilters()
  }

  fun process(frame: DoubleArray) {
    if (!targetParams.active && wetGain == 0.0) {
      dryGain = 1.0
      return
    }

    // 1. Crossfade dry and wet (100 ms)
    if (targetParams.active) {
      if (wetGain < 1.0) {
        wetGain = min(1.0, wetGain + crossfadeStep)
        dryGain = max(0.0, 1.0 - wetGain)
      }
    } else {
      if (wetGain > 0.0) {
        wetGain = max(0.0, wetGain - crossfadeStep)
        dryGain = min(1.0, 1.0 - wetGain)
      }
    }

    // 2. Exponential smoothing of parameters (tau = 60 ms)
    val diffAz = shortestArc(smoothAzimuth, targetParams.azimuth)
    smoothAzimuth += diffAz * smoothAlpha
    if (smoothAzimuth > PI) smoothAzimuth -= 2.0 * PI
    if (smoothAzimuth < -PI) smoothAzimuth += 2.0 * PI

    smoothSpread += (targetParams.spread - smoothSpread) * smoothAlpha
    smoothGDir += (targetParams.gDir - smoothGDir) * smoothAlpha
    smoothGRev += (targetParams.gRev - smoothGRev) * smoothAlpha
    smoothGEr += (targetParams.gEr - smoothGEr) * smoothAlpha
    smoothTrimDb += (targetParams.trimDb - smoothTrimDb) * smoothAlpha
    smoothRearShelfDb += (targetParams.rearShelfDb - smoothRearShelfDb) * smoothAlpha
    smoothAirHz += (targetParams.airHz - smoothAirHz) * smoothAlpha

    // 3. Update filter coefficients at block interval (every 32 frames)
    if (--filterCountdown <= 0) {
      filterCountdown = 32
      updateFilters()
    }

    val inL = frame[0]
    val inR = frame[1]

    // 4. Head-model delays and shadow filters
    val MAX_ITD = 0.00066
    val azL = smoothAzimuth - smoothSpread
    val azR = smoothAzimuth + smoothSpread

    val sinL = sin(azL)
    val itdFactorL = max(0.0, sinL)
    val itdFactorLContra = max(0.0, -sinL)
    val delaySamplesLL = itdFactorL * MAX_ITD * sampleRate
    val delaySamplesLR = itdFactorLContra * MAX_ITD * sampleRate

    val sinR = sin(azR)
    val itdFactorR = max(0.0, sinR)
    val itdFactorRContra = max(0.0, -sinR)
    val delaySamplesRL = itdFactorR * MAX_ITD * sampleRate
    val delaySamplesRR = itdFactorRContra * MAX_ITD * sampleRate

    // Speaker L:
    delayLL.write(inL)
    val directLL = delayLL.read(delaySamplesLL)

    val contraL = shadowLR.process(inL, 0)
    delayLR.write(contraL)
    val directLR = delayLR.read(delaySamplesLR)

    // Speaker R:
    delayRR.write(inR)
    val directRR = delayRR.read(delaySamplesRR)

    val contraR = shadowRL.process(inR, 0)
    delayRL.write(contraR)
    val directRL = delayRL.read(delaySamplesRL)

    // Combined direct path at ears:
    var earL = directLL + directRL
    var earR = directRR + directLR

    // 5. Direct path filters
    earL = rearShelf.process(earL, 0)
    earR = rearShelf.process(earR, 1)

    if (!toneFilter.isIdentity) {
      earL = toneFilter.process(earL, 0)
      earR = toneFilter.process(earR, 1)
    }

    if (!airLPF.isIdentity) {
      earL = airLPF.process(earL, 0)
      earR = airLPF.process(earR, 1)
    }

    val directOutL = earL * smoothGDir
    val directOutR = earR * smoothGDir

    // 6. Reverb path: mono sum -> FDN + early reflections
    val mono = (inL + inR) * 0.5

    val revOutL: Double
    val revOutR: Double
    if (oldFdn != null && fdnCrossfadeProgress < 1.0) {
      activeFdn.processSample(mono, fdnOutBuf)
      oldFdn?.processSample(mono, oldFdnOutBuf)
      val p = fdnCrossfadeProgress
      revOutL = oldFdnOutBuf[0] * (1.0 - p) + fdnOutBuf[0] * p
      revOutR = oldFdnOutBuf[1] * (1.0 - p) + fdnOutBuf[1] * p
      fdnCrossfadeProgress = min(1.0, fdnCrossfadeProgress + fdnCrossfadeStep)
      if (fdnCrossfadeProgress >= 1.0) {
        oldFdn = null
      }
    } else {
      activeFdn.processSample(mono, fdnOutBuf)
      revOutL = fdnOutBuf[0]
      revOutR = fdnOutBuf[1]
    }

    // Early reflections
    erBuffer[erPos] = mono
    var erL = 0.0
    var erR = 0.0
    val ers = targetParams.earlyReflections
    for (i in 0 until ers.size) {
      val er = ers[i]
      val delayFrames = (er.delayMs * sampleRate / 1000.0 + 0.5).toInt()
      val idx = (erPos - delayFrames + erBufferSize) % erBufferSize
      val s = erBuffer[idx] * er.gain
      if (er.channel == "L") erL += s else erR += s
    }
    erPos = (erPos + 1) % erBufferSize

    val revTotalL = revOutL * smoothGRev + erL * smoothGEr
    val revTotalR = revOutR * smoothGRev + erR * smoothGEr

    // 7. Combine wet path + trim + headroom pre-gain
    val trimLinear = 10.0.pow(smoothTrimDb / 20.0)
    val preGainLinear = 10.0.pow(targetParams.preGainDb / 20.0)
    val wetL = (directOutL + revTotalL) * trimLinear * preGainLinear
    val wetR = (directOutR + revTotalR) * trimLinear * preGainLinear

    // 8. Crossfade with dry
    frame[0] = inL * dryGain + wetL * wetGain
    frame[1] = inR * dryGain + wetR * wetGain
  }

  private fun updateFilters() {
    val azL = smoothAzimuth - smoothSpread
    val azR = smoothAzimuth + smoothSpread
    val sinL = sin(azL)
    val itdFactorLContra = max(0.0, -sinL)
    val shadowGainLR = -6.0 * itdFactorLContra

    val sinR = sin(azR)
    val itdFactorR = max(0.0, sinR)
    val shadowGainRL = -6.0 * itdFactorR

    shadowLR.set(Biquad.Type.HIGH_SHELF, sampleRate, 2500.0, shadowGainLR)
    shadowRL.set(Biquad.Type.HIGH_SHELF, sampleRate, 2500.0, shadowGainRL)

    rearShelf.set(Biquad.Type.HIGH_SHELF, sampleRate, 3500.0, smoothRearShelfDb)

    when (targetParams.toneType) {
      "highshelf" -> toneFilter.set(Biquad.Type.HIGH_SHELF, sampleRate, targetParams.toneFrequency, targetParams.toneGainDb)
      "lowpass" -> toneFilter.set(Biquad.Type.LOWPASS, sampleRate, targetParams.toneFrequency, 0.0, 1.0 / sqrt(2.0))
      else -> toneFilter.set(Biquad.Type.PEAKING, sampleRate, 1000.0, 0.0)
    }

    airLPF.set(Biquad.Type.LOWPASS, sampleRate, smoothAirHz, 0.0, 1.0 / sqrt(2.0))
  }
}
