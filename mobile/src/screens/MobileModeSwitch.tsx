import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileModeSwitch() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">14 · Mode Switch</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">The Online→Offline switch interaction: confirmation surface listing exactly what stays and what is hidden, plus the resulting toast.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="col" style="height:844px;filter:blur(1px);opacity:.5">
    <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Text className="seg">
      <Pressable className="seg-i seg-on-cloud" href="#" aria-current="true"><Image source={require('../../assets/icon_dbb4a7b2.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i " href="#" aria-current="false"><Image source={require('../../assets/icon_eca8a722.svg')} className="ic" />Offline</Pressable>
    </Text><Text className="row g4 none"><Text className="ib"><Image source={require('../../assets/icon_1cbd1416.svg')} className="ic" /></Text><Text className="ib"><Image source={require('../../assets/icon_e1f0f7c5.svg')} className="ic" /></Text><Pressable className="ib ib-32 none" aria-label="Your profile" style="padding:0">
      <Text className="art a5 art-circ" style="width:30px;height:30px;display:block"></Text></Pressable></Text></View>
    <View className="col" style="padding:4px 20px;gap:22px">
      <View className="col" style="gap:2px"><Text className="t-bs c3">Thursday evening</Text><Text className="t-h1 c1">Welcome back, Rajan</Text></View>
      <View className="surf row g14" style="padding:12px"><View className="art a1 art-r-sm art-rings" style="width:68px;height:68px;"></View>
        <Text className="col grow" style="gap:6px"><Text className="t-ov c3">Continue listening</Text>
        <Text className="t-tm c1">Paper Lanterns</Text><Text className="row g8"><Text className="track" style=""><i style="width:38%"></i><b style="left:38%"></b></Text></Text></Text></View>
      <View className="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        <Text className="tile"><View className="art a2 art-r-sm" style="width:40px;height:40px;"></View>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Static Bloom</Text>
          <Text className="t-ls c3 trunc">Vela Nine</Text></Text></Text><Text className="tile"><View className="art a3 art-r-sm" style="width:40px;height:40px;"></View>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Winter Arithmetic</Text>
          <Text className="t-ls c3 trunc">The Orchard Machine</Text></Text></Text><Text className="tile"><View className="art a4 art-r-sm" style="width:40px;height:40px;"></View>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Undertow</Text>
          <Text className="t-ls c3 trunc">Mara Vel</Text></Text></Text><Text className="tile"><View className="art a7 art-r-sm" style="width:40px;height:40px;"></View>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Glass Houses</Text>
          <Text className="t-ls c3 trunc">Anais Ferrow</Text></Text></Text>
      </View>
    </View>
  </View>

  <View className="scrim"></View>

  <View className="row g10" style="position:absolute;left:20px;right:20px;top:20px;padding:12px 14px;background:rgba(17,17,20,.96);border:1px solid rgba(255,194,77,.3);border-radius:14px;box-shadow:var(--e4)">
    <Text className="dot dot-gold" style="margin-top:6px"></Text>
    <Text className="col grow" style="gap:2px">
      <Text className="t-ll cgold">Switched to Offline Mode</Text>
      <Text className="t-bs c2">Server content hidden. Playback continues from this device.</Text>
    </Text>
    <Pressable className="ib ib-28 none" aria-label="Dismiss"><Image source={require('../../assets/icon_7d106b93.svg')} className="ic" /></Pressable>
  </View>

  <View className="sheet col" style="position:absolute;left:0;right:0;bottom:0;padding:0 22px 26px;gap:16px">
    <Text className="grab"></Text>
    <View className="col center" style="gap:10px;padding-top:12px">
      <Text className="seg seg-lg">
      <Pressable className="seg-i " href="M01-Home-Online.html" aria-current="false"><Image source={require('../../assets/icon_dbb4a7b2.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev" href="M02-Home-Offline.html" aria-current="true"><Image source={require('../../assets/icon_eca8a722.svg')} className="ic" />Offline</Pressable>
    </Text>
      <Text className="t-h2 c1">Switch to Offline Mode?</Text>
      <Text className="t-bm c2" style="text-align:center;max-width:290px">Sonare will use only the music stored on this device. Nothing is fetched from the server.</Text>
    </View>

    <View className="inset col" style="padding:12px 14px;gap:12px">
      <Text className="t-ov c3">Stays available</Text>
      <Text className="row g10">
        <Text className="src src-local" style="width:22px;height:22px"><Image source={require('../../assets/icon_256713a5.svg')} className="ic" /></Text>
        <Text className="t-bs c1 grow">2,184 songs stored on this device</Text><Image source={require('../../assets/icon_c7f51e8a.svg')} className="ic" /></Text><Text className="row g10">
        <Text className="src src-local" style="width:22px;height:22px"><Image source={require('../../assets/icon_c28d6c13.svg')} className="ic" /></Text>
        <Text className="t-bs c1 grow">5 music folders and all local playlists</Text><Image source={require('../../assets/icon_c7f51e8a.svg')} className="ic" /></Text><Text className="row g10">
        <Text className="src src-local" style="width:22px;height:22px"><Image source={require('../../assets/icon_d10914cc.svg')} className="ic" /></Text>
        <Text className="t-bs c1 grow">Favourites, play counts and history</Text><Image source={require('../../assets/icon_c7f51e8a.svg')} className="ic" /></Text>
      <Text className="hr"></Text>
      <Text className="t-ov c3">Hidden while offline</Text>
      <Text className="row g10">
        <Text className="src" style="width:22px;height:22px;background:var(--s3);color:var(--t4)"><Image source={require('../../assets/icon_a3d9d8b4.svg')} className="ic" /></Text>
        <Text className="t-bs c3 grow">Server library, recommendations and trending</Text><Image source={require('../../assets/icon_9799f191.svg')} className="ic" /></Text><Text className="row g10">
        <Text className="src" style="width:22px;height:22px;background:var(--s3);color:var(--t4)"><Image source={require('../../assets/icon_a5c66e1a.svg')} className="ic" /></Text>
        <Text className="t-bs c3 grow">Online search results</Text><Image source={require('../../assets/icon_9799f191.svg')} className="ic" /></Text><Text className="row g10">
        <Text className="src" style="width:22px;height:22px;background:var(--s3);color:var(--t4)"><Image source={require('../../assets/icon_5c91961a.svg')} className="ic" /></Text>
        <Text className="t-bs c3 grow">Playlist sync with your account</Text><Image source={require('../../assets/icon_9799f191.svg')} className="ic" /></Text>
    </View>

    <label className="row g10" style="cursor:pointer">
      <Text className="sw none" aria-hidden="true"><i></i></Text>
      <Text className="col grow" style="gap:1px"><Text className="t-tm c1">Stay offline until I switch back</Text>
      <Text className="t-bs c3">Otherwise Sonare reconnects when Wi-Fi returns</Text></Text>
    </label>

    <View className="row g10">
      <Pressable className="btn btn-lg btn-out grow" href="M01-Home-Online.html">Cancel</Pressable>
      <Pressable className="btn btn-lg btn-gold grow" href="M02-Home-Offline.html"><Image source={require('../../assets/icon_5226be6c.svg')} className="ic" />Go offline</Pressable>
    </View>
  </View>
</View>
</View>

    </>
  );
}
