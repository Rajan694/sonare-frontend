package com.mobile.downloads

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.SystemClock
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Future

/**
 * Resumable audio downloads for the JS download manager (src/store/downloads.ts).
 *
 * A download is fetched in CHUNK-sized Range requests into a part file in the app's own
 * storage, so pausing (or the process dying) keeps what arrived and the next start()
 * carries on from the part file's length. When it's complete the part is moved into place:
 *  - into the folder the user picked (a Storage Access Framework tree), or
 *  - Music/Sonare through MediaStore (Android 10+; no storage permission needed), or
 *  - the app's external Music/Sonare folder on older Android.
 *
 * JS owns the policy: which url to use (it refreshes expired ones), retries, the queue.
 * Emits:
 *  - `SonareDownloads.progress` { id, receivedBytes, totalBytes }
 *  - `SonareDownloads.done`     { id, uri, name, size }
 *  - `SonareDownloads.error`    { id, code, message, status, receivedBytes }
 *      code: E_URL (the url is dead - get a fresh one), E_NETWORK, E_HTTP, E_SAVE
 */
class SonareDownloadsModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), ActivityEventListener {

  private class Task(val id: String) {
    @Volatile var cancelled = false
    @Volatile var connection: HttpURLConnection? = null
    var future: Future<*>? = null
  }

  private val downloads: ExecutorService = Executors.newFixedThreadPool(MAX_PARALLEL)
  /** Deletes, copies and waits, so they never queue behind a running download. */
  private val io: ExecutorService = Executors.newSingleThreadExecutor()
  private val tasks = ConcurrentHashMap<String, Task>()
  private var pickPromise: Promise? = null

  init {
    context.addActivityEventListener(this)
  }

  override fun getName() = NAME

  private fun partFile(id: String): File {
    val dir = File(context.filesDir, "downloads").apply { mkdirs() }
    return File(dir, id.replace(Regex("[^A-Za-z0-9_-]"), "_") + ".part")
  }

  @ReactMethod
  fun partSize(id: String, promise: Promise) {
    promise.resolve(partFile(id).length().toDouble())
  }

  /**
   * Start, or resume from the part file. Options: id, url, baseName (file name without
   * extension), extension (fallback when Android doesn't know the mime type), mimeType,
   * totalBytes (0 = unknown), title / artist / album (MediaStore metadata), treeUri (the
   * picked folder; absent = Music/Sonare).
   */
  @ReactMethod
  fun start(options: ReadableMap, promise: Promise) {
    val id = options.getString("id")
    val url = options.getString("url")
    if (id.isNullOrEmpty() || url.isNullOrEmpty()) {
      promise.reject("E_ARGS", "start() needs an id and a url")
      return
    }
    if (tasks.containsKey(id)) {
      promise.resolve(null)
      return
    }
    val target =
      Target(
        baseName = options.getString("baseName") ?: id,
        extension = options.getString("extension") ?: "webm",
        mimeType = options.getString("mimeType") ?: "audio/webm",
        title = options.optString("title"),
        artist = options.optString("artist"),
        album = options.optString("album"),
        treeUri = options.optString("treeUri"),
      )
    val knownTotal = if (options.hasKey("totalBytes")) options.getDouble("totalBytes").toLong() else 0L
    val task = Task(id)
    tasks[id] = task
    task.future = downloads.submit { run(task, url, knownTotal, target) }
    promise.resolve(null)
  }

  /** Stop a download, keeping its part file. Resolves with the bytes kept. */
  @ReactMethod
  fun pause(id: String, promise: Promise) {
    val part = partFile(id)
    val task = tasks[id]
    if (task == null) {
      promise.resolve(part.length().toDouble())
      return
    }
    cancel(task)
    io.execute {
      runCatching { task.future?.get() }
      promise.resolve(part.length().toDouble())
    }
  }

  /** Stop a download and delete its part file. */
  @ReactMethod
  fun discard(id: String, promise: Promise) {
    val task = tasks[id]
    task?.let(::cancel)
    io.execute {
      runCatching { task?.future?.get() }
      partFile(id).delete()
      promise.resolve(null)
    }
  }

  private fun cancel(task: Task) {
    task.cancelled = true
    // Unblocks a read in progress; the download thread then sees `cancelled`.
    runCatching { task.connection?.disconnect() }
  }

  private data class Target(
    val baseName: String,
    val extension: String,
    val mimeType: String,
    val title: String?,
    val artist: String?,
    val album: String?,
    val treeUri: String?,
  )

