package com.mobile.buildinfo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.mobile.BuildConfig

/**
 * How this APK was built, for JS (src/native/SonareBuild.ts). `dev` is a release APK made by
 * `./buildFE.sh dev android`: it allows plain http, so it can talk to a computer on the LAN.
 */
class SonareBuildModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  override fun getConstants(): Map<String, Any> = mapOf("dev" to BuildConfig.SONARE_DEV)

  companion object {
    const val NAME = "SonareBuild"
  }
}
