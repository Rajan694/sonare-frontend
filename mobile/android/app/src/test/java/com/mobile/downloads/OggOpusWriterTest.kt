package com.mobile.downloads

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class OggOpusWriterTest {

  @Test
  fun `crc32 gives the reference check value for 123456789`() {
    val input = "123456789".toByteArray(Charsets.US_ASCII)
    val crc = OggOpusWriter.crc32(input)
    // Reference check value for poly 0x04C11DB7, init 0, not reflected, no final xor is 0x89A1897F
    assertEquals(0x89A1897F.toInt(), crc)
  }

  @Test
  fun `lacingOf generates correct lacing values for 510, 65025, and 70000`() {
    // 510: 2 full segments of 255 and a terminating 0
    val lacing510 = OggOpusWriter.lacingOf(510)
    assertArrayEquals(intArrayOf(255, 255, 0), lacing510)

    // 65025 (255 * 255): 255 full segments of 255 and a terminating 0 (total 256 lacing values)
    val lacing65025 = OggOpusWriter.lacingOf(65025)
    assertEquals(256, lacing65025.size)
    for (i in 0 until 255) {
      assertEquals(255, lacing65025[i])
    }
    assertEquals(0, lacing65025[255])

    // 70000: 274 full segments of 255 and 70000 % 255 = 130
    val lacing70000 = OggOpusWriter.lacingOf(70000)
    assertEquals(275, lacing70000.size)
    for (i in 0 until 274) {
      assertEquals(255, lacing70000[i])
    }
    assertEquals(70000 % 255, lacing70000[274])
    assertEquals(130, lacing70000[274])
  }

  @Test
  fun `headerPages splits across pages with correct lacing, flags, sequence and granule 0`() {
    // 510 bytes: fits on 1 page with lacing [255, 255, 0]
    val pages510 = OggOpusWriter.headerPages(ByteArray(510), serial = 42, firstSequence = 1)
    assertEquals(1, pages510.size)
    val page510 = pages510[0]
    assertEquals('O'.code.toByte(), page510[0])
    assertEquals(0, page510[5].toInt()) // flags: 0
    assertEquals(3, page510[26].toInt()) // 3 lacing values
    assertEquals(255, page510[27].toInt() and 0xFF)
    assertEquals(255, page510[28].toInt() and 0xFF)
    assertEquals(0, page510[29].toInt() and 0xFF)

    // 65025 bytes: exactly 255 segments on first page; terminating 0 MUST spill to second CONTINUED page
    val pagesExact = OggOpusWriter.headerPages(ByteArray(65025), serial = 42, firstSequence = 1)
    assertEquals(2, pagesExact.size)

    val p1 = pagesExact[0]
    assertEquals(0, p1[5].toInt()) // flags: 0
    assertEquals(255, p1[26].toInt() and 0xFF) // 255 lacing values
    val p1Granule = ByteBuffer.wrap(p1, 6, 8).order(ByteOrder.LITTLE_ENDIAN).long
    assertEquals(0L, p1Granule)
    val p1Seq = ByteBuffer.wrap(p1, 18, 4).order(ByteOrder.LITTLE_ENDIAN).int
    assertEquals(1, p1Seq)

    val p2 = pagesExact[1]
    assertEquals(OggOpusWriter.CONTINUED, p2[5].toInt()) // flags: CONTINUED (0x01)
    assertEquals(1, p2[26].toInt() and 0xFF) // 1 lacing value: [0]
    assertEquals(0, p2[27].toInt() and 0xFF)
    val p2Granule = ByteBuffer.wrap(p2, 6, 8).order(ByteOrder.LITTLE_ENDIAN).long
    assertEquals(0L, p2Granule)
    val p2Seq = ByteBuffer.wrap(p2, 18, 4).order(ByteOrder.LITTLE_ENDIAN).int
    assertEquals(2, p2Seq)

    // 70000 bytes: 2 pages
    val pages70k = OggOpusWriter.headerPages(ByteArray(70000), serial = 42, firstSequence = 1)
    assertEquals(2, pages70k.size)
    assertEquals(0, pages70k[0][5].toInt())
    assertEquals(OggOpusWriter.CONTINUED, pages70k[1][5].toInt())
    assertEquals(255, pages70k[0][26].toInt() and 0xFF)
    assertEquals(20, pages70k[1][26].toInt() and 0xFF) // 275 - 255 = 20 lacing values
  }

  @Test
  fun `granule maths correctly calculates 48 kHz samples for code 0, 1, and 3 packets`() {
    // Config 1 (20 ms = 960 samples). Config bits = 1.
    // Code 0: 1 frame. TOC byte = (1 shl 3) or 0 = 8
    val packetCode0 = byteArrayOf(8.toByte(), 0x11, 0x22)
    assertEquals(960, OggOpusWriter.packetSampleCount(packetCode0))

    // Code 1: 2 frames equal size. TOC byte = (1 shl 3) or 1 = 9
    val packetCode1 = byteArrayOf(9.toByte(), 0x11, 0x22)
    assertEquals(1920, OggOpusWriter.packetSampleCount(packetCode1))

    // Code 2: 2 frames different size. TOC byte = (1 shl 3) or 2 = 10
    val packetCode2 = byteArrayOf(10.toByte(), 0x11, 0x22)
    assertEquals(1920, OggOpusWriter.packetSampleCount(packetCode2))

    // Code 3: arbitrary number of frames. TOC byte = (1 shl 3) or 3 = 11
    // Frame count byte = 4 (low 6 bits = 4)
    val packetCode3 = byteArrayOf(11.toByte(), 4.toByte(), 0x11, 0x22)
    assertEquals(960 * 4, OggOpusWriter.packetSampleCount(packetCode3))

    // Frame duration config checks
    // Config 0: 10 ms = 480 samples
    assertEquals(480, OggOpusWriter.packetSampleCount(byteArrayOf(0)))
    // Config 2: 40 ms = 1920 samples
    assertEquals(1920, OggOpusWriter.packetSampleCount(byteArrayOf((2 shl 3).toByte())))
    // Config 3: 60 ms = 2880 samples
    assertEquals(2880, OggOpusWriter.packetSampleCount(byteArrayOf((3 shl 3).toByte())))
    // Config 16: 2.5 ms = 120 samples
    assertEquals(120, OggOpusWriter.packetSampleCount(byteArrayOf((16 shl 3).toByte())))
    // Config 17: 5 ms = 240 samples
    assertEquals(240, OggOpusWriter.packetSampleCount(byteArrayOf((17 shl 3).toByte())))
  }

  @Test
  fun `the FLAC picture block is a big-endian front cover with type, size and data`() {
    val rawImage = byteArrayOf(0x01, 0x02, 0x03, 0x04, 0x05, 0x06)
    val block = OggOpusWriter.buildPictureBlock(
      data = rawImage,
      mimeType = "image/jpeg",
      width = 640,
      height = 480,
      depth = 24,
      colors = 0
    )

    val buf = ByteBuffer.wrap(block).order(ByteOrder.BIG_ENDIAN)
    assertEquals(3, buf.int) // Picture type 3 = Cover (front)
    val mimeLen = buf.int
    assertEquals(10, mimeLen)
    val mimeBytes = ByteArray(mimeLen)
    buf.get(mimeBytes)
    assertEquals("image/jpeg", String(mimeBytes, Charsets.US_ASCII))
    assertEquals(0, buf.int) // Description length 0
    assertEquals(640, buf.int) // Width
    assertEquals(480, buf.int) // Height
    assertEquals(24, buf.int) // Depth
    assertEquals(0, buf.int) // Colors
    assertEquals(6, buf.int) // Data length
    val dataBytes = ByteArray(6)
    buf.get(dataBytes)
    assertArrayEquals(rawImage, dataBytes)
  }

  @Test
  fun `OpusTags packet contains vendor and comments`() {
    val packet = OggOpusWriter.buildOpusTags(
      title = "Track Title",
      artist = "Track Artist",
      album = "Track Album"
    )
    val text = String(packet, Charsets.UTF_8)
    assertTrue(text.startsWith("OpusTags"))
    assertTrue(text.contains("Sonare"))
    assertTrue(text.contains("TITLE=Track Title"))
    assertTrue(text.contains("ARTIST=Track Artist"))
    assertTrue(text.contains("ALBUM=Track Album"))
  }
}
