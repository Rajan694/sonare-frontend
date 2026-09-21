import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileAlbum() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">06 · Album</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Album detail: artwork-derived ambient background, metadata, transport row, track list.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Pressable className="ib none"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-ll c2 grow">Album</Text>
      <Pressable className="ib none"><Image source={require('../../assets/icon_95.svg')} className="ic" /></Pressable></View>
  <View className="col grow"><View className="col">
      <View className="ambient">
        <i></i>
        <i></i>
      </View>
      <View className="col center">
        <View className="art a1 art-r-lg art-rings"></View>
        <View className="col center">
          <Text className="t-h1 c1">Midnight Cartography</Text>
          <Pressable className="t-tm c2">Hollow Coast</Pressable>
          <Text className="t-bs c3">Album · 2024 · 11 songs · 48 min</Text>
        </View>
        <View className="row g10"><Text className="badge bg-local"><Image source={require('../../assets/smartphone.svg')} className="ic" />On device</Text><Text className="badge bg-neutral">FLAC · 1411 kbps</Text></View>
        <View className="row between">
          <Text className="row g4">
            <Pressable className="ib ib-44"><Image source={require('../../assets/icon_56.svg')} className="ic" /></Pressable>
            <Pressable className="ib ib-44"><Image source={require('../../assets/icon_107.svg')} className="ic" /></Pressable>
            <Pressable className="ib ib-44"><Image source={require('../../assets/playlist_add_2.svg')} className="ic" /></Pressable>
          </Text>
          <Text className="row g10">
            <Pressable className="ib ib-44 ib-bord"><Image source={require('../../assets/shuffle_2.svg')} className="ic" /></Pressable>
            <Pressable className="playbtn playbtn-56"><Image source={require('../../assets/play.svg')} className="ic" /></Pressable>
          </Text>
        </View>
      </View>
      <View className="col g2">
        <View className="srow srow-on">
      <Text className="srow-idx"><Text className="eqbars"><i></i><i></i><i></i><i></i></Text></Text>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">2</Text>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:33</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">3</Text>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cartographer</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">5:16</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
        <View className="srow"><Text className="srow-idx">4</Text>
          <Text className="col grow"><Text className="row g6"><Text className="t-tm c1 trunc">Tin Roof Morning</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
          <Text className="t-bs c2 trunc">Hollow Coast</Text></Text>
          <Text className="t-mono-s c3 none">4:02</Text>
          <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable></View><View className="srow"><Text className="srow-idx">5</Text>
          <Text className="col grow"><Text className="row g6"><Text className="t-tm c1 trunc">North Field</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
          <Text className="t-bs c2 trunc">Hollow Coast</Text></Text>
          <Text className="t-mono-s c3 none">3:29</Text>
          <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable></View><View className="srow"><Text className="srow-idx">6</Text>
          <Text className="col grow"><Text className="row g6"><Text className="t-tm c1 trunc">Signal Hill</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
          <Text className="t-bs c2 trunc">Hollow Coast</Text></Text>
          <Text className="t-mono-s c3 none">5:11</Text>
          <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable></View>
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
