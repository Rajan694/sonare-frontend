import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileArtist() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">07 · Artist</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Artist detail: circular hero, follow state, popular tracks with play counts, album shelf.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Pressable className="ib none"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-ll c2 grow">Artist</Text>
      <Pressable className="ib none"><Image source={require('../../assets/icon_95.svg')} className="ic" /></Pressable></View>
  <View className="col grow"><View className="col">
      <View className="ambient">
        <i></i>
        <i></i>
      </View>
      <View className="col center">
        <View className="art a1 art-circ art-rings"></View>
        <View className="col center">
          <Text className="t-h1 c1">Hollow Coast</Text>
          <Text className="t-bs c3">3 albums on device · 1 streaming · 14,208 plays</Text>
        </View>
        <View className="row g10">
          <Pressable className="btn btn-sm btn-out"><Image source={require('../../assets/icon_58.svg')} className="ic" />Following</Pressable>
          <Pressable className="ib ib-40 ib-bord"><Image source={require('../../assets/shuffle_6.svg')} className="ic" /></Pressable>
          <Pressable className="playbtn playbtn-48"><Image source={require('../../assets/play_3.svg')} className="ic" /></Pressable>
        </View>
      </View>
      <View className="col">
        <View className="col">
    <View className="shead"><Text className="t-h2 c1">Popular</Text></View>
    <View className="col g2">
          <View className="srow">
      <Text className="srow-idx">1</Text><View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Paper Lanterns</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">142 plays</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">2</Text><View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">97 plays</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:33</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">3</Text><View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cartographer</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">61 plays</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">5:16</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
        </View></View>
        <View className="col">
    <View className="shead"><Text className="t-h2 c1">Albums</Text><Pressable className="row g2 t-ll c2 none">All<Image source={require('../../assets/chevron_right.svg')} className="ic" /></Pressable></View>
    <View className="scrollx g12">
          <Pressable className="acard">
      <View className="art a1 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Midnight Cartography</Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
    </Pressable><Pressable className="acard">
      <View className="art a5 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Parallax</Text>
        <Text className="t-bs c2 trunc">Sundial Theory</Text>
      </Text>
    </Pressable><Pressable className="acard">
      <View className="art a9 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Fathom Line</Text>
        <Text className="t-bs c2 trunc">Ocean Bureau</Text>
      </Text>
    </Pressable>
        </View></View>
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
