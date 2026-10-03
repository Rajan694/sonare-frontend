package com.mobile.player

import android.content.Context
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

/**
 * Which output Android plays media through: a connected headset or Bluetooth device takes
 * over from the phone speaker, so the most specific connected output is the one in use.
 * Reports `{ type, name }` now ([current]) and on every change ([start]).
 */
class OutputDevices(context: Context, private val onChange: (WritableMap) -> Unit) {
  private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val main = Handler(Looper.getMainLooper())
  private var last: Pair<String, String>? = null

  private val callback =
    object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) = report()

      override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) = report()
    }

  fun start() = audio.registerAudioDeviceCallback(callback, main)

  fun stop() = audio.unregisterAudioDeviceCallback(callback)

  fun current(): WritableMap = toMap(pick())

  private fun report() {
    val now = pick()
    if (now == last) return
    last = now
    onChange(toMap(now))
  }

  private fun toMap(device: Pair<String, String>) =
    Arguments.createMap().apply {
      putString("type", device.first)
      putString("name", device.second)
    }

  /** (type, display name) of the output in use. */
  private fun pick(): Pair<String, String> {
    val outputs = audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    fun find(vararg types: Int) = outputs.firstOrNull { it.type in types }

    bluetoothTypes().let { types ->
      find(*types)?.let { return "bluetooth" to (it.productName?.toString()?.takeIf(String::isNotBlank) ?: "Bluetooth") }
    }
    find(AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET)?.let {
      return "wired" to "Wired headphones"
    }
    find(AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE)?.let {
      return "usb" to (it.productName?.toString()?.takeIf(String::isNotBlank) ?: "USB audio")
    }
    return "speaker" to "Phone speaker"
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
