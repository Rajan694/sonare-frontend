import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileHomeOnline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">01 · Home — Online</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Home in Online Mode: greeting, continue-listening card, jump-back-in grid, recommendations, trending.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Text className="seg">
      <Pressable className="seg-i seg-on-cloud"><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i "><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text>
      <Text className="row g4 none">
        <Pressable className="ib"><Image source={require('../../assets/icon_83.svg')} className="ic" /></Pressable>
        <Pressable className="ib"><Image source={require('../../assets/icon_47.svg')} className="ic" /></Pressable>
        <Pressable className="ib ib-32 none">
      <Text className="art a5 art-circ"></Text></Pressable>
      </Text></View>
  <View className="col grow"><View className="col">
      <View className="col">
        <Text className="t-bs c3">Thursday evening</Text>
        <Text className="t-h1 c1">Welcome back, Rajan</Text>
      </View>

      <Pressable className="surf row g14">
        <View className="art a1 art-r-sm art-rings"></View>
        <Text className="col grow">
          <Text className="t-ov c3">Continue listening</Text>
          <Text className="t-tm c1 trunc">Paper Lanterns</Text>
          <Text className="row g8"><Text className="track"><i></i><b></b></Text><Text className="t-mono-s c3 none">1:24</Text></Text>
        </Text>
        <Text className="playbtn-fab"><Image source={require('../../assets/play_2.svg')} className="ic" /></Text>
      </Pressable>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Jump back in</Text></View>
    <View className="grid">
        <Pressable className="tile"><View className="art a2 art-r-sm"></View>
          <Text className="col grow"><Text className="t-ll c1 trunc">Static Bloom</Text>
          <Text className="t-ls c3 trunc">Vela Nine</Text></Text></Pressable><Pressable className="tile"><View className="art a3 art-r-sm"></View>
          <Text className="col grow"><Text className="t-ll c1 trunc">Winter Arithmetic</Text>
          <Text className="t-ls c3 trunc">The Orchard Machine</Text></Text></Pressable><Pressable className="tile"><View className="art a4 art-r-sm"></View>
          <Text className="col grow"><Text className="t-ll c1 trunc">Undertow</Text>
          <Text className="t-ls c3 trunc">Mara Vel</Text></Text></Pressable><Pressable className="tile"><View className="art a7 art-r-sm"></View>
          <Text className="col grow"><Text className="t-ll c1 trunc">Glass Houses</Text>
          <Text className="t-ls c3 trunc">Anais Ferrow</Text></Text></Pressable>
      </View></View>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Made for you</Text><Pressable className="row g2 t-ll c2 none">All<Image source={require('../../assets/chevron_right.svg')} className="ic" /></Pressable></View>
    <View className="scrollx g12"><Pressable className="acard">
      <View className="art a2 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Neon Arboretum</Text>
        <Text className="t-bs c2 trunc">Vela Nine</Text>
      </Text>
    </Pressable><Pressable className="acard">
      <View className="art a5 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Parallax</Text>
        <Text className="t-bs c2 trunc">Sundial Theory</Text>
      </Text>
    </Pressable><Pressable className="acard">
      <View className="art a10 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Velvet Static</Text>
        <Text className="t-bs c2 trunc">Mira Sound</Text>
      </Text>
    </Pressable><Pressable className="acard">
      <View className="art a9 art-r-md art-rings"></View>
      <Text className="col">
        <Text className="t-tm c1 trunc">Fathom Line</Text>
        <Text className="t-bs c2 trunc">Ocean Bureau</Text>
      </Text>
    </Pressable></View></View>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Trending now</Text><Pressable className="row g2 t-ll c2 none">All<Image source={require('../../assets/chevron_right.svg')} className="ic" /></Pressable></View>
    <View className="col g2">
        <View className="srow">
      <Text className="srow-idx">1</Text><View className="art a2 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:15</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">2</Text><View className="art a5 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Low Orbit</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Sundial Theory · Parallax</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">6:02</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">3</Text><View className="art a10 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Velvet Static</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Mira Sound · Velvet Static</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:51</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
      </View></View>
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
  <View className="mnav none"><Pressable className="on"><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable className=""><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable className=""><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
