import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileSearchOffline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">04 · Search — Offline</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Search restricted to the device: local scope chips, folder results, and a separated "not on this device" block.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Pressable className="ib none" href="M02-Home-Offline.html" aria-label="Back"><Image source={require('../../assets/icon_d5a96b1c.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Search device</Text><Text className="row g6 none" style="height:26px;padding:0 9px;border-radius:999px;background:var(--goldbg);color:var(--gold)"><i className="dot dot-gold"></i><Text className="t-ls">OFFLINE</Text></Text></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="padding:0 20px;gap:16px">
      <label className="field" style="cursor:text">
        <Image source={require('../../assets/icon_dc39dd91.svg')} className="ic" />
        <input type="text" value="winter" aria-label="Search music on this device" />
        <Pressable className="ib ib-28 none" aria-label="Clear search"><Image source={require('../../assets/icon_7d106b93.svg')} className="ic" /></Pressable>
      </label>
      <View className="scrollx g8" style="margin:0 -20px;padding:0 20px">
        <Pressable className="chip chip-on" style="background:var(--goldbg2);border-color:rgba(255,194,77,.45);color:var(--gold)" href="#">All</Pressable><Pressable className="chip " style="" href="#">Songs</Pressable><Pressable className="chip " style="" href="#">Albums</Pressable><Pressable className="chip " style="" href="#">Artists</Pressable><Pressable className="chip " style="" href="#">Playlists</Pressable><Pressable className="chip " style="" href="#">Folders</Pressable>
      </View>

      <View className="offstrip">
        <Image source={require('../../assets/icon_317eccf3.svg')} className="ic" />
        <Text className="t-bs c2 grow">Local results only. Online search is off while you're in Offline Mode.</Text>
      </View>

      <View className="col" style="gap:10px">
    <View className="shead"><Text className="t-h2 c1">Songs on device</Text></View>
    <View className="col g2"><View className="srow">
      <View className="art a3 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Winter Arithmetic</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">5:08</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Winter Arithmetic"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cassette Sunday</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">2:58</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Cassette Sunday"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View></View></View>

      <View className="col" style="gap:10px">
    <View className="shead"><Text className="t-h2 c1">Folders</Text><Pressable className="row g2 t-ll c2 none" href="M16-Folders.html" style="text-decoration:none">All<Image source={require('../../assets/icon_a4e55cb2.svg')} className="ic" /></Pressable></View>
    <View className="col g2">
        <Pressable className="srow" href="M16-Folders.html" style="text-decoration:none;color:inherit">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_e5d6d392.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1 trunc">Music/Albums</Text>
          <Text className="t-bs c2">842 songs · 6.1 GB</Text></Text><Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></Pressable><Pressable className="srow" href="M16-Folders.html" style="text-decoration:none;color:inherit">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_e5d6d392.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1 trunc">SD Card/Music</Text>
          <Text className="t-bs c2">1130 songs · 8.7 GB</Text></Text><Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></Pressable>
      </View></View>

      <View className="col" style="gap:10px">
        <Text className="t-ov c3">Not on this device</Text>
        <View className="surf row g12" style="padding:14px;opacity:.65">
          <Text className="icobox"><Image source={require('../../assets/icon_80ff517a.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px">
            <Text className="t-tm c2">6 more matches on the server</Text>
            <Text className="t-bs c3">Go online to search and stream them.</Text>
          </Text>
          <Pressable className="btn btn-sm btn-out none" href="M03-Search-Online.html">Go online</Pressable>
        </View>
      </View>
    </View></View>
  <View className="mini none mini-gold">
    <Pressable className="row g12 grow" href="M10-Now-Playing-Offline.html" style="text-decoration:none;color:inherit;min-width:0">
      <View className="art a1 art-r-sm art-rings" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast</Text>
      </Text>
    </Pressable>
    <Pressable className="ib ib-32 none" aria-label="Favourite"><Image source={require('../../assets/icon_072f797d.svg')} className="ic" /></Pressable>
    <Pressable className="ib none" aria-label="Pause"><Image source={require('../../assets/icon_9ccbd552.svg')} className="ic" /></Pressable>
    <Pressable className="ib ib-32 none" aria-label="Next track"><Image source={require('../../assets/icon_feb38b39.svg')} className="ic" /></Pressable>
  </View>
  <View className="mnav none"><Pressable href="M02-Home-Offline.html" className=""><Image source={require('../../assets/icon_27111392.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className=""><Image source={require('../../assets/icon_910e2fb2.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className=""><Image source={require('../../assets/icon_1d92030b.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M04-Search-Offline.html" className="on"><Image source={require('../../assets/icon_88a5aa5a.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
