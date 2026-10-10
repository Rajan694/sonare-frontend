package com.mobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.common.assets.ReactFontManager
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.mobile.buildinfo.SonareBuildPackage
import com.mobile.downloads.SonareDownloadsPackage
import com.mobile.player.SonarePlayerPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(SonarePlayerPackage())
          add(SonareDownloadsPackage())
          add(SonareBuildPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // XML font families, so fontWeight 500 / 600 pick the real Medium / SemiBold files.
    ReactFontManager.getInstance().addCustomFont(this, "Geist", R.font.geist)
    ReactFontManager.getInstance().addCustomFont(this, "JetBrains Mono", R.font.jetbrains_mono)
    loadReactNative(this)
  }
}
