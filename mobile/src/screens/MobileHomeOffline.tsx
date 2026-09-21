import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileHomeOffline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">02 · Home — Offline</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Home in Offline Mode: offline banner, resume-from-device, local albums, folder shortcuts. All server sections removed.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Text className="seg">
      <Pressable className="seg-i "><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev"><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text>
      <Text className="row g4 none">
        <Pressable className="ib"><Image source={require('../../assets/icon_83.svg')} className="ic" /></Pressable>
        <Pressable className="ib"><Image source={require('../../assets/folder_3.svg')} className="ic" /></Pressable>
        <Pressable className="ib ib-32 none">
      <Text className="art a5 art-circ"></Text></Pressable>
      </Text></View>
  <View className="col grow"><View className="col">
      <View className="offstrip">
        <Image source={require('../../assets/icon_112.svg')} className="ic" />
        <Text className="col grow">
          <Text className="t-ll">You're offline</Text>
          <Text className="t-bs c2">Showing the 2,184 songs stored on this device.</Text>
        </Text>
      </View>

      <Pressable className="surf row g14">
        <View className="art a1 art-r-sm art-rings"></View>
        <Text className="col grow">
          <Text className="t-ov c3">Resume · on device</Text>
          <Text className="t-tm c1 trunc">Paper Lanterns</Text>
          <Text className="row g8"><Text className="track track-gold"><i></i><b></b></Text><Text className="t-mono-s c3 none">1:24</Text></Text>
        </Text>
        <Text className="playbtn-fab"><Image source={require('../../assets/play_2.svg')} className="ic" /></Text>
      </Pressable>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Recently played</Text></View>
    <View className="col g2">
        <View className="srow">
      <View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:33</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cassette Sunday</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">2:58</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a7 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Glass Houses</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Anais Ferrow · Quiet Riot Act</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:55</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View></View></View>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Albums on device</Text><Pressable className="row g2 t-ll c2 none">All<Image source={require('../../assets/chevron_right.svg')} className="ic" /></Pressable></View>
    <View className="scrollx g12"><Pressable className="acard">
      <View className="art a1 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Midnight Cartography</Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
    </Pressable><Pressable className="acard">
      <View className="art a3 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Slow Frequencies</Text>
        <Text className="t-bs c2 trunc">The Orchard Machine</Text>
      </Text>
    </Pressable><Pressable className="acard">
      <View className="art a7 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Quiet Riot Act</Text>
        <Text className="t-bs c2 trunc">Anais Ferrow</Text>
      </Text>
    </Pressable><Pressable className="acard">
      <View className="art a6 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Tidal Drift</Text>
        <Text className="t-bs c2 trunc">Kite &amp; Anchor</Text>
      </Text>
    </Pressable></View></View>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Your folders</Text><Pressable className="row g2 t-ll c2 none">All<Image source={require('../../assets/chevron_right.svg')} className="ic" /></Pressable></View>
    <View className="grid">
        <Pressable className="tile">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-ll c1 trunc">Albums</Text>
          <Text className="t-ls c3">842 songs</Text></Text></Pressable><Pressable className="tile">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-ll c1 trunc">Downloads</Text>
          <Text className="t-ls c3">204 songs</Text></Text></Pressable><Pressable className="tile">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-ll c1 trunc">Music</Text>
          <Text className="t-ls c3">1130 songs</Text></Text></Pressable><Pressable className="tile">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
          <Text className="col grow"><Text className="t-ll c1 trunc">Recordings</Text>
          <Text className="t-ls c3">18 songs</Text></Text></Pressable>
      </View></View>
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
  <View className="mnav none"><Pressable className="on"><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable className=""><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable className=""><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
