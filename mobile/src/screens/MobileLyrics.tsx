import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileLyrics() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">11 · Lyrics</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Synced .lrc lyrics with the active line highlighted, sync-offset control, import and edit.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="ambient">
    <i></i>
    <i></i>
  </View>
  <View className="col grow">
    <View className="row between none">
      <Pressable className="ib none"><Image source={require('../../assets/icon_18.svg')} className="ic" /></Pressable>
      <Text className="t-ll c1 none">Lyrics</Text>
      <Pressable className="ib none"><Image source={require('../../assets/icon_95.svg')} className="ic" /></Pressable>
    </View>

    <View className="row g12 none">
      <View className="art a1 art-r-sm art-rings"></View>
      <Text className="col grow">
        <Text className="t-tm c1 trunc">Paper Lanterns</Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
      <Text className="badge bg-local"><Image source={require('../../assets/smartphone.svg')} className="ic" />.lrc</Text>
    </View>

    <View className="row g8 none">
      <Pressable className="chip chip-sm chip-on"><Image source={require('../../assets/sync.svg')} className="ic" />Synced</Pressable>
      <Pressable className="chip chip-sm">Plain text</Pressable>
      <Pressable className="chip chip-sm"><Image source={require('../../assets/clock.svg')} className="ic" />Offset −0.3s</Pressable>
    </View>

    <View className="col grow">
      <View className="rowt g12">
        <Text className="t-mono-s none">0:58</Text>
        <Text className="t-h2 c3">We drew the harbour out of memory</Text>
      </View><View className="rowt g12">
        <Text className="t-mono-s none">1:04</Text>
        <Text className="t-h2 c3">Ink still wet across the bay</Text>
      </View><View className="rowt g12">
        <Text className="t-mono-s none">1:11</Text>
        <Text className="t-h2 c1">Paper lanterns on the water line</Text>
      </View><View className="rowt g12">
        <Text className="t-mono-s none">1:19</Text>
        <Text className="t-h2 c3">Burning slow, refusing to stay</Text>
      </View><View className="rowt g12">
        <Text className="t-mono-s none">1:26</Text>
        <Text className="t-h2 c3">And every street we never walked</Text>
      </View><View className="rowt g12">
        <Text className="t-mono-s none">1:33</Text>
        <Text className="t-h2 c3">Is drawn in here somewhere</Text>
      </View><View className="rowt g12">
        <Text className="t-mono-s none">1:41</Text>
        <Text className="t-h2 c3">Fold the map along the coast</Text>
      </View>
    </View>
  </View>

  <View className="col none">
    <Text className="wave wave-sm"><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="hd"></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i><i className=""></i></Text>
    <View className="row between">
      <Text className="t-mono-s c2">1:24</Text>
      <Text className="row g16">
        <Pressable className="ib ib-32"><Image source={require('../../assets/icon_15.svg')} className="ic" /></Pressable>
        <Pressable className="playbtn playbtn-40"><Image source={require('../../assets/icon_13.svg')} className="ic" /></Pressable>
        <Pressable className="ib ib-32"><Image source={require('../../assets/icon_92.svg')} className="ic" /></Pressable>
      </Text>
      <Text className="t-mono-s c3">-2:18</Text>
    </View>
    <View className="row g8">
      <Pressable className="btn btn-sm btn-out grow"><Image source={require('../../assets/icon_62.svg')} className="ic" />Edit lyrics</Pressable>
      <Pressable className="btn btn-sm btn-out grow"><Image source={require('../../assets/download_2.svg')} className="ic" />Import .lrc</Pressable>
    </View>
  </View>
</View>
</View>

    </>
  );
}
