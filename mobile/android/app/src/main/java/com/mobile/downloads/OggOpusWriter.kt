package com.mobile.downloads

import android.media.MediaExtractor
import android.media.MediaFormat
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.OutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Random

/**
 * Pure functions and stream writer for Ogg Opus files (RFC 7845 / RFC 3533).
 */
object OggOpusWriter {

  const val CONTINUED = 0x01
  const val BOS = 0x02
  const val EOS = 0x04
  const val PAGE_TARGET_BYTES = 4096

  private val CRC_LOOKUP = IntArray(256) { i ->
    var r = i shl 24
    for (j in 0 until 8) {
      r = if ((r and 0x80000000.toInt()) != 0) {
        (r shl 1) xor 0x04C11DB7
      } else {
        r shl 1
      }
    }
    r
  }

  /**
   * Ogg page CRC32 checksum (RFC 3533 Appendix A).
   * Generator polynomial 0x04C11DB7, initial 0, unreflected.
   */
  fun crc32(data: ByteArray, offset: Int = 0, length: Int = data.size, initial: Int = 0): Int {
    var crc = initial
    for (i in offset until offset + length) {
      val byte = data[i].toInt() and 0xFF
      crc = (crc shl 8) xor CRC_LOOKUP[((crc ushr 24) xor byte) and 0xFF]
    }
    return crc
  }

  /**
   * Frame duration in 48 kHz samples from the Opus TOC byte config bits (RFC 6716 Table 2 / §3.1).
   */
  fun frameDurationSamples(toc: Int): Int {
    val config = (toc ushr 3) and 0x1F
    return when {
      config < 12 -> when (config and 3) {
        0 -> 480    // 10 ms
        1 -> 960    // 20 ms
        2 -> 1920   // 40 ms
        else -> 2880 // 60 ms
      }
      config < 16 -> when (config and 1) {
        0 -> 480    // 10 ms
        else -> 960 // 20 ms
      }
      else -> when (config and 3) {
        0 -> 120    // 2.5 ms
        1 -> 240    // 5 ms
        2 -> 480    // 10 ms
        else -> 960 // 20 ms
      }
    }
  }

  /**
   * Calculates total 48 kHz PCM samples for an Opus packet from its TOC byte and optional frame count byte.
   */
  fun packetSampleCount(packet: ByteArray): Int {
    if (packet.isEmpty()) return 0
    val toc = packet[0].toInt() and 0xFF
    val frameSamples = frameDurationSamples(toc)
    val code = toc and 0x03
    val frameCount = when (code) {
      0 -> 1
      1, 2 -> 2
      3 -> {
        if (packet.size < 2) 0
        else packet[1].toInt() and 0x3F
      }
      else -> 1
    }
    return frameSamples * frameCount
  }

  /**
   * A packet's lacing values: 255 for each whole 255 bytes, then length % 255 (0 when it divides evenly).
   */
  fun lacingOf(length: Int): IntArray {
    val full = length / 255
    val rest = length % 255
    val lacing = IntArray(full + 1)
    for (i in 0 until full) lacing[i] = 255
    lacing[full] = rest
    return lacing
  }

  /**
   * Builds a single Ogg page (RFC 3533).
   */
  fun buildPage(
    serial: Int,
    sequence: Int,
    granule: Long,
    flags: Int,
    lacing: IntArray,
    body: ByteArray
  ): ByteArray {
    require(lacing.size <= 255) { "An Ogg page holds at most 255 lacing values" }
    val page = ByteArray(27 + lacing.size + body.size)
    page[0] = 'O'.code.toByte()
    page[1] = 'g'.code.toByte()
    page[2] = 'g'.code.toByte()
    page[3] = 'S'.code.toByte()
    page[4] = 0 // version
    page[5] = flags.toByte()

    for (i in 0..7) {
      page[6 + i] = ((granule ushr (i * 8)) and 0xFF).toByte()
    }
    for (i in 0..3) {
      page[14 + i] = ((serial ushr (i * 8)) and 0xFF).toByte()
    }
    for (i in 0..3) {
      page[18 + i] = ((sequence ushr (i * 8)) and 0xFF).toByte()
    }
    page[26] = (lacing.size and 0xFF).toByte()
    for (i in lacing.indices) {
      page[27 + i] = (lacing[i] and 0xFF).toByte()
    }
    System.arraycopy(body, 0, page, 27 + lacing.size, body.size)

    val crc = crc32(page, 0, page.size)
    for (i in 0..3) {
      page[22 + i] = ((crc ushr (i * 8)) and 0xFF).toByte()
    }
    return page
  }

