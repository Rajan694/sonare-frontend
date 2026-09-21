import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileQueue() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">12 · Queue</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Queue: now playing, upcoming tracks, drag handles, drop indicator, clear and save-as-playlist.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="ambient"><i></i></View>
  <View className="col grow">
    <View className="row between none">
      <Pressable className="ib none"><Image source={require('../../assets/icon_18.svg')} className="ic" /></Pressable>
      <Text className="t-ll c1 none">Queue</Text>
      <Pressable className="ib none"><Image source={require('../../assets/icon_95.svg')} className="ic" /></Pressable>
    </View>

    <View className="row g8 none">
      <Text className="row g6 none">
        <Image source={require('../../assets/cloud_4.svg')} className="ic" /><Text className="t-ls">ONLINE QUEUE</Text></Text>
      <Text className="t-bs c3 grow">7 songs · 2 from server</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/shuffle_4.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/repeat_2.svg')} className="ic" /></Pressable>
    </View>

    <Text className="t-ov c3 none">Now playing</Text>
    <View className="srow srow-on none">
      <View className="art a1 art-r-sm art-rings"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="row g8"><Text className="track"><i></i><b></b></Text><Text className="t-mono-s c3 none">-2:18</Text></Text>
      </Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_69.svg')} className="ic" /></Pressable>
    </View>

    <View className="row between none">
      <Text className="t-ov c3">Next in queue</Text>
      <Pressable className="t-ll cacc none">Clear queue</Pressable>
    </View>

    <View className="col g2">
      <View className="srow">
      <View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_14.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow srow-hover">
      <View className="art a3 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Winter Arithmetic</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_14.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a2 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_14.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a6 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Ferrous</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Kite &amp; Anchor · Tidal Drift</Text>
      </Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_14.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a7 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Glass Houses</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Anais Ferrow · Quiet Riot Act</Text>
      </Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_14.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a4 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Half-Light</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Mara Vel · Salt &amp; Signal</Text>
      </Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_14.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View>
      <View className="srow ghost">
        <View className="art a10 art-r-sm"></View>
        <Text className="col grow"><Text className="t-tm c2 trunc">Velvet Static</Text>
        <Text className="t-bs c3 trunc">Mira Sound · dropping here</Text></Text>
        <Text className="t-ls c3 none">Drop to insert</Text>
      </View>
    </View>
  </View>

  <View className="row g8 none">
    <Pressable className="btn btn-sm btn-out grow"><Image source={require('../../assets/plus.svg')} className="ic" />Save as playlist</Pressable>
    <Pressable className="btn btn-sm btn-out grow"><Image source={require('../../assets/playlist_add.svg')} className="ic" />Add songs</Pressable>
  </View>
</View>
</View>

    </>
  );
}
