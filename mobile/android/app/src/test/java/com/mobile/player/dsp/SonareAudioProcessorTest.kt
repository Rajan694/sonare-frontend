package com.mobile.player.dsp

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import java.nio.ByteBuffer
import java.nio.ByteOrder
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test

class SonareAudioProcessorTest {
  @After
  fun restoreDefaults() = AudioEffects.update(DspSettings())

  /**
   * Feeds one frame written by `write`, then ends the stream, and returns everything that
   * came out (the limiter delays the frame; ending the stream releases it).
   */
  private fun run(encoding: Int, write: (ByteBuffer) -> Unit): ByteBuffer {
    val processor = SonareAudioProcessor()
    processor.configure(AudioProcessor.AudioFormat(48_000, 2, encoding))
    processor.flush()
    val bytes = 2 * if (encoding == C.ENCODING_PCM_FLOAT) 4 else 2
    val input = ByteBuffer.allocateDirect(bytes).order(ByteOrder.nativeOrder())
    write(input)
    input.flip()
    val collected = ByteBuffer.allocate(1 shl 16).order(ByteOrder.nativeOrder())
    processor.queueInput(input)
    assertEquals("all input consumed", 0, input.remaining())
    collected.put(processor.output)
    processor.queueEndOfStream()
    collected.put(processor.output)
    collected.flip()
    return collected
  }

  /** The frame that came out with real signal in it (the rest is the limiter's delay). */
  private fun firstNonZero(out: ByteBuffer, frameBytes: Int, read: (Int) -> Double): Int {
    var at = 0
    while (at < out.limit() && read(at) == 0.0) at += frameBytes
    return at
  }

  @Test
  fun `16-bit PCM goes through the chain and comes out as 16-bit`() {
    AudioEffects.update(DspSettings(virtualizer = 100.0))
    // One frame, left only: 0.4 → L 0.7, R -0.3 (see DspChainTest).
    val out = run(C.ENCODING_PCM_16BIT) { it.putShort((0.4 * 32768).toInt().toShort()).putShort(0) }
    assertEquals("one frame plus the 5 ms delay, nothing lost", (1 + 240) * 4, out.limit())
    val at = firstNonZero(out, 4) { out.getShort(it).toDouble() }
    assertEquals(0.7, out.getShort(at) / 32768.0, 1e-3)
    assertEquals(-0.3, out.getShort(at + 2) / 32768.0, 1e-3)
  }

  @Test
  fun `float PCM goes through the chain and comes out as float`() {
    AudioEffects.update(DspSettings(virtualizer = 100.0))
    val out = run(C.ENCODING_PCM_FLOAT) { it.putFloat(0.4f).putFloat(0f) }
    assertEquals((1 + 240) * 8, out.limit())
    val at = firstNonZero(out, 8) { out.getFloat(it).toDouble() }
    assertEquals(0.7f, out.getFloat(at), 1e-5f)
    assertEquals(-0.3f, out.getFloat(at + 4), 1e-5f)
  }

  @Test
  fun `switched off, bytes are copied unchanged`() {
    AudioEffects.update(DspSettings(enabled = false, virtualizer = 100.0))
    val out = run(C.ENCODING_PCM_16BIT) { it.putShort(1234).putShort(-4321) }
    assertEquals("no delay when off", 4, out.limit())
    assertEquals(1234.toShort(), out.getShort(0))
    assertEquals((-4321).toShort(), out.getShort(2))
  }

  @Test(expected = AudioProcessor.UnhandledAudioFormatException::class)
  fun `formats it cannot process are refused, so Media3 skips it`() {
    SonareAudioProcessor().configure(AudioProcessor.AudioFormat(48_000, 2, C.ENCODING_PCM_24BIT))
  }
}
