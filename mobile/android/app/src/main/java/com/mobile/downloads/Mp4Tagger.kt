package com.mobile.downloads

import java.io.File
import java.io.IOException

/**
 * Pure functions and file tagger for MP4 / M4A (AAC) files.
 * Injects or updates metadata in `moov/udta/meta(hdlr mdir)/ilst`.
 * Adjusts `stco`, `co64`, `tfhd` and `tfra` chunk/fragment offsets when `moov` expands before media.
 */
object Mp4Tagger {

  data class AtomSpan(
    val type: String,
    val start: Int,
    val headerSize: Int,
    val size: Long,
    val end: Int
  )

  fun readU32(b: ByteArray, offset: Int): Long {
    return ((b[offset].toLong() and 0xFF) shl 24) or
      ((b[offset + 1].toLong() and 0xFF) shl 16) or
      ((b[offset + 2].toLong() and 0xFF) shl 8) or
      (b[offset + 3].toLong() and 0xFF)
  }

  fun writeU32(b: ByteArray, offset: Int, value: Long) {
    b[offset] = ((value ushr 24) and 0xFF).toByte()
    b[offset + 1] = ((value ushr 16) and 0xFF).toByte()
    b[offset + 2] = ((value ushr 8) and 0xFF).toByte()
    b[offset + 3] = (value and 0xFF).toByte()
  }

  fun readU64(b: ByteArray, offset: Int): Long {
    val hi = readU32(b, offset)
    val lo = readU32(b, offset + 4)
    return (hi shl 32) or lo
  }

  fun writeU64(b: ByteArray, offset: Int, value: Long) {
    writeU32(b, offset, value ushr 32)
    writeU32(b, offset + 4, value and 0xFFFFFFFFL)
  }

  fun readAscii(b: ByteArray, offset: Int, length: Int): String {
    return String(b, offset, length, Charsets.ISO_8859_1)
  }

  fun makeAtom(type: String, vararg payloads: ByteArray): ByteArray {
    val totalPayload = payloads.sumOf { it.size }
    val out = ByteArray(8 + totalPayload)
    writeU32(out, 0, out.size.toLong())
    val typeBytes = type.toByteArray(Charsets.ISO_8859_1)
    System.arraycopy(typeBytes, 0, out, 4, minOf(4, typeBytes.size))
    var at = 8
    for (p in payloads) {
      System.arraycopy(p, 0, out, at, p.size)
      at += p.size
    }
    return out
  }

  fun makeTextItemAtom(type: String, text: String): ByteArray {
    val textBytes = text.toByteArray(Charsets.UTF_8)
    val dataHeader = byteArrayOf(0, 0, 0, 1, 0, 0, 0, 0) // type 1 = UTF-8, locale 0
    val dataAtom = makeAtom("data", dataHeader, textBytes)
    return makeAtom(type, dataAtom)
  }

  fun makeCoverItemAtom(data: ByteArray, mime: String): ByteArray {
    val typeFlag = if (mime.equals("image/png", ignoreCase = true)) 14.toByte() else 13.toByte() // 13 = JPEG, 14 = PNG
    val dataHeader = byteArrayOf(0, 0, 0, typeFlag, 0, 0, 0, 0)
    val dataAtom = makeAtom("data", dataHeader, data)
    return makeAtom("covr", dataAtom)
  }

  fun buildMetaAtom(
    title: String? = null,
    artist: String? = null,
    album: String? = null,
    coverBytes: ByteArray? = null,
    coverMime: String = "image/jpeg"
  ): ByteArray {
    val items = mutableListOf<ByteArray>()
    if (!title.isNullOrEmpty()) items.add(makeTextItemAtom("\u00a9nam", title))
    if (!artist.isNullOrEmpty()) items.add(makeTextItemAtom("\u00a9ART", artist))
    if (!album.isNullOrEmpty()) items.add(makeTextItemAtom("\u00a9alb", album))
    if (coverBytes != null && coverBytes.isNotEmpty()) items.add(makeCoverItemAtom(coverBytes, coverMime))

    val ilstAtom = makeAtom("ilst", *items.toTypedArray())

    // hdlr inside meta
    val hdlrPayload = ByteArray(25)
    // version(0) + flags(0) = 4 bytes
    // pre-defined = 0 (4 bytes)
    // handler type = 'mdir' (4 bytes)
    "mdir".toByteArray(Charsets.ISO_8859_1).copyInto(hdlrPayload, 8)
    // manufacturer = 'appl' (4 bytes)
    "appl".toByteArray(Charsets.ISO_8859_1).copyInto(hdlrPayload, 12)
    // flags/reserved = 0 (8 bytes)
    // name = '' (1 byte null terminator at index 24)
    val hdlrAtom = makeAtom("hdlr", hdlrPayload)

    // meta is a FullAtom: 4 bytes version(0) + flags(0)
    val metaVersionFlags = ByteArray(4)
    return makeAtom("meta", metaVersionFlags, hdlrAtom, ilstAtom)
  }

