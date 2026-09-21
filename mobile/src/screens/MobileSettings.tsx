import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileSettings() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">15 · Settings</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Settings with connection mode as a first-class section and per-mode behaviour toggles.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Pressable className="ib none"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Settings</Text></View>
  <View className="col grow"><View className="col">
      <View className="surf row g14">
        <View className="art a5 art-circ"></View>
        <Text className="col grow">
          <Text className="t-tl c1">Rajan Kumar</Text>
          <Text className="t-bs c2">Sonare account · signed in</Text>
        </Text>
        <Text className="row g6 none"><i className="dot dot-gold"></i><Text className="t-ls">OFFLINE</Text></Text>
      </View>

      <View className="surf col">
        <View className="row between">
          <Text className="col"><Text className="t-tm c1">Connection mode</Text>
          <Text className="t-bs c3">Controls what the whole app shows</Text></Text>
        </View>
        <Text className="seg seg-lg">
      <Pressable className="seg-i "><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev"><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text>
        <View className="offstrip"><Text className="dot dot-gold"></Text>
          <Text className="t-bs c2 grow">Offline since 18:42 · nothing has been fetched from the server</Text></View>
      </View>

      <View className="col">
        <Text className="t-ov c3">Playback</Text>
        <View className="surf col">
          <View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/music_2.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Audio quality</Text>
            <Text className="t-bs c3">Streaming: High · Download: FLAC</Text></Text>
            <Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/sliders.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Equalizer &amp; effects</Text>
            <Text className="t-bs c3">Sonare preset · Bass +42%</Text></Text>
            <Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_35.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Audio output</Text>
            <Text className="t-bs c3">Wired headphones</Text></Text>
            <Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/disc.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Sleep timer</Text>
            <Text className="t-bs c3">Off</Text></Text>
            <Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></View>
        </View>
      </View><View className="col">
        <Text className="t-ov c3">Library</Text>
        <View className="surf col">
          <View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Music folders</Text>
            <Text className="t-bs c3">5 folders · 2,184 songs</Text></Text>
            <Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_23.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Scan on startup</Text>
            </Text>
            <Pressable className="sw on none"><i></i></Pressable></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_38.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Ignore tracks under 30s</Text>
            </Text>
            <Pressable className="sw on none"><i></i></Pressable></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/sync_3.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Sync playlists with account</Text>
            <Text className="t-bs c3">Paused while offline</Text></Text>
            <Pressable className="sw  none"><i></i></Pressable></View>
        </View>
      </View><View className="col">
        <Text className="t-ov c3">Data</Text>
        <View className="surf col">
          <View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/download_3.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Download over Wi-Fi only</Text>
            </Text>
            <Pressable className="sw on none"><i></i></Pressable></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/cloud_2.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Stream quality on mobile data</Text>
            <Text className="t-bs c3">Normal · 128 kbps</Text></Text>
            <Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></View><View className="lrow">
            <Text className="icobox"><Image source={require('../../assets/icon_22.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Clear cache</Text>
            <Text className="t-bs c3">1.2 GB</Text></Text>
            <Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></View>
        </View>
      </View>
    </View></View>
  <View className="mini none mini-gold">
    <Pressable className="row g12 grow">
      <View className="art a1 art-r-sm art-rings"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Paper Lanterns</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
    </Pressable>
    <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_9.svg')} className="ic" /></Pressable>
    <Pressable className="ib none"><Image source={require('../../assets/icon_6.svg')} className="ic" /></Pressable>
    <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_86.svg')} className="ic" /></Pressable>
  </View>
  <View className="mnav none"><Pressable className="on"><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable className=""><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable className=""><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
