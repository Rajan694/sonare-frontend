package com.mobile.player

import com.facebook.react.bridge.ReadableMap

/**
 * Headset actions configured from JS:
 *  - playPause: handled natively through the engine so fades apply
 *  - next: RemoteCommands.send("next")
 *  - previous: RemoteCommands.send("previous")
 *  - like: RemoteCommands.send("like")
 *  - none: do nothing
 */
enum class HeadsetAction(val raw: String) {
  PLAY_PAUSE("playPause"),
  NEXT("next"),
  PREVIOUS("previous"),
  LIKE("like"),
  NONE("none");

  companion object {
    /** Null for a value JS shouldn't send; the caller keeps that press's default. */
    fun fromString(value: String?): HeadsetAction? = entries.firstOrNull { it.raw.equals(value, ignoreCase = true) }
  }
}

/** Configured actions for 1, 2, and 3 headset button clicks. */
data class HeadsetActions(
  val single: HeadsetAction = HeadsetAction.PLAY_PAUSE,
  val double: HeadsetAction = HeadsetAction.NEXT,
  val triple: HeadsetAction = HeadsetAction.PREVIOUS,
) {
  fun actionForCount(count: Int): HeadsetAction =
    when (count) {
      1 -> single
      2 -> double
      3 -> triple
      else -> if (count > 3) triple else HeadsetAction.NONE
    }

  companion object {
    val DEFAULT = HeadsetActions()

    fun fromReadableMap(map: ReadableMap?): HeadsetActions {
      if (map == null) return DEFAULT
      fun read(key: String, fallback: HeadsetAction) =
        if (map.hasKey(key)) HeadsetAction.fromString(map.getString(key)) ?: fallback else fallback
      val single = read("single", DEFAULT.single)
      val double = read("double", DEFAULT.double)
      val triple = read("triple", DEFAULT.triple)
      return HeadsetActions(single, double, triple)
    }
  }
}