  fun findAtoms(b: ByteArray, start: Int, end: Int): List<AtomSpan> {
    val atoms = mutableListOf<AtomSpan>()
    var p = start
    while (p + 8 <= end) {
      var size = readU32(b, p)
      val type = readAscii(b, p + 4, 4)
      var headerSize = 8
      if (size == 1L) {
        if (p + 16 > end) break
        size = readU64(b, p + 8)
        headerSize = 16
      } else if (size == 0L) {
        size = (end - p).toLong()
      }
      if (size < headerSize || p + size > end || p + size < 0) break
      atoms.add(AtomSpan(type, p, headerSize, size, (p + size).toInt()))
      p += size.toInt()
    }
    return atoms
  }

  fun adjustOffsets(b: ByteArray, start: Int, end: Int, delta: Long) {
    if (delta == 0L) return
    val atoms = findAtoms(b, start, end)
    for (atom in atoms) {
      val type = atom.type
      val bodyStart = atom.start + atom.headerSize
      val atomEnd = atom.end
      when (type) {
        "stco" -> {
          if (bodyStart + 8 <= atomEnd) {
            val count = readU32(b, bodyStart + 4).toInt()
            var pOffset = bodyStart + 8
            for (i in 0 until count) {
              if (pOffset + 4 > atomEnd) break
              val currentOffset = readU32(b, pOffset)
              writeU32(b, pOffset, currentOffset + delta)
              pOffset += 4
            }
          }
        }
        "co64" -> {
          if (bodyStart + 8 <= atomEnd) {
            val count = readU32(b, bodyStart + 4).toInt()
            var pOffset = bodyStart + 8
            for (i in 0 until count) {
              if (pOffset + 8 > atomEnd) break
              val currentOffset = readU64(b, pOffset)
              writeU64(b, pOffset, currentOffset + delta)
              pOffset += 8
            }
          }
        }
        "tfhd" -> {
          if (bodyStart + 8 <= atomEnd) {
            val flags = ((b[bodyStart + 1].toInt() and 0xFF) shl 16) or
              ((b[bodyStart + 2].toInt() and 0xFF) shl 8) or
              (b[bodyStart + 3].toInt() and 0xFF)
            if ((flags and 0x000001) != 0) {
              if (bodyStart + 16 <= atomEnd) {
                val currentOffset = readU64(b, bodyStart + 8)
                writeU64(b, bodyStart + 8, currentOffset + delta)
              }
            }
          }
        }
        "tfra" -> {
          if (bodyStart + 16 <= atomEnd) {
            val version = b[bodyStart].toInt() and 0xFF
            val lengthSize = readU32(b, bodyStart + 8)
            val trafSize = (((lengthSize shr 4) and 3) + 1).toInt()
            val trunSize = (((lengthSize shr 2) and 3) + 1).toInt()
            val sampleNumSize = ((lengthSize and 3) + 1).toInt()
            val count = readU32(b, bodyStart + 12).toInt()
            var pEntry = bodyStart + 16
            val timeSize = if (version == 1) 8 else 4
            val moofOffsetSize = if (version == 1) 8 else 4
            for (i in 0 until count) {
              if (pEntry + timeSize + moofOffsetSize > atomEnd) break
              pEntry += timeSize
              if (moofOffsetSize == 4) {
                val currentOffset = readU32(b, pEntry)
                writeU32(b, pEntry, currentOffset + delta)
                pEntry += 4
              } else {
                val currentOffset = readU64(b, pEntry)
                writeU64(b, pEntry, currentOffset + delta)
                pEntry += 8
              }
              pEntry += trafSize + trunSize + sampleNumSize
            }
          }
        }
        "moov", "trak", "mdia", "minf", "stbl", "mvex", "moof", "traf", "mfra" -> {
          adjustOffsets(b, bodyStart, atomEnd, delta)
        }
      }
    }
  }

