package com.mobile.player

import android.content.Context
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * Which output Android plays media through: a connected headset or Bluetooth device takes
 * over from the phone speaker, so the most specific connected output is the one in use —
 * unless the listener picked one in the app ([PlaybackEngine.preferredDeviceId]), which
 * wins while it stays connected.
 * Reports `{ id, type, name }` now ([current]) and on every change ([start]); [list] is
 * every output music can go to, for the app's picker.
 */
class OutputDevices(context: Context, private val onChange: (WritableMap) -> Unit) {
  private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val main = Handler(Looper.getMainLooper())
  private var last: Device? = null

  /** `id` is AudioDeviceInfo.getId(); -1 means "whatever Android picks". */
  data class Device(val id: Int, val type: String, val name: String)

  private val callback =
    object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) = report()

      override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) = report()
    }

  fun start() = audio.registerAudioDeviceCallback(callback, main)

  fun stop() = audio.unregisterAudioDeviceCallback(callback)

  fun current(): WritableMap = toMap(pick())

  /** Every output media can be sent to, phone speaker first. */
  fun list(): WritableArray =
    Arguments.createArray().apply {
      available().forEach { pushMap(toMap(it)) }
    }

  /** The connected device with this id, for ExoPlayer's preferred device; null if it's gone. */
  fun info(id: Int): AudioDeviceInfo? = audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS).firstOrNull { it.id == id }

  /** Call after the preferred device changed, so listeners hear about it. */
  fun refresh() = report()

  private fun report() {
    val now = pick()
    if (now == last) return
    last = now
    onChange(toMap(now))
  }

  private fun toMap(device: Device) =
    Arguments.createMap().apply {
      putInt("id", device.id)
      putString("type", device.type)
      putString("name", device.name)
    }

  private fun describe(info: AudioDeviceInfo): Device? {
    val product = info.productName?.toString()?.takeIf(String::isNotBlank)
    return when (info.type) {
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> Device(info.id, "speaker", "Phone speaker")
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> Device(info.id, "wired", "Wired headphones")
      AudioDeviceInfo.TYPE_USB_HEADSET,
      AudioDeviceInfo.TYPE_USB_DEVICE -> Device(info.id, "usb", product ?: "USB audio")
      else -> if (info.type in bluetoothTypes()) Device(info.id, "bluetooth", product ?: "Bluetooth") else null
    }
  }

  private fun available(): List<Device> {
    val order = listOf("speaker", "wired", "usb", "bluetooth")
    return audio
      .getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      .mapNotNull(::describe)
      // One row per device: a headset can show up as several outputs.
      .distinctBy { it.type to it.name }
      .sortedBy { order.indexOf(it.type) }
  }

  /** The output in use: the app's pick while connected, else the most specific connected one. */
  private fun pick(): Device {
    val outputs = available()
    PlaybackEngine.preferredDeviceId.takeIf { it >= 0 }?.let { id ->
      outputs.firstOrNull { it.id == id }?.let { return it }
    }
    fun find(type: String) = outputs.firstOrNull { it.type == type }
    return find("bluetooth") ?: find("wired") ?: find("usb") ?: find("speaker") ?: Device(-1, "speaker", "Phone speaker")
  }

  private fun bluetoothTypes(): IntArray {
    val types = mutableListOf(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      types += AudioDeviceInfo.TYPE_BLE_HEADSET
      types += AudioDeviceInfo.TYPE_BLE_SPEAKER
    }
    return types.toIntArray()
  }
}
