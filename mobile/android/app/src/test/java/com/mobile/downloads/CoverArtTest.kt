package com.mobile.downloads

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class CoverArtTest {

  @Test
  fun `imageInfo detects PNG and extracts dimensions from IHDR`() {
    val buf = ByteBuffer.allocate(32).order(ByteOrder.BIG_ENDIAN)
    // PNG signature: 0x89504E47, 0x0D0A1A0A
    buf.put(0x89.toByte())
    buf.put('P'.code.toByte())
    buf.put('N'.code.toByte())
    buf.put('G'.code.toByte())
    buf.put(byteArrayOf(0x0D, 0x0A, 0x1A, 0x0A))
    // IHDR length: 13
    buf.putInt(13)
    // IHDR chunk type: "IHDR"
    buf.put('I'.code.toByte())
    buf.put('H'.code.toByte())
    buf.put('D'.code.toByte())
    buf.put('R'.code.toByte())
    // Width: 1920, Height: 1080
    buf.putInt(1920)
    buf.putInt(1080)
    // Bit depth (8), color type (2), etc.
    buf.put(byteArrayOf(8, 2, 0, 0, 0))

    val cover = CoverArt.imageInfo(buf.array())
    assertNotNull(cover)
    assertEquals("image/png", cover!!.mime)
    assertEquals(1920, cover.width)
    assertEquals(1080, cover.height)
  }

  @Test
  fun `imageInfo detects JPEG and extracts dimensions from SOF marker`() {
    val buf = ByteBuffer.allocate(30).order(ByteOrder.BIG_ENDIAN)
    // SOI: 0xFF, 0xD8
    buf.put(0xFF.toByte())
    buf.put(0xD8.toByte())
    // SOF0: 0xFF, 0xC0
    buf.put(0xFF.toByte())
    buf.put(0xC0.toByte())
    // Length: 17
    buf.putShort(17)
    // Data precision: 8
    buf.put(8.toByte())
    // Height: 480, Width: 640
    buf.putShort(480)
    buf.putShort(640)
    // Components
    buf.put(3.toByte())

    val cover = CoverArt.imageInfo(buf.array())
    assertNotNull(cover)
    assertEquals("image/jpeg", cover!!.mime)
    assertEquals(640, cover.width)
    assertEquals(480, cover.height)
  }

  @Test
  fun `imageInfo skips DHT (C4), JPG (C8) and DAC (CC) markers in JPEG`() {
    val buf = ByteBuffer.allocate(50).order(ByteOrder.BIG_ENDIAN)
    // SOI: 0xFF, 0xD8
    buf.put(0xFF.toByte())
    buf.put(0xD8.toByte())
    // DHT marker: 0xFF, 0xC4 with length 6
    buf.put(0xFF.toByte())
    buf.put(0xC4.toByte())
    buf.putShort(6)
    buf.put(byteArrayOf(0, 1, 2, 3))
    // SOF2 marker: 0xFF, 0xC2 with length 17
    buf.put(0xFF.toByte())
    buf.put(0xC2.toByte())
    buf.putShort(17)
    buf.put(8.toByte())
    buf.putShort(1000) // height
    buf.putShort(1200) // width
    buf.put(3.toByte())

    val cover = CoverArt.imageInfo(buf.array())
    assertNotNull(cover)
    assertEquals("image/jpeg", cover!!.mime)
    assertEquals(1200, cover.width)
    assertEquals(1000, cover.height)
  }

  @Test
  fun `imageInfo returns null for WebP and non-image bytes`() {
    // WebP signature: RIFF....WEBP
    val webp = "RIFF1234WEBPVP8 ".toByteArray(Charsets.US_ASCII)
    assertNull(CoverArt.imageInfo(webp))

    // Random noise
    val randomBytes = byteArrayOf(0x01, 0x02, 0x03, 0x04, 0x05)
    assertNull(CoverArt.imageInfo(randomBytes))

    // Empty
    assertNull(CoverArt.imageInfo(ByteArray(0)))
  }
}