  private fun run(task: Task, url: String, knownTotal: Long, target: Target) {
    val part = partFile(task.id)
    var received = part.length()
    var total = knownTotal
    var lastEmit = 0L
    // Sent after the task leaves `tasks`, so JS can start() it again straight from the event.
    var outcome: (() -> Unit)? = null
    try {
      while (!task.cancelled && (total <= 0 || received < total)) {
        val conn = URL(url).openConnection() as HttpURLConnection
        task.connection = conn
        conn.connectTimeout = 15_000
        conn.readTimeout = 30_000
        conn.setRequestProperty("Range", "bytes=$received-${received + CHUNK - 1}")
        conn.setRequestProperty("X-Sonare-Client", "mobile")
        try {
          val code = conn.responseCode
          if (code == 416) {
            // Asked past the end: the part already holds the whole file.
            sizeFromContentRange(conn)?.let { total = it }
            if (received > 0 && (total <= 0 || received >= total)) {
              total = received
              break
            }
          }
          if (code == 403 || code == 404 || code == 410 || code == 502) {
            val kept = received
            outcome = { emitError(task.id, "E_URL", "The stream url stopped working", code, kept) }
            return
          }
          if (code != 200 && code != 206) {
            val kept = received
            outcome = { emitError(task.id, "E_HTTP", "Download failed ($code)", code, kept) }
            return
          }
          if (code == 200 && received > 0) {
            // The server ignored Range and is sending the whole file: take it from the top.
            part.delete()
            received = 0
          }
          val sized = sizeFromContentRange(conn)
          if (sized != null) total = sized
          else if (code == 200 && conn.contentLengthLong > 0) total = conn.contentLengthLong

          val startedAt = received
          conn.inputStream.use { input ->
            FileOutputStream(part, true).use { out ->
              val buf = ByteArray(64 * 1024)
              while (!task.cancelled) {
                val n = input.read(buf)
                if (n < 0) break
                out.write(buf, 0, n)
                received += n
                val now = SystemClock.elapsedRealtime()
                if (now - lastEmit >= PROGRESS_INTERVAL_MS) {
                  lastEmit = now
                  emitProgress(task.id, received, total)
                }
              }
            }
          }
          if (code == 200) break
          // No Content-Range to read the size from: a short chunk means that was the end.
          if (total <= 0 && received - startedAt < CHUNK) total = received
        } finally {
          conn.disconnect()
        }
      }
      if (task.cancelled) return
      emitProgress(task.id, received, total)
      val saved = moveIntoPlace(part, target)
      outcome = {
        emit(
          EVENT_DONE,
          Arguments.createMap().apply {
            putString("id", task.id)
            putString("uri", saved.uri)
            putString("name", saved.name)
            putDouble("size", saved.size.toDouble())
          },
        )
      }
    } catch (e: IOException) {
      val kept = part.length()
      if (!task.cancelled) outcome = { emitError(task.id, "E_NETWORK", e.message ?: "Network error", 0, kept) }
    } catch (e: Exception) {
      val kept = part.length()
      if (!task.cancelled) outcome = { emitError(task.id, "E_SAVE", e.message ?: "Could not save the file", 0, kept) }
    } finally {
      tasks.remove(task.id, task)
      outcome?.invoke()
    }
  }

  private fun sizeFromContentRange(conn: HttpURLConnection): Long? =
    conn.getHeaderField("Content-Range")?.let { Regex("/(\\d+)\\s*$").find(it)?.groupValues?.get(1)?.toLongOrNull() }

  private data class Saved(val uri: String, val name: String, val size: Long)

