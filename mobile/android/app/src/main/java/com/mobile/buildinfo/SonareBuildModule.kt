package com.mobile.buildinfo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.mobile.BuildConfig

/**
 * How this APK was built, for JS (src/native/SonareBuild.ts): its version (versionName), and
 * `dev`, a release APK made by `./buildFE.sh dev android` that allows plain http, so it can talk
 * to a computer on the LAN.
 */
class SonareBuildModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  override fun getConstants(): Map<String, Any> =
    mapOf("dev" to BuildConfig.SONARE_DEV, "version" to BuildConfig.VERSION_NAME)

  companion object {
    const val NAME = "SonareBuild"
  }
}