  fun addTags(
    mp4: ByteArray,
    title: String? = null,
    artist: String? = null,
    album: String? = null,
    coverBytes: ByteArray? = null,
    coverMime: String = "image/jpeg"
  ): ByteArray? {
    try {
      val topAtoms = findAtoms(mp4, 0, mp4.size)
      val moovAtom = topAtoms.firstOrNull { it.type == "moov" } ?: return null

      val newMetaAtom = buildMetaAtom(title, artist, album, coverBytes, coverMime)

      val moovChildAtoms = findAtoms(mp4, moovAtom.start + moovAtom.headerSize, moovAtom.end)
      val udtaAtom = moovChildAtoms.firstOrNull { it.type == "udta" }

      val newUdtaBytes: ByteArray
      val udtaStartInMoov: Int
      val udtaOriginalSize: Int

      if (udtaAtom != null) {
        udtaStartInMoov = udtaAtom.start - moovAtom.start
        udtaOriginalSize = udtaAtom.size.toInt()
        val udtaChildren = findAtoms(mp4, udtaAtom.start + udtaAtom.headerSize, udtaAtom.end)
        val existingMeta = udtaChildren.firstOrNull { it.type == "meta" }

        if (existingMeta != null) {
          val beforeMeta = mp4.copyOfRange(udtaAtom.start + udtaAtom.headerSize, existingMeta.start)
          val afterMeta = mp4.copyOfRange(existingMeta.end, udtaAtom.end)
          newUdtaBytes = makeAtom("udta", beforeMeta, newMetaAtom, afterMeta)
        } else {
          val udtaBody = mp4.copyOfRange(udtaAtom.start + udtaAtom.headerSize, udtaAtom.end)
          newUdtaBytes = makeAtom("udta", udtaBody, newMetaAtom)
        }
      } else {
        newUdtaBytes = makeAtom("udta", newMetaAtom)
        udtaStartInMoov = moovAtom.size.toInt()
        udtaOriginalSize = 0
      }

      val moovHeader = mp4.copyOfRange(moovAtom.start, moovAtom.start + moovAtom.headerSize)
      val moovBodyBeforeUdta = mp4.copyOfRange(moovAtom.start + moovAtom.headerSize, moovAtom.start + udtaStartInMoov)
      val moovBodyAfterUdta = mp4.copyOfRange(moovAtom.start + udtaStartInMoov + udtaOriginalSize, moovAtom.end)

      val newMoovPayloadLength = moovBodyBeforeUdta.size + newUdtaBytes.size + moovBodyAfterUdta.size
      val newMoovSize = moovAtom.headerSize + newMoovPayloadLength
      val newMoov = ByteArray(newMoovSize)

      if (moovAtom.headerSize == 8) {
        writeU32(newMoov, 0, newMoovSize.toLong())
        System.arraycopy(moovHeader, 4, newMoov, 4, 4)
      } else {
        writeU32(newMoov, 0, 1L)
        System.arraycopy(moovHeader, 4, newMoov, 4, 4)
        writeU64(newMoov, 8, newMoovSize.toLong())
      }

      var at = moovAtom.headerSize
      System.arraycopy(moovBodyBeforeUdta, 0, newMoov, at, moovBodyBeforeUdta.size)
      at += moovBodyBeforeUdta.size
      System.arraycopy(newUdtaBytes, 0, newMoov, at, newUdtaBytes.size)
      at += newUdtaBytes.size
      System.arraycopy(moovBodyAfterUdta, 0, newMoov, at, moovBodyAfterUdta.size)

      val delta = (newMoov.size - moovAtom.size).toLong()
      val mediaAfterMoov = topAtoms.any { it.start > moovAtom.start && (it.type == "mdat" || it.type == "moof") }
      if (mediaAfterMoov && delta != 0L) {
        adjustOffsets(newMoov, 0, newMoov.size, delta)
      }

      val beforeMoov = mp4.copyOfRange(0, moovAtom.start)
      val afterMoov = mp4.copyOfRange(moovAtom.end, mp4.size)
      if (delta != 0L) {
        adjustOffsets(afterMoov, 0, afterMoov.size, delta)
      }

      val out = ByteArray(beforeMoov.size + newMoov.size + afterMoov.size)
      System.arraycopy(beforeMoov, 0, out, 0, beforeMoov.size)
      System.arraycopy(newMoov, 0, out, beforeMoov.size, newMoov.size)
      System.arraycopy(afterMoov, 0, out, beforeMoov.size + newMoov.size, afterMoov.size)
      return out
    } catch (e: Exception) {
      return null
    }
  }

  fun tagFile(
    inputFile: File,
    outputFile: File,
    title: String? = null,
    artist: String? = null,
    album: String? = null,
    coverBytes: ByteArray? = null,
    coverMime: String = "image/jpeg"
  ): Boolean {
    return try {
      val inputBytes = inputFile.readBytes()
      val tagged = addTags(inputBytes, title, artist, album, coverBytes, coverMime) ?: return false
      outputFile.writeBytes(tagged)
      true
    } catch (e: Exception) {
      false
    }
  }
}
