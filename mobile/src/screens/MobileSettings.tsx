import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileSettings() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">15 · Settings</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Settings with connection mode as a first-class section and per-mode behaviour toggles.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Pressable className="ib none" href="M02-Home-Offline.html" aria-label="Back"><Image source={require('../../assets/icon_d5a96b1c.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Settings</Text></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="padding:0 20px;gap:18px">
      <View className="surf row g14" style="padding:14px">
        <View className="art a5 art-circ" style="width:52px;height:52px;"></View>
        <Text className="col grow" style="gap:3px">
          <Text className="t-tl c1">Rajan Kumar</Text>
          <Text className="t-bs c2">Sonare account · signed in</Text>
        </Text>
        <Text className="row g6 none" style="height:26px;padding:0 9px;border-radius:999px;background:var(--goldbg);color:var(--gold)"><i className="dot dot-gold"></i><Text className="t-ls">OFFLINE</Text></Text>
      </View>

      <View className="surf col" style="padding:14px;gap:12px">
        <View className="row between">
          <Text className="col" style="gap:2px"><Text className="t-tm c1">Connection mode</Text>
          <Text className="t-bs c3">Controls what the whole app shows</Text></Text>
        </View>
        <Text className="seg seg-lg">
      <Pressable className="seg-i " href="M01-Home-Online.html" aria-current="false"><Image source={require('../../assets/icon_dbb4a7b2.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev" href="M02-Home-Offline.html" aria-current="true"><Image source={require('../../assets/icon_eca8a722.svg')} className="ic" />Offline</Pressable>
    </Text>
        <View className="offstrip"><Text className="dot dot-gold"></Text>
          <Text className="t-bs c2 grow">Offline since 18:42 · nothing has been fetched from the server</Text></View>
      </View>

      <View className="col" style="gap:8px">
        <Text className="t-ov c3" style="padding-left:4px">Playback</Text>
        <View className="surf col" style="padding:2px 0">
          <View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_29c900bf.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Audio quality</Text>
            <Text className="t-bs c3">Streaming: High · Download: FLAC</Text></Text>
            <Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_b21ff97c.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Equalizer &amp; effects</Text>
            <Text className="t-bs c3">Sonare preset · Bass +42%</Text></Text>
            <Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_9d49bcc0.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Audio output</Text>
            <Text className="t-bs c3">Wired headphones</Text></Text>
            <Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_5b186aaf.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Sleep timer</Text>
            <Text className="t-bs c3">Off</Text></Text>
            <Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></View>
        </View>
      </View><View className="col" style="gap:8px">
        <Text className="t-ov c3" style="padding-left:4px">Library</Text>
        <View className="surf col" style="padding:2px 0">
          <View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_e5d6d392.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Music folders</Text>
            <Text className="t-bs c3">5 folders · 2,184 songs</Text></Text>
            <Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_2e80cde5.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Scan on startup</Text>
            </Text>
            <Pressable className="sw on none" aria-label="Toggle"><i></i></Pressable></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_f6501bd1.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Ignore tracks under 30s</Text>
            </Text>
            <Pressable className="sw on none" aria-label="Toggle"><i></i></Pressable></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_4fd3c178.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Sync playlists with account</Text>
            <Text className="t-bs c3">Paused while offline</Text></Text>
            <Pressable className="sw  none" aria-label="Toggle"><i></i></Pressable></View>
        </View>
      </View><View className="col" style="gap:8px">
        <Text className="t-ov c3" style="padding-left:4px">Data</Text>
        <View className="surf col" style="padding:2px 0">
          <View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_f2c93cf1.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Download over Wi-Fi only</Text>
            </Text>
            <Pressable className="sw on none" aria-label="Toggle"><i></i></Pressable></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_80ff517a.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Stream quality on mobile data</Text>
            <Text className="t-bs c3">Normal · 128 kbps</Text></Text>
            <Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_6f8670ee.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Clear cache</Text>
            <Text className="t-bs c3">1.2 GB</Text></Text>
            <Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></View>
        </View>
      </View>
    </View></View>
  <View className="mini none mini-gold">
    <Pressable className="row g12 grow" href="M10-Now-Playing-Offline.html" style="text-decoration:none;color:inherit;min-width:0">
      <View className="art a1 art-r-sm art-rings" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
    </Pressable>
    <Pressable className="ib ib-32 none" aria-label="Favourite"><Image source={require('../../assets/icon_072f797d.svg')} className="ic" /></Pressable>
    <Pressable className="ib none" aria-label="Pause"><Image source={require('../../assets/icon_9ccbd552.svg')} className="ic" /></Pressable>
    <Pressable className="ib ib-32 none" aria-label="Next track"><Image source={require('../../assets/icon_feb38b39.svg')} className="ic" /></Pressable>
  </View>
  <View className="mnav none"><Pressable href="M02-Home-Offline.html" className="on"><Image source={require('../../assets/icon_27111392.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className=""><Image source={require('../../assets/icon_910e2fb2.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className=""><Image source={require('../../assets/icon_1d92030b.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M04-Search-Offline.html" className=""><Image source={require('../../assets/icon_88a5aa5a.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