  private fun moveIntoPlace(part: File, target: Target): Saved {
    // Use Android's extension for the mime type, or MediaStore / SAF would append their own.
    val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(target.mimeType) ?: target.extension
    val displayName = "${target.baseName}.$ext"
    val size = part.length()
    val resolver = context.contentResolver

    if (!target.treeUri.isNullOrEmpty()) {
      val tree = Uri.parse(target.treeUri)
      val parent = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
      // The provider picks a free name ("Song (1).webm") when this one is taken.
      val doc =
        DocumentsContract.createDocument(resolver, parent, target.mimeType, displayName)
          ?: throw IOException("Could not create the file in the chosen folder")
      try {
        copy(part, doc)
      } catch (e: Exception) {
        runCatching { DocumentsContract.deleteDocument(resolver, doc) }
        throw e
      }
      part.delete()
      return Saved(doc.toString(), displayNameOf(doc) ?: displayName, size)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val values =
        ContentValues().apply {
          put(MediaStore.Audio.Media.DISPLAY_NAME, displayName)
          put(MediaStore.Audio.Media.MIME_TYPE, target.mimeType)
          put(MediaStore.Audio.Media.RELATIVE_PATH, DEFAULT_RELATIVE_PATH)
          target.title?.let { put(MediaStore.Audio.Media.TITLE, it) }
          target.artist?.let { put(MediaStore.Audio.Media.ARTIST, it) }
          target.album?.let { put(MediaStore.Audio.Media.ALBUM, it) }
          put(MediaStore.Audio.Media.IS_PENDING, 1)
        }
      val collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      val uri = resolver.insert(collection, values) ?: throw IOException("Could not add the file to $DEFAULT_RELATIVE_PATH")
      try {
        copy(part, uri)
        resolver.update(uri, ContentValues().apply { put(MediaStore.Audio.Media.IS_PENDING, 0) }, null, null)
      } catch (e: Exception) {
        runCatching { resolver.delete(uri, null, null) }
        throw e
      }
      part.delete()
      return Saved(uri.toString(), displayNameOf(uri) ?: displayName, size)
    }

    val dir = File(context.getExternalFilesDir(Environment.DIRECTORY_MUSIC), "Sonare").apply { mkdirs() }
    var file = File(dir, displayName)
    var n = 2
    while (file.exists()) file = File(dir, "${target.baseName} (${n++}).$ext")
    if (!part.renameTo(file)) {
      copy(part, Uri.fromFile(file))
      part.delete()
    }
    return Saved(Uri.fromFile(file).toString(), file.name, file.length())
  }

  private fun copy(from: File, to: Uri) {
    val out = context.contentResolver.openOutputStream(to, "w") ?: throw IOException("Could not open $to for writing")
    out.use { o -> FileInputStream(from).use { it.copyTo(o) } }
  }

  private fun displayNameOf(uri: Uri): String? =
    runCatching {
        context.contentResolver.query(uri, arrayOf(MediaStore.MediaColumns.DISPLAY_NAME), null, null, null)?.use {
          if (it.moveToFirst()) it.getString(0) else null
        }
      }
      .getOrNull()

  /**
   * Delete a finished download. Rejects with E_MISSING when the file isn't where it was
   * saved any more (moved, renamed or deleted outside the app), and E_DELETE when it's there
   * but can't be deleted (e.g. the app was reinstalled and no longer owns it).
   */
  @ReactMethod
  fun deleteFile(uriString: String, expectedName: String?, promise: Promise) {
    io.execute {
      try {
        val uri = Uri.parse(uriString)
        if (uri.scheme == "file") {
          val file = File(uri.path ?: "")
          when {
            !file.exists() -> promise.reject("E_MISSING", "The file is no longer where it was downloaded")
            file.delete() -> promise.resolve(true)
            else -> promise.reject("E_DELETE", "Couldn't delete the file")
          }
          return@execute
        }
        if (!isInPlace(uri, expectedName)) {
          promise.reject("E_MISSING", "The file is no longer where it was downloaded")
          return@execute
        }
        val deleted =
          if (DocumentsContract.isDocumentUri(context, uri)) DocumentsContract.deleteDocument(context.contentResolver, uri)
          else context.contentResolver.delete(uri, null, null) > 0
        if (deleted) promise.resolve(true) else promise.reject("E_MISSING", "The file is no longer where it was downloaded")
      } catch (e: SecurityException) {
        promise.reject("E_DELETE", "Sonare isn't allowed to delete this file any more")
      } catch (e: Exception) {
        promise.reject("E_DELETE", e.message ?: "Couldn't delete the file")
      }
    }
  }

  /** Whether a finished download is still there under the name it was saved as. */
  @ReactMethod
  fun exists(uriString: String, expectedName: String?, promise: Promise) {
    io.execute {
      val uri = Uri.parse(uriString)
      promise.resolve(if (uri.scheme == "file") File(uri.path ?: "").exists() else runCatching { isInPlace(uri, expectedName) }.getOrDefault(false))
    }
  }

