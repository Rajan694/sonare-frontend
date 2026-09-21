import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function Mobile() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">Sonare — Cover & principles</Text>
  <Text className="sa-meta">Foundations & components &middot; 1280 &times; 1080</Text>
</header>
<Text className="sa-note">Cover: product thesis, the source language (green = server, gold = on device), and the waveform seek rail.</Text>
<View className="sa-frame">
<View className="scr col">
    <View className="row between none">
      <View className="row g14 none">
        <Text className="row center none"><Image source={require('../../assets/music.svg')} className="ic" /></Text>
        <View className="col">
          <Text className="t-dis c1">Sonare</Text>
          <Text className="t-ov c3">Offline-first music player · design system v1.0</Text>
        </View>
      </View>
      <View className="row g10 none"><Text className="seg seg-lg">
      <Pressable className="seg-i seg-on-cloud"><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i "><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text><Text className="seg seg-lg">
      <Pressable className="seg-i "><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev"><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text></View>
    </View>

    <Text className="hr none"></Text>

    <View className="row g40 none">
      <View className="col">
        <Text className="t-h1 c1">A player that always tells you where the music is coming from.</Text>
        <Text className="t-bl c2">Sonare joins the local-library power of a device-first player to the discovery layer of a
        streaming service. One global switch — <Text className="cacc">Online</Text> or <Text className="cgold">Offline</Text> —
        decides what the whole application shows, and every song, album and playlist carries a source glyph so the
        answer is never ambiguous.</Text>
        <View className="col">
          <View className="row g14">
              <Text className="icobox icobox-acc none"><Image source={require('../../assets/smartphone_3.svg')} className="ic" /></Text>
              <Text className="col grow"><Text className="t-tm c1">Offline-first</Text>
              <Text className="t-bm c2">Everything on device works with the network unplugged. Queue, favourites and play counts survive.</Text></Text></View><View className="row g14">
              <Text className="icobox icobox-acc none"><Image source={require('../../assets/cloud_2.svg')} className="ic" /></Text>
              <Text className="col grow"><Text className="t-tm c1">Online adds, never replaces</Text>
              <Text className="t-bm c2">Going online layers discovery on top of the local library — it never hides what you already own.</Text></Text></View><View className="row g14">
              <Text className="icobox icobox-acc none"><Image source={require('../../assets/sliders.svg')} className="ic" /></Text>
              <Text className="col grow"><Text className="t-tm c1">Music before chrome</Text>
              <Text className="t-bm c2">Large artwork, a waveform seek rail, and no decoration that does not carry information.</Text></Text></View><View className="row g14">
              <Text className="icobox icobox-acc none"><Image source={require('../../assets/minimize.svg')} className="ic" /></Text>
              <Text className="col grow"><Text className="t-tm c1">One language, three shells</Text>
              <Text className="t-bm c2">Mobile, Windows and web share tokens and components but adapt layout, not just scale.</Text></Text></View>
        </View>
      </View>

      <View className="col grow">
        <View className="surf col">
          <Text className="t-ov c3">The source language</Text>
          <View className="row g28">
            <View className="col grow">
              <View className="row g10"><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text><Text className="t-tm cacc">Server</Text></View>
              <Text className="t-bm c2">Green. Streamed from the API. Shown only in Online Mode.</Text>
              <Text className="badge bg-cloud"><Image source={require('../../assets/cloud_3.svg')} className="ic" />Server</Text>
            </View>
            <Text className="vr"></Text>
            <View className="col grow">
              <View className="row g10"><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text><Text className="t-tm cgold">On device</Text></View>
              <Text className="t-bm c2">Gold. A real file in a scanned folder. Always playable.</Text>
              <Text className="badge bg-local"><Image source={require('../../assets/smartphone.svg')} className="ic" />On device</Text>
            </View>
          </View>
          <Text className="hr"></Text>
          <View className="col g2">
            <View className="srow srow-on">
      <Text className="srow-idx"><Text className="eqbars"><i></i><i></i><i></i><i></i></Text></Text><View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
            <View className="srow">
      <Text className="srow-idx">2</Text><View className="art a2 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:15</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
          </View>
        </View>

        <View className="row g16">
          <View className="surf col grow">
            <Text className="t-ov c3">Canvas</Text>
            <Text className="t-dis2 c1">#000000</Text>
            <Text className="t-bs c2">True black. Artwork and the accent are the only bright things on screen.</Text>
          </View>
          <View className="surf col grow">
            <Text className="t-ov c3">Accent</Text>
            <Text className="t-dis2 cacc">#00E28A</Text>
            <Text className="t-bs c2">12.2 : 1 on black. Used for play, progress and anything online.</Text>
          </View>
          <View className="surf col grow">
            <Text className="t-ov c3">On device</Text>
            <Text className="t-dis2 cgold">#FFC24D</Text>
            <Text className="t-bs c2">13.1 : 1 on black. Reserved for local files and Offline Mode.</Text>
          </View>
        </View>

        <View className="surf col">
          <Text className="t-ov c3">Signature — the waveform seek rail</Text>
          <Text className="wave"><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="hd"></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i></Text>
          <View className="row between"><Text className="t-mono c2">1:24</Text>
          <Text className="t-bs c3">Replaces the plain progress bar in the full player. Gold variant in Offline Mode.</Text>
          <Text className="t-mono c3">-2:18</Text></View>
          <Text className="wave wave-gold"><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="hd"></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i></Text>
        </View>
      </View>
    </View>

    <Text className="hr none"></Text>

    <View className="row g16 none">
      <View className="surf row g12 grow">
          <Text className="icobox none"><Image source={require('../../assets/icon_60.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Foundations</Text><Text className="t-bs c3">6 boards</Text></Text></View><View className="surf row g12 grow">
          <Text className="icobox none"><Image source={require('../../assets/grid.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Components</Text><Text className="t-bs c3">40+ patterns</Text></Text></View><View className="surf row g12 grow">
          <Text className="icobox none"><Image source={require('../../assets/smartphone_3.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Mobile</Text><Text className="t-bs c3">16 screens · 390×844</Text></Text></View><View className="surf row g12 grow">
          <Text className="icobox none"><Image source={require('../../assets/icon_103.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Windows</Text><Text className="t-bs c3">16 screens · 1440×900</Text></Text></View><View className="surf row g12 grow">
          <Text className="icobox none"><Image source={require('../../assets/minimize.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Web</Text><Text className="t-bs c3">16 screens · 1280</Text></Text></View><View className="surf row g12 grow">
          <Text className="icobox none"><Image source={require('../../assets/icon_25.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1">Tablet</Text><Text className="t-bs c3">4 screens · 834</Text></Text></View>
    </View>
  </View>
</View>

    </>
  );
}
