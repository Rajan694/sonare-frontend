import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobilePlaylist() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">08 · Playlist</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Playlist detail with local/synced badges, download state and drag-to-reorder tracks.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Pressable className="ib none"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-ll c2 grow">Playlist</Text>
      <Text className="row g2 none">
        <Pressable className="ib"><Image source={require('../../assets/icon_39.svg')} className="ic" /></Pressable>
        <Pressable className="ib"><Image source={require('../../assets/icon_95.svg')} className="ic" /></Pressable>
      </Text></View>
  <View className="col grow"><View className="col">
      <View className="ambient"><i></i>
        <i></i></View>
      <View className="rowt g16">
        <View className="art a1 art-r-lg art-rings"></View>
        <View className="col grow">
          <Text className="t-h1 c1">Late Drive</Text>
          <Text className="t-bs c2">42 songs · 2 hr 51 min</Text>
          <Text className="t-bs c3">Made by you · updated 2 days ago</Text>
          <View className="row g6 wrap"><Text className="badge bg-local"><Image source={require('../../assets/smartphone.svg')} className="ic" />On device</Text><Text className="badge bg-dl"><Image source={require('../../assets/sync_2.svg')} className="ic" />Synced</Text></View>
        </View>
      </View>
      <View className="row between">
        <Text className="row g4">
          <Pressable className="ib ib-44"><Image source={require('../../assets/heart.svg')} className="ic" /></Pressable>
          <Pressable className="ib ib-44"><Image source={require('../../assets/download.svg')} className="ic" /></Pressable>
          <Pressable className="ib ib-44"><Image source={require('../../assets/icon_27.svg')} className="ic" /></Pressable>
        </Text>
        <Text className="row g10">
          <Pressable className="ib ib-44 ib-bord"><Image source={require('../../assets/shuffle_2.svg')} className="ic" /></Pressable>
          <Pressable className="playbtn playbtn-56"><Image source={require('../../assets/play.svg')} className="ic" /></Pressable>
        </Text>
      </View>
      <View className="row between">
        <Pressable className="chip chip-sm"><Image source={require('../../assets/icon_48.svg')} className="ic" />Custom order<Image source={require('../../assets/icon_30.svg')} className="ic" /></Pressable>
        <Text className="t-bs c3">Drag to reorder</Text>
      </View>
      <View className="col g2">
        <View className="srow srow-on">
      <View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      <Text className="t-mono-s c3 none">3:42</Text>
            <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a2 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      <Text className="t-mono-s c3 none">4:15</Text>
            <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Winter Arithmetic</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      <Text className="t-mono-s c3 none">5:08</Text>
            <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a4 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Undertow</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Mara Vel · Salt &amp; Signal</Text>
      </Text>
      <Text className="t-mono-s c3 none">3:27</Text>
            <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a6 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Ferrous</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Kite &amp; Anchor · Tidal Drift</Text>
      </Text>
      <Text className="t-mono-s c3 none">3:18</Text>
            <Pressable className="ib ib-32 none drag"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View>
      </View>
    </View></View>
  <View className="mini none">
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
  <View className="mnav none"><Pressable className=""><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable className=""><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable className="on"><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable className=""><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