  private fun isInPlace(uri: Uri, expectedName: String?): Boolean {
    val mediaStore = !DocumentsContract.isDocumentUri(context, uri)
    val columns =
      if (mediaStore && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        arrayOf(MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.MediaColumns.RELATIVE_PATH)
      else arrayOf(MediaStore.MediaColumns.DISPLAY_NAME)
    return context.contentResolver.query(uri, columns, null, null, null)?.use { c ->
      if (!c.moveToFirst()) return@use false
      if (!expectedName.isNullOrEmpty() && c.getString(0) != expectedName) return@use false
      // A MediaStore row follows a file moved with a file manager; that's "moved", not ours to delete.
      if (columns.size > 1 && c.getString(1)?.trimEnd('/') != DEFAULT_RELATIVE_PATH) return@use false
      true
    } ?: false
  }

  /** Let the user pick a download folder. Resolves { uri, name }, or null if cancelled. */
  @ReactMethod
  fun pickFolder(promise: Promise) {
    val activity = context.currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "The app isn't in the foreground")
      return
    }
    pickPromise?.resolve(null)
    pickPromise = promise
    val intent =
      Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(
        Intent.FLAG_GRANT_READ_URI_PERMISSION or
          Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
          Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
          Intent.FLAG_GRANT_PREFIX_URI_PERMISSION,
      )
    try {
      activity.startActivityForResult(intent, REQUEST_PICK_FOLDER)
    } catch (e: Exception) {
      pickPromise = null
      promise.reject("E_NO_PICKER", "No app on this phone can pick a folder")
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_PICK_FOLDER) return
    val promise = pickPromise ?: return
    pickPromise = null
    val uri = data?.data
    if (resultCode != Activity.RESULT_OK || uri == null) {
      promise.resolve(null)
      return
    }
    try {
      // Kept, not released on change: files already saved there still need it for Delete.
      context.contentResolver.takePersistableUriPermission(
        uri,
        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
      )
      promise.resolve(Arguments.createMap().apply {
        putString("uri", uri.toString())
        putString("name", folderName(uri))
      })
    } catch (e: Exception) {
      promise.reject("E_PERMISSION", "Couldn't get access to that folder: ${e.message}")
    }
  }

  override fun onNewIntent(intent: Intent) {}

  private fun folderName(tree: Uri): String {
    val doc = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
    return displayNameOf(doc) ?: DocumentsContract.getTreeDocumentId(tree).substringAfterLast(':').ifEmpty { "Folder" }
  }

  /** Where downloads go when no folder was picked, for Settings to show. */
  @ReactMethod
  fun defaultLocation(promise: Promise) {
    promise.resolve(
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) DEFAULT_RELATIVE_PATH
      else File(context.getExternalFilesDir(Environment.DIRECTORY_MUSIC), "Sonare").absolutePath,
    )
  }

  private fun emitProgress(id: String, received: Long, total: Long) {
    emit(
      EVENT_PROGRESS,
      Arguments.createMap().apply {
        putString("id", id)
        putDouble("receivedBytes", received.toDouble())
        putDouble("totalBytes", total.toDouble())
      },
    )
  }

  private fun emitError(id: String, code: String, message: String, status: Int, received: Long) {
    emit(
      EVENT_ERROR,
      Arguments.createMap().apply {
        putString("id", id)
        putString("code", code)
        putString("message", message)
        putInt("status", status)
        putDouble("receivedBytes", received.toDouble())
      },
    )
  }

  private fun emit(event: String, payload: WritableMap) {
    if (context.hasActiveReactInstance()) context.emitDeviceEvent(event, payload)
  }

  private fun ReadableMap.optString(key: String): String? = if (hasKey(key) && !isNull(key)) getString(key) else null

  // Required by NativeEventEmitter.
  @ReactMethod fun addListener(eventName: String) {}

  @ReactMethod fun removeListeners(count: Double) {}

  override fun invalidate() {
    tasks.values.forEach(::cancel)
    downloads.shutdown()
    io.shutdown()
    context.removeActivityEventListener(this)
    super.invalidate()
  }

  companion object {
    const val NAME = "SonareDownloads"
    private const val MAX_PARALLEL = 2
    /** Per Range request: small enough that YouTube never throttles it. */
    private const val CHUNK = 2L * 1024 * 1024
    private const val PROGRESS_INTERVAL_MS = 400L
    private const val REQUEST_PICK_FOLDER = 0x5d1
    private val DEFAULT_RELATIVE_PATH = "${Environment.DIRECTORY_MUSIC}/Sonare"
    private const val EVENT_PROGRESS = "SonareDownloads.progress"
    private const val EVENT_DONE = "SonareDownloads.done"
    private const val EVENT_ERROR = "SonareDownloads.error"
  }
}
