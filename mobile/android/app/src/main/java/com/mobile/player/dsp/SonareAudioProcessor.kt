package com.mobile.player.dsp

import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor.AudioFormat
import androidx.media3.common.audio.AudioProcessor.UnhandledAudioFormatException
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Runs [DspChain] inside ExoPlayer's audio pipeline, on decoded PCM before it reaches the
 * AudioTrack (and before Media3's own speed change). Because it is part of Sonare's player
 * rather than a system audio effect, it works the same on every phone and only touches
 * Sonare's audio.
 *
 * Accepts 16-bit and float PCM and outputs the same format it was given.
 */
@OptIn(UnstableApi::class)
class SonareAudioProcessor : BaseAudioProcessor() {
  private var chain: DspChain? = null
  private var chainFormat: AudioFormat? = null
  private var seenVersion = -1L
  private var scratch = FloatArray(0)

  override fun onConfigure(inputAudioFormat: AudioFormat): AudioFormat {
    val encoding = inputAudioFormat.encoding
    if (encoding != C.ENCODING_PCM_16BIT && encoding != C.ENCODING_PCM_FLOAT) {
      throw UnhandledAudioFormatException(inputAudioFormat)
    }
    return inputAudioFormat
  }

  override fun queueInput(inputBuffer: ByteBuffer) {
    val format = inputAudioFormat
    val size = inputBuffer.remaining()
    if (size == 0) return
    val output = replaceOutputBuffer(size)
    val chain = chain
    val input = inputBuffer.order(ByteOrder.nativeOrder())

    val version = AudioEffects.version
    if (chain != null && version != seenVersion) {
      chain.update(AudioEffects.settings)
      seenVersion = version
    }

    if (chain == null || !AudioEffects.settings.enabled) {
      output.put(input)
      output.flip()
      return
    }

    val float = format.encoding == C.ENCODING_PCM_FLOAT
    val sampleCount = size / if (float) 4 else 2
    if (scratch.size < sampleCount) scratch = FloatArray(sampleCount)
    val start = input.position()
    if (float) {
      for (i in 0 until sampleCount) scratch[i] = input.getFloat(start + i * 4)
    } else {
      for (i in 0 until sampleCount) scratch[i] = input.getShort(start + i * 2) / 32768f
    }
    input.position(input.limit())

    chain.process(scratch, sampleCount / format.channelCount)

    write(scratch, sampleCount, float, output)
    output.flip()
  }

  private fun write(samples: FloatArray, count: Int, float: Boolean, output: ByteBuffer) {
    if (float) {
      for (i in 0 until count) output.putFloat(samples[i])
    } else {
      for (i in 0 until count) {
        val v = (samples[i] * 32768f).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
        output.putShort(v.toShort())
      }
    }
  }

  override fun onQueueEndOfStream() {
    // The limiter holds back a few milliseconds; let them out so the track's end isn't cut.
    val chain = chain ?: return
    if (!AudioEffects.settings.enabled) return
    val tail = chain.drain()
    val float = inputAudioFormat.encoding == C.ENCODING_PCM_FLOAT
    val output = replaceOutputBuffer(tail.size * if (float) 4 else 2)
    write(tail, tail.size, float, output)
    output.flip()
  }

  override fun onFlush() {
    // The configured format becomes active here. Same format (a seek, the next track):
    // drop filter memory so the old audio doesn't ring into the new one.
    val format = inputAudioFormat
    if (chain == null || chainFormat != format) {
      chain = DspChain(format.sampleRate, format.channelCount)
      chainFormat = format
      seenVersion = -1L
    } else {
      chain?.reset()
    }
  }

  override fun onReset() {
    chain = null
    chainFormat = null
    scratch = FloatArray(0)
  }
}
