package com.mobile.player

/**
 * Pure multi-click counter for headset button presses within a timeout window.
 *
 * Counts consecutive button presses. A press arriving within [windowMs] of the
 * previous press increments the count (capped at 3). If [windowMs] or more elapses
 * before the next press, the previous sequence is considered committed and the new
 * press starts a new sequence at count 1.
 */
class HeadsetButtonDetector(private val windowMs: Long = DEFAULT_WINDOW_MS) {

  private var count = 0
  private var lastPressTimeMs = 0L

  /**
   * Records a press event at [eventTimeMs].
   *
   * @param eventTimeMs timestamp of the press event (e.g. SystemClock.uptimeMillis()).
   * @return Current press count in the active window (1, 2, or 3).
   */
  fun recordPress(eventTimeMs: Long): Int {
    if (count == 0 || eventTimeMs - lastPressTimeMs >= windowMs) {
      count = 1
    } else {
      count = (count + 1).coerceAtMost(3)
    }
    lastPressTimeMs = eventTimeMs
    return count
  }

  /**
   * Resets and returns the accumulated press count (1..3), or 0 if no presses were recorded.
   */
  fun takeCount(): Int {
    val result = count
    reset()
    return result
  }

  /**
   * Resets the detector state without returning the count.
   */
  fun reset() {
    count = 0
    lastPressTimeMs = 0L
  }

  companion object {
    const val DEFAULT_WINDOW_MS = 400L
  }
}
