import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileSearchOnline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">03 · Search — Online</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Search across server + device: scope chips, top result, mixed-source song results, artists.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Pressable className="ib none"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Search</Text><Text className="row g6 none"><i className="dot dot-acc"></i><Text className="t-ls">ONLINE</Text></Text></View>
  <View className="col grow"><View className="col">
      <label className="field">
        <Image source={require('../../assets/icon_75.svg')} className="ic" />
        <input type="text" value="neon arbor" />
        <Pressable className="ib ib-28 none"><Image source={require('../../assets/icon_106.svg')} className="ic" /></Pressable>
        <Text className="vr"></Text>
        <Pressable className="ib ib-28 none"><Image source={require('../../assets/mic.svg')} className="ic" /></Pressable>
      </label>
      <View className="scrollx g8">
        <Pressable className="chip chip-on">All</Pressable><Pressable className="chip ">Songs</Pressable><Pressable className="chip ">Albums</Pressable><Pressable className="chip ">Artists</Pressable><Pressable className="chip ">Playlists</Pressable><Pressable className="chip ">Genres</Pressable>
      </View>
      <View className="row g8 t-bs c3"><Image source={require('../../assets/cloud_5.svg')} className="ic" /><Text>Searching Sonare library · 1,284 results</Text></View>

      <View className="col">
        <Text className="t-ov c3">Top result</Text>
        <Pressable className="surf row g14">
          <View className="art a2 art-r-sm art-rings"></View>
          <Text className="col grow">
            <Text className="t-tl c1 trunc">Neon Arboretum</Text>
            <Text className="t-bs c2">Album · Vela Nine · 2025</Text>
            <Text className="row g6"><Text className="badge bg-cloud"><Image source={require('../../assets/cloud_3.svg')} className="ic" />Server</Text><Text className="badge bg-neutral">9 tracks</Text></Text>
          </Text>
          <Text className="playbtn-fab"><Image source={require('../../assets/play_2.svg')} className="ic" /></Text>
        </Pressable>
      </View>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Songs</Text><Pressable className="row g2 t-ll c2 none">All<Image source={require('../../assets/chevron_right.svg')} className="ic" /></Pressable></View>
    <View className="col g2"><View className="srow">
      <View className="art a2 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:15</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a2 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Nightjar</Text><Text className="src src-cloud"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:48</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Paper Lanterns</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View></View></View>

      <View className="col">
    <View className="shead"><Text className="t-h2 c1">Artists</Text></View>
    <View className="scrollx g16">
        <Text className="acard center">
      <View className="art a2 art-circ art-rings"></View>
      <Text className="col center">
        <Text className="t-tm c1 trunc">Vela Nine</Text>
        <Text className="t-bs c3">2 albums</Text>
      </Text>
    </Text><Text className="acard center">
      <View className="art a10 art-circ art-rings"></View>
      <Text className="col center">
        <Text className="t-tm c1 trunc">Mira Sound</Text>
        <Text className="t-bs c3">1 albums</Text>
      </Text>
    </Text><Text className="acard center">
      <View className="art a9 art-circ art-rings"></View>
      <Text className="col center">
        <Text className="t-tm c1 trunc">Ocean Bureau</Text>
        <Text className="t-bs c3">1 albums</Text>
      </Text>
    </Text></View></View>
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
  <View className="mnav none"><Pressable className=""><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable className=""><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable className="on"><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
