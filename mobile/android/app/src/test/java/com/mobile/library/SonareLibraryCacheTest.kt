package com.mobile.library

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.util.Base64

class SonareLibraryCacheTest {

  @get:Rule
  val tempFolder = TemporaryFolder()

  @Test
  fun `cache paths and filenames are formatted correctly`() {
    val cacheDir = tempFolder.newFolder("cache")
    val mediaId = "12345"

    val art = ArtCache.artFile(cacheDir, mediaId)
    val none = ArtCache.noneFile(cacheDir, mediaId)
    val tmp = ArtCache.tempFile(cacheDir, mediaId)

    assertEquals(File(cacheDir, "art/12345.jpg").absolutePath, art.absolutePath)
    assertEquals(File(cacheDir, "art/12345.none").absolutePath, none.absolutePath)
    assertEquals(File(cacheDir, "art/12345.tmp").absolutePath, tmp.absolutePath)
  }

  @Test
  fun `sanitizeId replaces special characters for filesystem safety`() {
    assertEquals("music_123_test", ArtCache.sanitizeId("music/123:test"))
    assertEquals("normal_id-45", ArtCache.sanitizeId("normal_id-45"))
    assertEquals("____", ArtCache.sanitizeId("!@#$"))
  }

  @Test
  fun `markNone creates none marker and removes existing art file`() {
    val cacheDir = tempFolder.newFolder("cache")
    val id = "42"
    val art = ArtCache.artFile(cacheDir, id)
    val none = ArtCache.noneFile(cacheDir, id)

    // Pre-create art file
    art.parentFile?.mkdirs()
    art.writeText("fake-art")
    assertTrue(art.exists())
    assertFalse(none.exists())

    ArtCache.markNone(cacheDir, id)

    assertFalse("art file should be removed", art.exists())
    assertTrue("none marker should be created", none.exists())
    assertEquals(0L, none.length())
  }

  @Test
  fun `isCacheValid checks file existence and modification timestamps`() {
    val cacheDir = tempFolder.newFolder("cache")
    val file = File(cacheDir, "test.jpg")

    // Missing file is never valid
    assertFalse(ArtCache.isCacheValid(file, 1000L))

    file.writeText("cached-data")
    file.setLastModified(2000L)

    // Unknown song modified time (<= 0) considers cache valid
    assertTrue(ArtCache.isCacheValid(file, 0L))
    assertTrue(ArtCache.isCacheValid(file, -1L))

    // Song older than or equal to cache time is valid
    assertTrue(ArtCache.isCacheValid(file, 1500L))
    assertTrue(ArtCache.isCacheValid(file, 2000L))

    // Song modified after cache was created is invalid
    assertFalse(ArtCache.isCacheValid(file, 3000L))
  }

  @Test
  fun `calculateInSampleSize downsamples image dimensions as powers of two`() {
    // Smaller or equal dimensions -> sample size 1
    assertEquals(1, ArtCache.calculateInSampleSize(256, 256, 512, 512))
    assertEquals(1, ArtCache.calculateInSampleSize(512, 512, 512, 512))

    // Exactly double -> sample size 2
    assertEquals(2, ArtCache.calculateInSampleSize(1024, 1024, 512, 512))

    // 4x larger -> sample size 4
    assertEquals(4, ArtCache.calculateInSampleSize(2048, 2048, 512, 512))

    // Non-square dimensions
    assertEquals(2, ArtCache.calculateInSampleSize(1200, 1600, 512, 512))
  }

  @Test
  fun `argbToRgbaBytes unpacks ARGB ints into RGBA byte channels`() {
    // 0xAARRGGBB
    val red = 0xFFFF0000.toInt()
    val green = 0xFF00FF00.toInt()
    val blue = 0xFF0000FF.toInt()
    val translucent = 0x80123456.toInt()

    val pixels = intArrayOf(red, green, blue, translucent)
    val rgba = ArtCache.argbToRgbaBytes(pixels)

    assertEquals(16, rgba.size)

    // Red: R=255, G=0, B=0, A=255
    assertEquals(255.toByte(), rgba[0])
    assertEquals(0.toByte(), rgba[1])
    assertEquals(0.toByte(), rgba[2])
    assertEquals(255.toByte(), rgba[3])

    // Green: R=0, G=255, B=0, A=255
    assertEquals(0.toByte(), rgba[4])
    assertEquals(255.toByte(), rgba[5])
    assertEquals(0.toByte(), rgba[6])
    assertEquals(255.toByte(), rgba[7])

    // Blue: R=0, G=0, B=255, A=255
    assertEquals(0.toByte(), rgba[8])
    assertEquals(0.toByte(), rgba[9])
    assertEquals(255.toByte(), rgba[10])
    assertEquals(255.toByte(), rgba[11])

    // Translucent: R=0x12, G=0x34, B=0x56, A=0x80
    assertEquals(0x12.toByte(), rgba[12])
    assertEquals(0x34.toByte(), rgba[13])
    assertEquals(0x56.toByte(), rgba[14])
    assertEquals(0x80.toByte(), rgba[15])
  }

  @Test
  fun `base64Encode encodes bytes consistently`() {
    val bytes = byteArrayOf(1, 2, 3, 4, 5, 6, 7, 8)
    val encoded = ArtCache.base64Encode(bytes)

    assertFalse("Should have no newlines", encoded.contains("\n"))
    val decoded = Base64.getDecoder().decode(encoded)
    assertArrayEquals(bytes, decoded)
  }
}
