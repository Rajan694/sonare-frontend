package com.mobile.downloads

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

class Mp4TaggerTest {

  private fun u32Bytes(value: Long): ByteArray {
    val b = ByteArray(4)
    b[0] = ((value ushr 24) and 0xFF).toByte()
    b[1] = ((value ushr 16) and 0xFF).toByte()
    b[2] = ((value ushr 8) and 0xFF).toByte()
    b[3] = (value and 0xFF).toByte()
    return b
  }

  private fun cat(vararg parts: ByteArray): ByteArray {
    val total = parts.sumOf { it.size }
    val out = ByteArray(total)
    var at = 0
    for (p in parts) {
      System.arraycopy(p, 0, out, at, p.size)
      at += p.size
    }
    return out
  }

  private fun atom(type: String, vararg payloads: ByteArray): ByteArray {
    return Mp4Tagger.makeAtom(type, *payloads)
  }

  @Test
  fun `MP4 stco patching on a tiny hand-built file`() {
    val stcoEntries = longArrayOf(1000L, 2000L, 3000L)
    val stcoBody = cat(
      byteArrayOf(0, 0, 0, 0), // version + flags
      u32Bytes(stcoEntries.size.toLong()),
      u32Bytes(stcoEntries[0]),
      u32Bytes(stcoEntries[1]),
      u32Bytes(stcoEntries[2])
    )
    val stcoAtom = atom("stco", stcoBody)
    val stblAtom = atom("stbl", stcoAtom)
    val minfAtom = atom("minf", stblAtom)
    val mdiaAtom = atom("mdia", minfAtom)
    val trakAtom = atom("trak", mdiaAtom)

    val mvhd = atom("mvhd", ByteArray(24))
    val moovBefore = atom("moov", mvhd, trakAtom)
    val mdatAfter = atom("mdat", ByteArray(50))
    val ftyp = atom("ftyp", "M4A ".toByteArray(Charsets.ISO_8859_1), u32Bytes(0))

    val input = cat(ftyp, moovBefore, mdatAfter)

    val tagged = Mp4Tagger.addTags(
      mp4 = input,
      title = "Adjusted Title",
      artist = "Adjusted Artist",
      album = "Adjusted Album"
    )

    assertNotNull(tagged)
    val delta = (tagged!!.size - input.size).toLong()
    assertTrue(delta > 0)

    val text = String(tagged, Charsets.ISO_8859_1)
    val stcoPos = text.indexOf("stco")
    assertTrue(stcoPos > 0)

    val count = Mp4Tagger.readU32(tagged, stcoPos + 8)
    assertEquals(3L, count)

    val patched0 = Mp4Tagger.readU32(tagged, stcoPos + 12)
    val patched1 = Mp4Tagger.readU32(tagged, stcoPos + 16)
    val patched2 = Mp4Tagger.readU32(tagged, stcoPos + 20)

    assertEquals(1000L + delta, patched0)
    assertEquals(2000L + delta, patched1)
    assertEquals(3000L + delta, patched2)
  }

  @Test
  fun `fragmented MP4 patches tfhd base-data-offset and tfra moof offset`() {
    val trak = atom("trak", atom("mdia", atom("minf", atom("stbl", atom("stco", cat(byteArrayOf(0, 0, 0, 0), u32Bytes(0)))))))
    val moov = atom("moov", atom("mvhd", ByteArray(24)), trak, atom("mvex", atom("trex", ByteArray(24))))
    val ftyp = atom("ftyp", "dash".toByteArray(Charsets.ISO_8859_1), u32Bytes(0))
    val moofAt = (ftyp.size + moov.size).toLong()

    // tfhd with flag 1: base-data-offset present. track_ID (1), then 64-bit base-data-offset
    val tfhdBody = cat(
      byteArrayOf(0, 0, 0, 1), // version 0, flags 0x000001
      u32Bytes(1), // track_ID
      u32Bytes(0), u32Bytes(moofAt) // 64-bit base-data-offset
    )
    val tfhd = atom("tfhd", tfhdBody)
    val moof = atom("moof", atom("mfhd", cat(byteArrayOf(0, 0, 0, 0), u32Bytes(1))), atom("traf", tfhd))
    val mdat = atom("mdat", ByteArray(40))

    // tfra v0: track_ID, lengthSize (0 = 1 byte each for traf/trun/sample), entry_count (1), entry: time(4), moof_offset(4), traf(1), trun(1), sample(1)
    val tfraBody = cat(
      byteArrayOf(0, 0, 0, 0), // version 0, flags 0
      u32Bytes(1), // track_ID
      u32Bytes(0), // lengthSize
      u32Bytes(1), // entry_count = 1
      u32Bytes(0), // time
      u32Bytes(moofAt), // moof_offset
      byteArrayOf(1, 1, 1)
    )
    val tfra = atom("tfra", tfraBody)
    val mfra = atom("mfra", tfra)

    val input = cat(ftyp, moov, moof, mdat, mfra)

    val tagged = Mp4Tagger.addTags(input, title = "Fragmented Track")
    assertNotNull(tagged)
    val delta = (tagged!!.size - input.size).toLong()
    assertTrue(delta > 0)

    val text = String(tagged, Charsets.ISO_8859_1)
    val tfhdPos = text.indexOf("tfhd")
    assertTrue(tfhdPos > 0)
    val newBaseDataOffset = Mp4Tagger.readU64(tagged, tfhdPos + 12)
    assertEquals(moofAt + delta, newBaseDataOffset)

    val tfraPos = text.indexOf("tfra")
    assertTrue(tfraPos > 0)
    val newTfraMoofOffset = Mp4Tagger.readU32(tagged, tfraPos + 24)
    assertEquals(moofAt + delta, newTfraMoofOffset)
  }

