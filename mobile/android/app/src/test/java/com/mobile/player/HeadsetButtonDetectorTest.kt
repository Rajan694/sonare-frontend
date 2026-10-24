package com.mobile.player

import org.junit.Assert.assertEquals
import org.junit.Test

class HeadsetButtonDetectorTest {

  @Test
  fun `single press recorded and returned`() {
    val detector = HeadsetButtonDetector(400L)
    val count = detector.recordPress(1000L)
    assertEquals(1, count)
    assertEquals(1, detector.takeCount())
    // After taking, count is reset
    assertEquals(0, detector.takeCount())
  }

  @Test
  fun `double press within window counts to 2`() {
    val detector = HeadsetButtonDetector(400L)
    assertEquals(1, detector.recordPress(1000L))
    assertEquals(2, detector.recordPress(1200L)) // 200ms < 400ms
    assertEquals(2, detector.takeCount())
  }

  @Test
  fun `triple press within window counts to 3`() {
    val detector = HeadsetButtonDetector(400L)
    assertEquals(1, detector.recordPress(1000L))
    assertEquals(2, detector.recordPress(1150L))
    assertEquals(3, detector.recordPress(1300L))
    assertEquals(3, detector.takeCount())
  }

  @Test
  fun `more than 3 presses caps at 3`() {
    val detector = HeadsetButtonDetector(400L)
    assertEquals(1, detector.recordPress(1000L))
    assertEquals(2, detector.recordPress(1100L))
    assertEquals(3, detector.recordPress(1200L))
    assertEquals(3, detector.recordPress(1300L)) // 4th press
    assertEquals(3, detector.recordPress(1400L)) // 5th press
    assertEquals(3, detector.takeCount())
  }

  @Test
  fun `press outside window resets count to 1`() {
    val detector = HeadsetButtonDetector(400L)
    assertEquals(1, detector.recordPress(1000L))
    assertEquals(2, detector.recordPress(1200L))
    // 500ms later (> 400ms window)
    assertEquals(1, detector.recordPress(1700L))
    assertEquals(1, detector.takeCount())
  }

  @Test
  fun `reset clears accumulated state`() {
    val detector = HeadsetButtonDetector(400L)
    detector.recordPress(1000L)
    detector.recordPress(1100L)
    detector.reset()
    assertEquals(0, detector.takeCount())
  }

  @Test
  fun `action for count maps correctly`() {
    val actions = HeadsetActions(
      single = HeadsetAction.PLAY_PAUSE,
      double = HeadsetAction.NEXT,
      triple = HeadsetAction.PREVIOUS,
    )
    assertEquals(HeadsetAction.PLAY_PAUSE, actions.actionForCount(1))
    assertEquals(HeadsetAction.NEXT, actions.actionForCount(2))
    assertEquals(HeadsetAction.PREVIOUS, actions.actionForCount(3))
    assertEquals(HeadsetAction.PREVIOUS, actions.actionForCount(4))
    assertEquals(HeadsetAction.NONE, actions.actionForCount(0))
  }

  @Test
  fun `custom headset actions mapping`() {
    val custom = HeadsetActions(
      single = HeadsetAction.NONE,
      double = HeadsetAction.LIKE,
      triple = HeadsetAction.PLAY_PAUSE,
    )
    assertEquals(HeadsetAction.NONE, custom.actionForCount(1))
    assertEquals(HeadsetAction.LIKE, custom.actionForCount(2))
    assertEquals(HeadsetAction.PLAY_PAUSE, custom.actionForCount(3))
  }

  @Test
  fun `fromString parses valid values and gives null for anything else`() {
    assertEquals(HeadsetAction.PLAY_PAUSE, HeadsetAction.fromString("playPause"))
    assertEquals(HeadsetAction.NEXT, HeadsetAction.fromString("next"))
    assertEquals(HeadsetAction.PREVIOUS, HeadsetAction.fromString("previous"))
    assertEquals(HeadsetAction.LIKE, HeadsetAction.fromString("like"))
    assertEquals(HeadsetAction.NONE, HeadsetAction.fromString("none"))
    assertEquals(null, HeadsetAction.fromString("unknown_val"))
    assertEquals(null, HeadsetAction.fromString(null))
  }
}
