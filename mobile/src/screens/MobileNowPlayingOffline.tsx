import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileNowPlayingOffline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">10 · Now Playing — Offline</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Full player, local file source. Gold waveform rail, FLAC detail, local output, no network.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="ambient">
    <i></i>
    <i></i>
    <i></i>
  </View>
  <View className="col grow">
    <View className="row between none">
      <Pressable className="ib none"><Image source={require('../../assets/icon_18.svg')} className="ic" /></Pressable>
      <Text className="col center none">
        <Text className="t-ls c3">PLAYING FROM ALBUM</Text>
        <Text className="t-ll c1">Midnight Cartography</Text>
      </Text>
      <Pressable className="ib none"><Image source={require('../../assets/icon_95.svg')} className="ic" /></Pressable>
    </View>

    <View className="center">
      <View className="art a1 art-r-xl art-rings"></View>
    </View>

    <View className="row between none g12">
      <Text className="col grow">
        <Text className="t-h1 c1 trunc">Paper Lanterns</Text>
        <Text className="t-tm c2 trunc">Hollow Coast</Text>
      </Text>
      <Pressable className="ib ib-44 none"><Image source={require('../../assets/heart_2.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44 none"><Image source={require('../../assets/plus_3.svg')} className="ic" /></Pressable>
    </View>

    <View className="row g8 none">
      <Text className="row g6 none">
        <Image source={require('../../assets/smartphone_6.svg')} className="ic" /><Text className="t-ls">ON THIS DEVICE</Text>
      </Text>
      <Text className="t-mono-s c3">FLAC · 1411 kbps · 24-bit</Text>
    </View>

    <View className="col none">
      <Text className="wave wave-gold"><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="hd"></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i></Text>
      <View className="row between"><Text className="t-mono-s c2">1:24</Text><Text className="t-mono-s c3">-2:18</Text></View>
    </View>

    <View className="row between none">
      <Pressable className="ib ib-44"><Image source={require('../../assets/shuffle_3.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44"><Image source={require('../../assets/icon_46.svg')} className="ic" /></Pressable>
      <Pressable className="playbtn"><Image source={require('../../assets/icon_87.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44"><Image source={require('../../assets/icon_7.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44"><Image source={require('../../assets/repeat.svg')} className="ic" /></Pressable>
    </View>

    <View className="row between none">
      <Pressable className="ib ib-44"><Image source={require('../../assets/icon_101.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44"><Image source={require('../../assets/sliders_2.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44"><Image source={require('../../assets/icon_12.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44"><Image source={require('../../assets/disc_2.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44"><Image source={require('../../assets/icon_28.svg')} className="ic" /></Pressable>
    </View>
  </View>

  <View className="row g10 none">
    <Text className="icobox"><Image source={require('../../assets/headphones.svg')} className="ic" /></Text>
    <Text className="col grow">
      <Text className="t-ll c1">Wired headphones</Text>
      <Text className="t-ls c3">Playing locally · no network used</Text>
    </Text>
    <Pressable className="ib ib-32 none"><Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></Pressable>
  </View>
</View>
</View>

    </>
  );
}
