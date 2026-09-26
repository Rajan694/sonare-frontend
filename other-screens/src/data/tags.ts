/**
 * Minimal audio tag reader for the desktop local library (contract §6.6).
 *
 * Reads only the bytes it needs through a ranged reader, so scanning a large folder does
 * not load whole files: ID3v2 (+ MPEG frame header for duration), MP4/M4A atoms, FLAC
 * STREAMINFO + Vorbis comments, and Ogg/Opus comment headers. Anything it cannot parse
 * falls back to the file name ("Artist - Title.mp3") and parent folder.
 */

export interface AudioTags {
  title?: string
  artist?: string
  album?: string
  year?: number
  genre?: string
  durationMs?: number
  codec?: string
  bitrateKbps?: number
}

/** Read `size` bytes at `pos`; may return fewer at end of file. */
export type RangeReader = (pos: number, size: number) => Promise<Uint8Array>

const latin1 = new TextDecoder('iso-8859-1')
const utf8 = new TextDecoder('utf-8')

// Download sites stamp their domain into tags ("Song ::www.RAAG.ME::", "Song(PagalWorld.com.se)").
const SITE_STAMP = /\s*(::+|[-|]\s*|[([])?\s*(www\.)?[a-z0-9-]+\.(com|me|in|net|org|se|co|info|pk|fm|io|live|site|xyz|app|cc|to|mobi|biz|tv|club|online|world|pro|ws)(\.[a-z]{2,3})*\s*(::+|[)\]])?/gi

export function clean(s: string | undefined): string | undefined {
  const v = s?.replace(/\0+$/g, '').replace(/\0/g, ' ').replace(SITE_STAMP, '').replace(/\s{2,}/g, ' ').trim()
  return v ? v : undefined
}

function ascii(b: Uint8Array, at: number, len: number): string {
  return String.fromCharCode(...b.subarray(at, at + len))
}

function u32(b: Uint8Array, at: number): number {
  return ((b[at] << 24) >>> 0) + (b[at + 1] << 16) + (b[at + 2] << 8) + b[at + 3]
}

function synchsafe(b: Uint8Array, at: number): number {
  return (b[at] << 21) | (b[at + 1] << 14) | (b[at + 2] << 7) | b[at + 3]
}

// ---------- ID3v2 / MP3 ----------

function decodeId3Text(data: Uint8Array): string | undefined {
  if (data.length === 0) return undefined
  const enc = data[0]
  const body = data.subarray(1)
  let text: string
  if (enc === 1) {
    // UTF-16 with a byte-order mark; TextDecoder('utf-16') would assume little-endian.
    const be = body[0] === 0xfe && body[1] === 0xff
    const bom = be || (body[0] === 0xff && body[1] === 0xfe)
    text = new TextDecoder(be ? 'utf-16be' : 'utf-16le').decode(bom ? body.subarray(2) : body)
  }
  else if (enc === 2) text = new TextDecoder('utf-16be').decode(body)
  else if (enc === 3) text = utf8.decode(body)
  else text = latin1.decode(body)
  // Multi-value frames separate values with NUL; keep the first.
  return clean(text.split('\0').filter(Boolean)[0])
}

const ID3_FIELDS: Record<string, keyof AudioTags> = {
  TIT2: 'title', TT2: 'title',
  TPE1: 'artist', TP1: 'artist',
  TALB: 'album', TAL: 'album',
  TYER: 'year', TYE: 'year', TDRC: 'year',
  TCON: 'genre', TCO: 'genre',
  TLEN: 'durationMs', TLE: 'durationMs',
}

async function readId3(read: RangeReader, fileSize: number): Promise<AudioTags> {
  const head = await read(0, 10)
  const tags: AudioTags = { codec: 'MP3' }
  let audioStart = 0
  if (ascii(head, 0, 3) === 'ID3') {
    const version = head[3]
    const tagSize = synchsafe(head, 6)
    audioStart = 10 + tagSize
    const body = await read(10, Math.min(tagSize, 512 * 1024))
    let p = 0
    if (head[5] & 0x40) p += version === 4 ? synchsafe(body, 0) : u32(body, 0) + 4
    const idLen = version === 2 ? 3 : 4
    const hdrLen = version === 2 ? 6 : 10
    while (p + hdrLen <= body.length) {
      const id = ascii(body, p, idLen)
      if (!/^[A-Z0-9]+$/.test(id)) break
      const size =
        version === 2 ? (body[p + 3] << 16) | (body[p + 4] << 8) | body[p + 5]
        : version === 4 ? synchsafe(body, p + 4)
        : u32(body, p + 4)
      if (size <= 0) break
      const field = ID3_FIELDS[id]
      if (field) {
        const value = decodeId3Text(body.subarray(p + hdrLen, p + hdrLen + size))
        if (value) {
          if (field === 'year') tags.year = parseInt(value, 10) || undefined
          else if (field === 'durationMs') tags.durationMs = parseInt(value, 10) || undefined
          else if (field === 'genre') tags.genre = value.replace(/^\(\d+\)/, '') || value
          else (tags as Record<string, unknown>)[field] = value
        }
      }
      p += hdrLen + size
    }
  }
  if (!tags.durationMs) Object.assign(tags, await mp3Duration(read, audioStart, fileSize))
  return tags
}

