package com.mobile.player.dsp

/**
 * The current effect settings, shared by every player's [SonareAudioProcessor]. JS sets them
 * (SonarePlayerModule.setAudioEffects); the audio threads read them once per buffer.
 */
object AudioEffects {
  @Volatile
  var settings: DspSettings = DspSettings()
    private set

  @Volatile
  var spatialParams: SpatialStageParams = SpatialStageParams()
    private set

  /** Bumped on every change so processors know to recompute their filters. */
  @Volatile
  var version: Long = 0
    private set

  @Synchronized
  fun update(next: DspSettings) {
    settings = next
    version++
  }

  @Synchronized
  fun updateSpatial(next: SpatialStageParams) {
    spatialParams = next
    version++
  }
}
