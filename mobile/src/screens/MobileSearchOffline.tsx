import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileSearchOffline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">04 · Search — Offline</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Search restricted to the device: local scope chips, folder results, and a separated "not on this device" block.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Pressable className="ib none"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Search device</Text><Text className="row g6 none"><i className="dot dot-gold"></i><Text className="t-ls">OFFLINE</Text></Text></View>
  <View className="col grow"><View className="col">
      <label className="field">
        <Image source={require('../../assets/icon_75.svg')} className="ic" />
        <input type="text" value="winter" />
        <Pressable className="ib ib-28 none"><Image source={require('../../assets/icon_106.svg')} className="ic" /></Pressable>
      </label>
      <View className="scrollx g8">
        <Pressable className="chip chip-on">All</Pressable><Pressable className="chip ">Songs</Pressable><Pressable className="chip ">Albums</Pressable><Pressable className="chip ">Artists</Pressable><Pressable className="chip ">Playlists</Pressable><Pressable className="chip ">Folders</Pressable>
      </View>

      <View className="offstrip">
        <Image source={require('../../assets/smartphone_5.svg')} className="ic" />
        <Text className="t-bs c2 grow">Local results only. Online search is off while you're in Offline Mode.</Text>
      </View>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Songs on device</Text></View>
    <View className="col g2"><View className="srow">
      <View className="art a3 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Winter Arithmetic</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">5:08</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cassette Sunday</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">2:58</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View></View></View>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Folders</Text><Pressable className="row g2 t-ll c2 none">All<Image source={require('../../assets/chevron_right.svg')} className="ic" /></Pressable></View>
    <View className="col g2">
        <Pressable className="srow">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1 trunc">Music/Albums</Text>
          <Text className="t-bs c2">842 songs · 6.1 GB</Text></Text><Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></Pressable><Pressable className="srow">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-tm c1 trunc">SD Card/Music</Text>
          <Text className="t-bs c2">1130 songs · 8.7 GB</Text></Text><Image source={require('../../assets/chevron_right_2.svg')} className="ic" /></Pressable>
      </View></View>

      <View className="col">
        <Text className="t-ov c3">Not on this device</Text>
        <View className="surf row g12">
          <Text className="icobox"><Image source={require('../../assets/cloud_2.svg')} className="ic" /></Text>
          <Text className="col grow">
            <Text className="t-tm c2">6 more matches on the server</Text>
            <Text className="t-bs c3">Go online to search and stream them.</Text>
          </Text>
          <Pressable className="btn btn-sm btn-out none">Go online</Pressable>
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
  <View className="mnav none"><Pressable className=""><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable className=""><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable className="on"><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
