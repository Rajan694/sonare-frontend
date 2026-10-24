package com.mobile.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetStateTest {

  @Test
  fun `widget state defaults represent idle state`() {
    val state = WidgetState()
    assertNull(state.title)
    assertNull(state.artist)
    assertNull(state.artworkBitmap)
    assertFalse(state.isPlaying)
    assertFalse(state.liked)
    assertFalse(state.hasTrack)
  }

  @Test
  fun `widget state copy accurately updates fields`() {
    val initial = WidgetState(
      title = "Midnight City",
      artist = "M83",
      isPlaying = false,
      liked = false,
      hasTrack = true,
    )
    val playing = initial.copy(isPlaying = true)
    assertTrue(playing.isPlaying)
    assertFalse(playing.liked)
    assertEquals("Midnight City", playing.title)

    val liked = playing.copy(liked = true)
    assertTrue(liked.isPlaying)
    assertTrue(liked.liked)

    val stopped = liked.copy(isPlaying = false, hasTrack = false)
    assertFalse(stopped.isPlaying)
    assertFalse(stopped.hasTrack)
    assertTrue(stopped.liked)
  }

  @Test
  fun `calculateScaledDimensions keeps dimensions within maxDim`() {
    // Dimensions smaller than maxDim are unchanged
    val small = WidgetStorage.calculateScaledDimensions(150, 150, 300)
    assertEquals(150 to 150, small)

    // Square larger than maxDim scales to maxDim x maxDim
    val square = WidgetStorage.calculateScaledDimensions(600, 600, 300)
    assertEquals(300 to 300, square)

    // Landscape scales width to maxDim and scales height proportionally
    val landscape = WidgetStorage.calculateScaledDimensions(800, 400, 300)
    assertEquals(300 to 150, landscape)

    // Portrait scales height to maxDim and scales width proportionally
    val portrait = WidgetStorage.calculateScaledDimensions(400, 800, 300)
    assertEquals(150 to 300, portrait)

    // Extreme aspect ratio coerces to at least 1 pixel
    val thin = WidgetStorage.calculateScaledDimensions(3000, 2, 300)
    assertEquals(300 to 1, thin)
  }

  @Test
  fun `widget actions set contains all required intents`() {
    val actions = SonareWidgetUpdater.WIDGET_ACTIONS
    assertTrue(actions.contains(SonareWidgetUpdater.ACTION_PLAY_PAUSE))
    assertTrue(actions.contains(SonareWidgetUpdater.ACTION_NEXT))
    assertTrue(actions.contains(SonareWidgetUpdater.ACTION_PREVIOUS))
    assertTrue(actions.contains(SonareWidgetUpdater.ACTION_LIKE))
    assertEquals(4, actions.size)

    assertEquals("com.mobile.widget.PLAY_PAUSE", SonareWidgetUpdater.ACTION_PLAY_PAUSE)
    assertEquals("com.mobile.widget.NEXT", SonareWidgetUpdater.ACTION_NEXT)
    assertEquals("com.mobile.widget.PREVIOUS", SonareWidgetUpdater.ACTION_PREVIOUS)
    assertEquals("com.mobile.widget.LIKE", SonareWidgetUpdater.ACTION_LIKE)
  }
}