  /**
   * A header packet over as many pages as it needs. All pages have granule 0.
   */
  fun headerPages(packet: ByteArray, serial: Int, firstSequence: Int, flags: Int = 0): List<ByteArray> {
    val lacing = lacingOf(packet.size)
    val pages = mutableListOf<ByteArray>()
    var at = 0
    var first = 0
    while (first < lacing.size) {
      val end = minOf(first + 255, lacing.size)
      val values = lacing.sliceArray(first until end)
      var size = 0
      for (v in values) size += v
      val pageBody = packet.copyOfRange(at, at + size)
      val pageFlags = if (first == 0) flags else CONTINUED
      pages.add(
        buildPage(
          serial = serial,
          sequence = firstSequence + pages.size,
          granule = 0L,
          flags = pageFlags,
          lacing = values,
          body = pageBody
        )
      )
      at += size
      first += 255
    }
    return pages
  }

  /**
   * Builds a FLAC METADATA_BLOCK_PICTURE byte array.
   * Type 3 (Cover front), Big-Endian integers.
   */
  fun buildPictureBlock(
    data: ByteArray,
    mimeType: String = "image/jpeg",
    width: Int = 0,
    height: Int = 0,
    depth: Int = 24,
    colors: Int = 0
  ): ByteArray {
    val mimeBytes = mimeType.toByteArray(Charsets.US_ASCII)
    val out = ByteArrayOutputStream(32 + mimeBytes.size + data.size)
    val buf = ByteBuffer.allocate(4).order(ByteOrder.BIG_ENDIAN)

    fun writeInt(v: Int) {
      buf.clear()
      buf.putInt(v)
      out.write(buf.array())
    }

    writeInt(3) // Picture type: 3 = Cover (front)
    writeInt(mimeBytes.size)
    out.write(mimeBytes)
    writeInt(0) // Description length: 0 (empty description)
    writeInt(width)
    writeInt(height)
    writeInt(depth)
    writeInt(colors)
    writeInt(data.size)
    out.write(data)

    return out.toByteArray()
  }

  /**
   * Encodes a byte array to Base64 without line wrapping.
   */
  fun base64Encode(bytes: ByteArray): String {
    val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    val sb = StringBuilder((bytes.size + 2) / 3 * 4)
    var i = 0
    while (i < bytes.size) {
      val b0 = bytes[i++].toInt() and 0xFF
      val b1 = if (i < bytes.size) bytes[i++].toInt() and 0xFF else -1
      val b2 = if (i < bytes.size) bytes[i++].toInt() and 0xFF else -1
      sb.append(chars[b0 ushr 2])
      if (b1 != -1) {
        sb.append(chars[((b0 and 0x03) shl 4) or (b1 ushr 4)])
        if (b2 != -1) {
          sb.append(chars[((b1 and 0x0F) shl 2) or (b2 ushr 6)])
          sb.append(chars[b2 and 0x3F])
        } else {
          sb.append(chars[(b1 and 0x0F) shl 2])
          sb.append('=')
        }
      } else {
        sb.append(chars[(b0 and 0x03) shl 4])
        sb.append("==")
      }
    }
    return sb.toString()
  }

  /**
   * Builds an OpusTags packet (RFC 7845 Section 5.2).
   */
  fun buildOpusTags(
    title: String? = null,
    artist: String? = null,
    album: String? = null,
    pictureBlock: ByteArray? = null
  ): ByteArray {
    val out = ByteArrayOutputStream()
    out.write("OpusTags".toByteArray(Charsets.US_ASCII))

    val buf = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
    fun writeIntLE(v: Int) {
      buf.clear()
      buf.putInt(v)
      out.write(buf.array())
    }

    val vendor = "Sonare".toByteArray(Charsets.UTF_8)
    writeIntLE(vendor.size)
    out.write(vendor)

    val comments = mutableListOf<ByteArray>()
    if (!title.isNullOrEmpty()) comments.add("TITLE=$title".toByteArray(Charsets.UTF_8))
    if (!artist.isNullOrEmpty()) comments.add("ARTIST=$artist".toByteArray(Charsets.UTF_8))
    if (!album.isNullOrEmpty()) comments.add("ALBUM=$album".toByteArray(Charsets.UTF_8))
    if (pictureBlock != null && pictureBlock.isNotEmpty()) {
      val b64 = base64Encode(pictureBlock)
      comments.add("METADATA_BLOCK_PICTURE=$b64".toByteArray(Charsets.US_ASCII))
    }

    writeIntLE(comments.size)
    for (comment in comments) {
      writeIntLE(comment.size)
      out.write(comment)
    }

    return out.toByteArray()
  }