  @Test
  fun `bad input - missing moov or corrupt data - returns null and leaves original`() {
    // Missing moov: only ftyp and mdat
    val ftyp = atom("ftyp", "M4A ".toByteArray(Charsets.ISO_8859_1), u32Bytes(0))
    val mdat = atom("mdat", ByteArray(30))
    val noMoov = cat(ftyp, mdat)
    assertNull(Mp4Tagger.addTags(noMoov, title = "Test"))

    // Corrupt garbage
    val garbage = byteArrayOf(0x01, 0x02, 0x03, 0x04)
    assertNull(Mp4Tagger.addTags(garbage, title = "Test"))

    // tagFile returns false on corrupt file
    val tempIn = File.createTempFile("corrupt", ".m4a").apply { writeBytes(garbage); deleteOnExit() }
    val tempOut = File.createTempFile("output", ".m4a").apply { deleteOnExit() }
    val ok = Mp4Tagger.tagFile(tempIn, tempOut, title = "Test")
    assertFalse(ok)
  }

  @Test
  fun `replaces existing udta meta ilst tags cleanly`() {
    val mvhd = atom("mvhd", ByteArray(24))
    val oldUdta = atom("udta", Mp4Tagger.buildMetaAtom(title = "Old Title", artist = "Old Artist"))
    val moov = atom("moov", mvhd, oldUdta)
    val mdat = atom("mdat", ByteArray(20))
    val input = cat(atom("ftyp", "M4A ".toByteArray(Charsets.ISO_8859_1), u32Bytes(0)), moov, mdat)

    val tagged = Mp4Tagger.addTags(input, title = "New Title", artist = "New Artist")
    assertNotNull(tagged)

    val text = String(tagged!!, Charsets.UTF_8)
    assertTrue(text.contains("New Title"))
    assertTrue(text.contains("New Artist"))
    assertFalse(text.contains("Old Title"))
    assertFalse(text.contains("Old Artist"))
  }

  @Test
  fun `cover art sets covr data type 14 for PNG and 13 for JPEG`() {
    val pngCover = byteArrayOf(0x01, 0x02, 0x03)
    val jpegCover = byteArrayOf(0x04, 0x05, 0x06)

    val pngMeta = Mp4Tagger.buildMetaAtom(coverBytes = pngCover, coverMime = "image/png")
    val jpegMeta = Mp4Tagger.buildMetaAtom(coverBytes = jpegCover, coverMime = "image/jpeg")

    val pngText = String(pngMeta, Charsets.ISO_8859_1)
    val jpegText = String(jpegMeta, Charsets.ISO_8859_1)

    val pngCovrPos = pngText.indexOf("covr")
    val jpegCovrPos = jpegText.indexOf("covr")

    assertTrue(pngCovrPos > 0)
    assertTrue(jpegCovrPos > 0)

    // Inside covr -> data atom. covr(8) + data header(8) + typeFlag at byte 3 of data payload
    // covrPos points to "covr":
    // "covr"(4) + data length(4) + "data"(4) + typeFlag(3: 0, 0, type)
    // 4 + 4 + 4 + 3 = 15
    val pngTypeFlag = pngMeta[pngCovrPos + 15].toInt()
    val jpegTypeFlag = jpegMeta[jpegCovrPos + 15].toInt()

    assertEquals(14, pngTypeFlag)
    assertEquals(13, jpegTypeFlag)
  }
}
