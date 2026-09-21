import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileEqualizer() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">13 · Equalizer & Audio</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Audio: presets, graphic EQ bands, bass boost, virtualizer, crossfade, gapless, normalization, output device.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Pressable className="ib none" href="M10-Now-Playing-Offline.html" aria-label="Back"><Image source={require('../../assets/icon_d5a96b1c.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Audio</Text>
      <Pressable className="sw on none" aria-label="Equalizer enabled"><i></i></Pressable></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="padding:0 20px;gap:18px">
      <View className="scrollx g8" style="margin:0 -20px;padding:0 20px">
        <Pressable className="chip ">Flat</Pressable><Pressable className="chip chip-on">Sonare</Pressable><Pressable className="chip ">Bass</Pressable><Pressable className="chip ">Vocal</Pressable><Pressable className="chip ">Acoustic</Pressable><Pressable className="chip ">Late night</Pressable>
      </View>

      <View className="surf col" style="padding:18px 14px 14px;gap:14px">
        <View className="row between" style="padding:0 4px">
          <Text className="t-ll c2">7-band equalizer</Text>
          <Text className="t-mono-s c3">+12 / −12 dB</Text>
        </View>
        <View className="row between" style="align-items:flex-end">
          <Text className="vs">
            <Text className="t-mono-s c3">+4</Text>
            <Text className="vs-rail"><i style="bottom:0;height:68%"></i><b style="bottom:68%"></b></Text>
            <Text className="t-ls c3">60</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">0</Text>
            <Text className="vs-rail"><i style="bottom:0;height:52%"></i><b style="bottom:52%"></b></Text>
            <Text className="t-ls c3">150</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">-1</Text>
            <Text className="vs-rail"><i style="bottom:0;height:44%"></i><b style="bottom:44%"></b></Text>
            <Text className="t-ls c3">400</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">+2</Text>
            <Text className="vs-rail"><i style="bottom:0;height:58%"></i><b style="bottom:58%"></b></Text>
            <Text className="t-ls c3">1k</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">+5</Text>
            <Text className="vs-rail"><i style="bottom:0;height:72%"></i><b style="bottom:72%"></b></Text>
            <Text className="t-ls c3">2.4k</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">+3</Text>
            <Text className="vs-rail"><i style="bottom:0;height:61%"></i><b style="bottom:61%"></b></Text>
            <Text className="t-ls c3">6k</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">0</Text>
            <Text className="vs-rail"><i style="bottom:0;height:50%"></i><b style="bottom:50%"></b></Text>
            <Text className="t-ls c3">14k</Text>
          </Text>
        </View>
      </View>

      <View className="surf col" style="padding:6px 0">
        <View className="lrow"><Text className="icobox icobox-acc"><Image source={require('../../assets/icon_cda81597.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:6px"><Text className="t-tm c1">Bass boost</Text><Text className="track" style=""><i style="width:42%"></i><b style="left:42%"></b></Text></Text>
          <Text className="t-mono-s c2 none">42%</Text></View>
        <View className="lrow"><Text className="icobox icobox-acc"><Image source={require('../../assets/icon_4fea2e3d.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:6px"><Text className="t-tm c1">Virtualizer</Text><Text className="track" style=""><i style="width:26%"></i><b style="left:26%"></b></Text></Text>
          <Text className="t-mono-s c2 none">26%</Text></View>
        <View className="lrow"><Text className="icobox"><Image source={require('../../assets/icon_4eb8c5db.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Playback speed</Text>
          <Text className="t-bs c3">Pitch preserved</Text></Text>
          <Text className="row g6 none"><Pressable className="chip chip-sm ">0.75×</Pressable><Pressable className="chip chip-sm chip-on">1.0×</Pressable><Pressable className="chip chip-sm ">1.25×</Pressable><Pressable className="chip chip-sm ">1.5×</Pressable></Text></View>
      </View>

      <View className="surf col" style="padding:6px 0">
        <View className="lrow"><Text className="icobox"><Image source={require('../../assets/icon_4fd3c178.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Crossfade</Text><Text className="t-bs c3">6 seconds between tracks</Text></Text>
            <Pressable className="sw on none" aria-label="Crossfade"><i></i></Pressable></View><View className="lrow"><Text className="icobox"><Image source={require('../../assets/icon_29c900bf.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Gapless playback</Text><Text className="t-bs c3">Seamless album transitions</Text></Text>
            <Pressable className="sw on none" aria-label="Gapless playback"><i></i></Pressable></View><View className="lrow"><Text className="icobox"><Image source={require('../../assets/icon_5dbeb9d1.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Volume normalization</Text><Text className="t-bs c3">Even loudness across the library</Text></Text>
            <Pressable className="sw  none" aria-label="Volume normalization"><i></i></Pressable></View>
      </View>

      <View className="surf row g12" style="padding:14px">
        <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_f76c8b4d.svg')} className="ic" /></Text>
        <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Wired headphones</Text>
        <Text className="t-bs c3">Output device · EQ applies here</Text></Text>
        <Pressable className="ib ib-32 none" aria-label="Change output"><Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></Pressable>
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
  <View className="mnav none"><Pressable href="M02-Home-Offline.html" className=""><Image source={require('../../assets/icon_27111392.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className="on"><Image source={require('../../assets/icon_910e2fb2.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className=""><Image source={require('../../assets/icon_1d92030b.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M04-Search-Offline.html" className=""><Image source={require('../../assets/icon_88a5aa5a.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