const MPEG1_L3_KBPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const MPEG2_L3_KBPS = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const SAMPLE_RATES = [[11025, 12000, 8000], [0, 0, 0], [22050, 24000, 16000], [44100, 48000, 32000]]

/** Duration from the Xing/Info frame count when present, else from the CBR bitrate. */
async function mp3Duration(read: RangeReader, start: number, fileSize: number): Promise<AudioTags> {
  const b = await read(start, 4096)
  for (let i = 0; i + 4 < b.length; i++) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) continue
    const versionBits = (b[i + 1] >> 3) & 3
    const layer = (b[i + 1] >> 1) & 3
    if (versionBits === 1 || layer !== 1) continue
    const rateIdx = (b[i + 2] >> 4) & 15
    const srIdx = (b[i + 2] >> 2) & 3
    if (rateIdx === 0 || rateIdx === 15 || srIdx === 3) continue
    const kbps = (versionBits === 3 ? MPEG1_L3_KBPS : MPEG2_L3_KBPS)[rateIdx]
    const sampleRate = SAMPLE_RATES[versionBits][srIdx]
    const samplesPerFrame = versionBits === 3 ? 1152 : 576
    const mono = ((b[i + 3] >> 6) & 3) === 3
    const sideInfo = versionBits === 3 ? (mono ? 17 : 32) : mono ? 9 : 17
    const x = i + 4 + sideInfo
    const tag = ascii(b, x, 4)
    if ((tag === 'Xing' || tag === 'Info') && b[x + 7] & 1) {
      const frames = u32(b, x + 8)
      const durationMs = Math.round((frames * samplesPerFrame * 1000) / sampleRate)
      return { durationMs, bitrateKbps: Math.round(((fileSize - start) * 8) / durationMs) }
    }
    return { durationMs: Math.round(((fileSize - start) * 8) / kbps), bitrateKbps: kbps }
  }
  return {}
}

// ---------- Vorbis comments (FLAC, Ogg Vorbis, Opus) ----------

const VORBIS_FIELDS: Record<string, keyof AudioTags> = {
  TITLE: 'title', ARTIST: 'artist', ALBUM: 'album', DATE: 'year', YEAR: 'year', GENRE: 'genre',
}

function parseVorbisComments(b: Uint8Array, at: number, tags: AudioTags) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  if (at + 4 > b.length) return
  let p = at + 4 + dv.getUint32(at, true)
  if (p + 4 > b.length) return
  const count = dv.getUint32(p, true)
  p += 4
  for (let i = 0; i < count && p + 4 <= b.length; i++) {
    const len = dv.getUint32(p, true)
    p += 4
    const entry = utf8.decode(b.subarray(p, p + len))
    p += len
    const eq = entry.indexOf('=')
    const field = VORBIS_FIELDS[entry.slice(0, eq).toUpperCase()]
    const value = clean(entry.slice(eq + 1))
    if (!field || !value || tags[field] !== undefined) continue
    if (field === 'year') tags.year = parseInt(value, 10) || undefined
    else (tags as Record<string, unknown>)[field] = value
  }
}

async function readFlac(read: RangeReader): Promise<AudioTags> {
  const tags: AudioTags = { codec: 'FLAC' }
  let pos = 4
  for (let guard = 0; guard < 64; guard++) {
    const h = await read(pos, 4)
    if (h.length < 4) break
    const last = (h[0] & 0x80) !== 0
    const type = h[0] & 0x7f
    const len = (h[1] << 16) | (h[2] << 8) | h[3]
    if (type === 0) {
      const s = await read(pos + 4, 18)
      const sampleRate = (s[10] << 12) | (s[11] << 4) | (s[12] >> 4)
      const totalSamples = (s[13] & 0x0f) * 2 ** 32 + u32(s, 14)
      if (sampleRate) tags.durationMs = Math.round((totalSamples / sampleRate) * 1000)
    } else if (type === 4) {
      parseVorbisComments(await read(pos + 4, len), 0, tags)
    }
    pos += 4 + len
    if (last) break
  }
  return tags
}

