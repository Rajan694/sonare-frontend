import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobilePlaylist() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">08 · Playlist</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Playlist detail with local/synced badges, download state and drag-to-reorder tracks.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Pressable className="ib none" href="M05-Library.html" aria-label="Back"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-ll c2 grow" style="text-align:center">Playlist</Text>
      <Text className="row g2 none">
        <Pressable className="ib" aria-label="Edit playlist"><Image source={require('../../assets/icon_39.svg')} className="ic" /></Pressable>
        <Pressable className="ib" aria-label="More options"><Image source={require('../../assets/icon_95.svg')} className="ic" /></Pressable>
      </Text></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="position:relative">
      <View className="ambient" style="height:240px"><i style="width:240px;height:240px;left:20px;top:-100px;background:#2A5AA8"></i>
        <i style="width:200px;height:200px;right:-30px;top:-40px;background:#A8365A"></i></View>
      <View className="rowt g16" style="position:relative;padding:8px 20px 0">
        <View className="art a1 art-r-lg art-rings" style="width:138px;height:138px;box-shadow:var(--e4)"></View>
        <View className="col grow" style="gap:8px">
          <Text className="t-h1 c1">Late Drive</Text>
          <Text className="t-bs c2">42 songs · 2 hr 51 min</Text>
          <Text className="t-bs c3">Made by you · updated 2 days ago</Text>
          <View className="row g6 wrap"><Text className="badge bg-local"><Image source={require('../../assets/smartphone.svg')} className="ic" />On device</Text><Text className="badge bg-dl"><Image source={require('../../assets/sync_2.svg')} className="ic" />Synced</Text></View>
        </View>
      </View>
      <View className="row between" style="padding:18px 20px 0">
        <Text className="row g4">
          <Pressable className="ib ib-44" aria-label="Favourite playlist"><Image source={require('../../assets/heart.svg')} className="ic" /></Pressable>
          <Pressable className="ib ib-44" aria-label="Download playlist"><Image source={require('../../assets/download.svg')} className="ic" /></Pressable>
          <Pressable className="ib ib-44" aria-label="Share playlist"><Image source={require('../../assets/icon_27.svg')} className="ic" /></Pressable>
        </Text>
        <Text className="row g10">
          <Pressable className="ib ib-44 ib-bord" aria-label="Shuffle"><Image source={require('../../assets/shuffle_2.svg')} className="ic" /></Pressable>
          <Pressable className="playbtn playbtn-56" aria-label="Play playlist"><Image source={require('../../assets/play.svg')} className="ic" /></Pressable>
        </Text>
      </View>
      <View className="row between" style="padding:16px 20px 6px">
        <Pressable className="chip chip-sm"><Image source={require('../../assets/icon_48.svg')} className="ic" />Custom order<Image source={require('../../assets/icon_30.svg')} className="ic" /></Pressable>
        <Text className="t-bs c3">Drag to reorder</Text>
      </View>
      <View className="col g2" style="padding:0 12px">
        <View className="srow srow-on">
      <View className="art a1 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      <Text className="t-mono-s c3 none">3:42</Text>
            <Pressable className="ib ib-32 none drag" aria-label="Reorder Paper Lanterns"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a2 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      <Text className="t-mono-s c3 none">4:15</Text>
            <Pressable className="ib ib-32 none drag" aria-label="Reorder Static Bloom"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Winter Arithmetic</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      <Text className="t-mono-s c3 none">5:08</Text>
            <Pressable className="ib ib-32 none drag" aria-label="Reorder Winter Arithmetic"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a4 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Undertow</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Mara Vel · Salt &amp; Signal</Text>
      </Text>
      <Text className="t-mono-s c3 none">3:27</Text>
            <Pressable className="ib ib-32 none drag" aria-label="Reorder Undertow"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a6 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Ferrous</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Kite &amp; Anchor · Tidal Drift</Text>
      </Text>
      <Text className="t-mono-s c3 none">3:18</Text>
            <Pressable className="ib ib-32 none drag" aria-label="Reorder Ferrous"><Image source={require('../../assets/icon_70.svg')} className="ic" /></Pressable>
    </View>
      </View>
    </View></View>
  <View className="mini none">
    <Pressable className="row g12 grow" href="M09-Now-Playing-Online.html" style="text-decoration:none;color:inherit;min-width:0">
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
  <View className="mnav none"><Pressable href="M01-Home-Online.html" className=""><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className=""><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className="on"><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M03-Search-Online.html" className=""><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
