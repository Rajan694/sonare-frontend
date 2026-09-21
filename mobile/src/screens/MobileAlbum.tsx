import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileAlbum() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">06 · Album</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Album detail: artwork-derived ambient background, metadata, transport row, track list.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Pressable className="ib none" href="M05-Library.html" aria-label="Back"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-ll c2 grow" style="text-align:center">Album</Text>
      <Pressable className="ib none" aria-label="More options"><Image source={require('../../assets/icon_95.svg')} className="ic" /></Pressable></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="position:relative">
      <View className="ambient" style="height:300px">
        <i style="width:280px;height:280px;left:-40px;top:-90px;background:#2A5AA8"></i>
        <i style="width:220px;height:220px;right:-50px;top:-30px;background:#6B3FA0"></i>
      </View>
      <View className="col center" style="position:relative;padding:8px 20px 0;gap:14px">
        <View className="art a1 art-r-lg art-rings" style="width:190px;height:190px;box-shadow:var(--e4)"></View>
        <View className="col center" style="gap:4px">
          <Text className="t-h1 c1" style="text-align:center">Midnight Cartography</Text>
          <Pressable className="t-tm c2" href="M07-Artist.html" style="text-decoration:none">Hollow Coast</Pressable>
          <Text className="t-bs c3">Album · 2024 · 11 songs · 48 min</Text>
        </View>
        <View className="row g10"><Text className="badge bg-local"><Image source={require('../../assets/smartphone.svg')} className="ic" />On device</Text><Text className="badge bg-neutral">FLAC · 1411 kbps</Text></View>
        <View className="row between" style="width:100%;padding-top:2px">
          <Text className="row g4">
            <Pressable className="ib ib-44" aria-label="Favourite album"><Image source={require('../../assets/icon_56.svg')} className="ic" /></Pressable>
            <Pressable className="ib ib-44" aria-label="Downloaded"><Image source={require('../../assets/icon_107.svg')} className="ic" /></Pressable>
            <Pressable className="ib ib-44" aria-label="Add to queue"><Image source={require('../../assets/playlist_add_2.svg')} className="ic" /></Pressable>
          </Text>
          <Text className="row g10">
            <Pressable className="ib ib-44 ib-bord" aria-label="Shuffle"><Image source={require('../../assets/shuffle_2.svg')} className="ic" /></Pressable>
            <Pressable className="playbtn playbtn-56" aria-label="Play album"><Image source={require('../../assets/play.svg')} className="ic" /></Pressable>
          </Text>
        </View>
      </View>
      <View className="col g2" style="padding:18px 12px 0">
        <View className="srow srow-on">
      <Text className="srow-idx"><Text className="eqbars"><i style="height:9px"></i><i style="height:14px"></i><i style="height:6px"></i><i style="height:11px"></i></Text></Text>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Paper Lanterns"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">2</Text>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:33</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Copper Wires"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">3</Text>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cartographer</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">5:16</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Cartographer"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
        <View className="srow"><Text className="srow-idx">4</Text>
          <Text className="col grow" style="gap:2px"><Text className="row g6"><Text className="t-tm c1 trunc">Tin Roof Morning</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
          <Text className="t-bs c2 trunc">Hollow Coast</Text></Text>
          <Text className="t-mono-s c3 none">4:02</Text>
          <Pressable className="ib ib-32 none" aria-label="More options"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable></View><View className="srow"><Text className="srow-idx">5</Text>
          <Text className="col grow" style="gap:2px"><Text className="row g6"><Text className="t-tm c1 trunc">North Field</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
          <Text className="t-bs c2 trunc">Hollow Coast</Text></Text>
          <Text className="t-mono-s c3 none">3:29</Text>
          <Pressable className="ib ib-32 none" aria-label="More options"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable></View><View className="srow"><Text className="srow-idx">6</Text>
          <Text className="col grow" style="gap:2px"><Text className="row g6"><Text className="t-tm c1 trunc">Signal Hill</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
          <Text className="t-bs c2 trunc">Hollow Coast</Text></Text>
          <Text className="t-mono-s c3 none">5:11</Text>
          <Pressable className="ib ib-32 none" aria-label="More options"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable></View>
      </View>
    </View></View>
  <View className="mini none mini-gold">
    <Pressable className="row g12 grow" href="M10-Now-Playing-Offline.html" style="text-decoration:none;color:inherit;min-width:0">
      <View className="art a1 art-r-sm art-rings" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
    </Pressable>
    <Pressable className="ib ib-32 none" aria-label="Favourite"><Image source={require('../../assets/icon_9.svg')} className="ic" /></Pressable>
    <Pressable className="ib none" aria-label="Pause"><Image source={require('../../assets/icon_6.svg')} className="ic" /></Pressable>
    <Pressable className="ib ib-32 none" aria-label="Next track"><Image source={require('../../assets/icon_86.svg')} className="ic" /></Pressable>
  </View>
  <View className="mnav none"><Pressable href="M02-Home-Offline.html" className=""><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className="on"><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M04-Search-Offline.html" className=""><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