  /**
   * Remuxes an Opus audio track from a WebM file to an Ogg Opus file with metadata and cover art.
   */
  fun remuxWebm(
    webmFile: File,
    oggOutputFile: File,
    title: String?,
    artist: String?,
    album: String?,
    pictureBlock: ByteArray? = null
  ) {
    val extractor = MediaExtractor()
    try {
      extractor.setDataSource(webmFile.absolutePath)
      var audioTrackIndex = -1
      var opusHeadBytes: ByteArray? = null

      for (i in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(i)
        val mime = format.getString(MediaFormat.KEY_MIME)
        // Only Opus: an older Vorbis WebM can't go into an Ogg Opus file (the caller keeps it as is).
        if (mime == MediaFormat.MIMETYPE_AUDIO_OPUS) {
          audioTrackIndex = i
          if (format.containsKey("csd-0")) {
            val csd = format.getByteBuffer("csd-0")
            if (csd != null) {
              val bytes = ByteArray(csd.remaining())
              csd.get(bytes)
              csd.rewind()
              opusHeadBytes = bytes
            }
          }
          break
        }
      }

      if (audioTrackIndex < 0) {
        throw IOException("No Opus track in the WebM file")
      }
      val idHeader = opusHeadBytes ?: throw IOException("No OpusHead (csd-0) found in audio track")
      if (idHeader.size < 19 || String(idHeader, 0, 8, Charsets.US_ASCII) != "OpusHead") {
        throw IOException("csd-0 is not an OpusHead")
      }
      extractor.selectTrack(audioTrackIndex)

      val serial = Random().nextInt()
      val tags = buildOpusTags(title, artist, album, pictureBlock)

      FileOutputStream(oggOutputFile).use { fos ->
        // Page 0: OpusHead alone, BOS, granule 0
        val headPages = headerPages(idHeader, serial, 0, BOS)
        for (page in headPages) {
          fos.write(page)
        }

        // Header pages: OpusTags
        val tagPages = headerPages(tags, serial, headPages.size)
        for (page in tagPages) {
          fos.write(page)
        }

        var sequence = headPages.size + tagPages.size
        val audioLacing = mutableListOf<Int>()
        val audioBody = ByteArrayOutputStream()
        var audioBytes = 0
        var granule = 0L

        fun flushAudioPage(flags: Int) {
          val page = buildPage(
            serial = serial,
            sequence = sequence++,
            granule = granule,
            flags = flags,
            lacing = audioLacing.toIntArray(),
            body = audioBody.toByteArray()
          )
          fos.write(page)
          audioLacing.clear()
          audioBody.reset()
          audioBytes = 0
        }

        val buffer = ByteBuffer.allocate(64 * 1024)
        fun readNext(): ByteArray? {
          buffer.clear()
          val sampleSize = extractor.readSampleData(buffer, 0)
          if (sampleSize < 0) return null
          val pkt = ByteArray(sampleSize)
          buffer.get(pkt)
          extractor.advance()
          return pkt
        }

        var currentPkt = readNext()
        while (currentPkt != null) {
          val nextPkt = readNext()
          val isLast = (nextPkt == null)
          val pktLacing = lacingOf(currentPkt.size)

          if (audioLacing.isNotEmpty() && (audioLacing.size + pktLacing.size > 255 || audioBytes + currentPkt.size > PAGE_TARGET_BYTES)) {
            flushAudioPage(0)
          }

          for (v in pktLacing) audioLacing.add(v)
          audioBody.write(currentPkt)
          audioBytes += currentPkt.size
          granule += packetSampleCount(currentPkt)

          if (isLast) {
            flushAudioPage(EOS)
          }

          currentPkt = nextPkt
        }
        fos.flush()
      }
    } finally {
      runCatching { extractor.release() }
    }
  }
}