async function readOgg(read: RangeReader, fileSize: number): Promise<AudioTags> {
  const b = await read(0, 64 * 1024)
  const text = latin1.decode(b)
  const opus = text.indexOf('OpusTags')
  const vorbis = text.indexOf('\x03vorbis')
  const tags: AudioTags = { codec: opus >= 0 ? 'Opus' : 'Vorbis' }
  if (opus >= 0) parseVorbisComments(b, opus + 8, tags)
  else if (vorbis >= 0) parseVorbisComments(b, vorbis + 7, tags)

  // Duration: the granule position of the last page, over the sample rate (48 kHz for Opus).
  const tailSize = Math.min(fileSize, 64 * 1024)
  const tail = latin1.decode(await read(fileSize - tailSize, tailSize))
  const lastPage = tail.lastIndexOf('OggS')
  if (lastPage >= 0) {
    const t = await read(fileSize - tailSize + lastPage + 6, 8)
    const granule = new DataView(t.buffer, t.byteOffset, 8).getUint32(0, true) + new DataView(t.buffer, t.byteOffset, 8).getUint32(4, true) * 2 ** 32
    let rate = 48000
    if (opus < 0 && vorbis >= 0) {
      const idHeader = text.indexOf('\x01vorbis')
      if (idHeader >= 0) rate = new DataView(b.buffer, b.byteOffset).getUint32(idHeader + 12, true)
    }
    if (granule > 0 && rate > 0) tags.durationMs = Math.round((granule / rate) * 1000)
  }
  return tags
}

// ---------- MP4 / M4A ----------

const MP4_FIELDS: Record<string, keyof AudioTags> = {
  '\xa9nam': 'title', '\xa9ART': 'artist', 'aART': 'artist', '\xa9alb': 'album', '\xa9day': 'year', '\xa9gen': 'genre',
}

function walkAtoms(b: Uint8Array, start: number, end: number, fn: (type: string, body: number, end: number) => void) {
  let p = start
  while (p + 8 <= end) {
    let size = u32(b, p)
    const type = latin1.decode(b.subarray(p + 4, p + 8))
    if (size === 1 || size < 8) size = end - p
    fn(type, p + 8, Math.min(p + size, end))
    p += size
  }
}

async function readMp4(read: RangeReader, fileSize: number): Promise<AudioTags> {
  const tags: AudioTags = { codec: 'AAC' }
  // Find `moov` among the top-level atoms; it may sit after the media data.
  let pos = 0
  let moov: Uint8Array | null = null
  for (let guard = 0; guard < 64 && pos + 8 <= fileSize; guard++) {
    const h = await read(pos, 16)
    let size = u32(h, 0)
    const type = ascii(h, 4, 4)
    if (size === 1) size = u32(h, 8) * 2 ** 32 + u32(h, 12)
    else if (size === 0) size = fileSize - pos
    if (size < 8) break
    if (type === 'moov') {
      moov = await read(pos + 8, Math.min(size - 8, 8 * 1024 * 1024))
      break
    }
    pos += size
  }
  if (!moov) return tags

  const m = moov
  walkAtoms(m, 0, m.length, (type, body, end) => {
    if (type === 'mvhd') {
      const v = m[body]
      const timescale = v === 1 ? u32(m, body + 20) : u32(m, body + 12)
      const duration = v === 1 ? u32(m, body + 24) * 2 ** 32 + u32(m, body + 28) : u32(m, body + 16)
      if (timescale) tags.durationMs = Math.round((duration / timescale) * 1000)
    } else if (type === 'udta') {
      walkAtoms(m, body, end, (t2, b2, e2) => {
        if (t2 !== 'meta') return
        // `meta` is a full atom: skip version + flags.
        walkAtoms(m, b2 + 4, e2, (t3, b3, e3) => {
          if (t3 !== 'ilst') return
          walkAtoms(m, b3, e3, (item, b4, e4) => {
            const field = MP4_FIELDS[item]
            if (!field) return
            walkAtoms(m, b4, e4, (t5, b5, e5) => {
              if (t5 !== 'data') return
              const value = clean(utf8.decode(m.subarray(b5 + 8, e5)))
              if (!value) return
              if (field === 'year') tags.year = parseInt(value, 10) || undefined
              else if (!tags[field]) (tags as Record<string, unknown>)[field] = value
            })
          })
        })
      })
    }
  })
  return tags
}

// ---------- entry point ----------

export function tagsFromFileName(path: string): { title: string; artist?: string; album?: string } {
  const parts = path.split(/[\\/]/)
  const file = parts.pop() ?? path
  const base = file.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
  const parent = parts.pop()
  const dash = base.indexOf(' - ')
  if (dash > 0) return { artist: base.slice(0, dash).trim(), title: base.slice(dash + 3).trim(), album: parent }
  return { title: base, album: parent }
}

export async function readTags(path: string, fileSize: number, read: RangeReader): Promise<AudioTags> {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  try {
    const magic = await read(0, 12)
    const sig = ascii(magic, 0, 4)
    if (sig === 'fLaC') return await readFlac(read)
    if (sig === 'OggS') return await readOgg(read, fileSize)
    if (ascii(magic, 4, 4) === 'ftyp') return await readMp4(read, fileSize)
    if (sig.startsWith('ID3') || ext === 'mp3') return await readId3(read, fileSize)
    if (ext === 'wav') return { codec: 'WAV' }
    if (ext === 'webm') return { codec: 'Opus' }
  } catch {
    // Truncated or unusual file — fall through to file-name metadata.
  }
  return {}
}
