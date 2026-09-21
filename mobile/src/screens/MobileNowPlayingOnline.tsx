import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileNowPlayingOnline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">09 · Now Playing — Online</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Full player, streaming source. Green waveform rail, codec/bitrate line, cast output.</Text>
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
        <Image source={require('../../assets/cloud_4.svg')} className="ic" /><Text className="t-ls">STREAMING</Text>
      </Text>
      <Text className="t-mono-s c3">AAC · 320 kbps</Text>
    </View>

    <View className="col none">
      <Text className="wave"><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="hd"></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i></Text>
      <View className="row between"><Text className="t-mono-s c2">1:24</Text><Text className="t-mono-s c3">-2:18</Text></View>
    </View>

    <View className="row between none">
      <Pressable className="ib ib-44"><Image source={require('../../assets/shuffle_5.svg')} className="ic" /></Pressable>
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
    <Text className="icobox"><Image source={require('../../assets/icon_35.svg')} className="ic" /></Text>
    <Text className="col grow">
      <Text className="t-ll c1">Living Room Speaker</Text>
      <Text className="t-ls c3">Cast · Sonare Connect</Text>
    </Text>
    <Pressable className="ib ib-32 none"><Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></Pressable>
  </View>
</View>
</View>

    </>
  );
}
