import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileEqualizer() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">13 · Equalizer & Audio</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Audio: presets, graphic EQ bands, bass boost, virtualizer, crossfade, gapless, normalization, output device.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Pressable className="ib none"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Audio</Text>
      <Pressable className="sw on none"><i></i></Pressable></View>
  <View className="col grow"><View className="col">
      <View className="scrollx g8">
        <Pressable className="chip ">Flat</Pressable><Pressable className="chip chip-on">Sonare</Pressable><Pressable className="chip ">Bass</Pressable><Pressable className="chip ">Vocal</Pressable><Pressable className="chip ">Acoustic</Pressable><Pressable className="chip ">Late night</Pressable>
      </View>

      <View className="surf col">
        <View className="row between">
          <Text className="t-ll c2">7-band equalizer</Text>
          <Text className="t-mono-s c3">+12 / −12 dB</Text>
        </View>
        <View className="row between">
          <Text className="vs">
            <Text className="t-mono-s c3">+4</Text>
            <Text className="vs-rail"><i></i><b></b></Text>
            <Text className="t-ls c3">60</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">0</Text>
            <Text className="vs-rail"><i></i><b></b></Text>
            <Text className="t-ls c3">150</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">-1</Text>
            <Text className="vs-rail"><i></i><b></b></Text>
            <Text className="t-ls c3">400</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">+2</Text>
            <Text className="vs-rail"><i></i><b></b></Text>
            <Text className="t-ls c3">1k</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">+5</Text>
            <Text className="vs-rail"><i></i><b></b></Text>
            <Text className="t-ls c3">2.4k</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">+3</Text>
            <Text className="vs-rail"><i></i><b></b></Text>
            <Text className="t-ls c3">6k</Text>
          </Text><Text className="vs">
            <Text className="t-mono-s c3">0</Text>
            <Text className="vs-rail"><i></i><b></b></Text>
            <Text className="t-ls c3">14k</Text>
          </Text>
        </View>
      </View>

      <View className="surf col">
        <View className="lrow"><Text className="icobox icobox-acc"><Image source={require('../../assets/disc_3.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Bass boost</Text><Text className="track"><i></i><b></b></Text></Text>
          <Text className="t-mono-s c2 none">42%</Text></View>
        <View className="lrow"><Text className="icobox icobox-acc"><Image source={require('../../assets/minimize.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Virtualizer</Text><Text className="track"><i></i><b></b></Text></Text>
          <Text className="t-mono-s c2 none">26%</Text></View>
        <View className="lrow"><Text className="icobox"><Image source={require('../../assets/clock_2.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Playback speed</Text>
          <Text className="t-bs c3">Pitch preserved</Text></Text>
          <Text className="row g6 none"><Pressable className="chip chip-sm ">0.75×</Pressable><Pressable className="chip chip-sm chip-on">1.0×</Pressable><Pressable className="chip chip-sm ">1.25×</Pressable><Pressable className="chip chip-sm ">1.5×</Pressable></Text></View>
      </View>

      <View className="surf col">
        <View className="lrow"><Text className="icobox"><Image source={require('../../assets/sync_3.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Crossfade</Text><Text className="t-bs c3">6 seconds between tracks</Text></Text>
            <Pressable className="sw on none"><i></i></Pressable></View><View className="lrow"><Text className="icobox"><Image source={require('../../assets/music_2.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Gapless playback</Text><Text className="t-bs c3">Seamless album transitions</Text></Text>
            <Pressable className="sw on none"><i></i></Pressable></View><View className="lrow"><Text className="icobox"><Image source={require('../../assets/volume.svg')} className="ic" /></Text>
            <Text className="col grow"><Text className="t-tm c1">Volume normalization</Text><Text className="t-bs c3">Even loudness across the library</Text></Text>
            <Pressable className="sw  none"><i></i></Pressable></View>
      </View>

      <View className="surf row g12">
        <Text className="icobox icobox-gold"><Image source={require('../../assets/headphones.svg')} className="ic" /></Text>
        <Text className="col grow"><Text className="t-tm c1">Wired headphones</Text>
        <Text className="t-bs c3">Output device · EQ applies here</Text></Text>
        <Pressable className="ib ib-32 none"><Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></Pressable>
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
  <View className="mnav none"><Pressable className=""><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable className="on"><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable className=""><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
