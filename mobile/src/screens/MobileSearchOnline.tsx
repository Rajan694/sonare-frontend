import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileSearchOnline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">03 · Search — Online</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Search across server + device: scope chips, top result, mixed-source song results, artists.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Pressable className="ib none" href="M01-Home-Online.html" aria-label="Back"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Search</Text><Text className="row g6 none" style="height:26px;padding:0 9px;border-radius:999px;background:var(--accbg);color:var(--acc)"><i className="dot dot-acc"></i><Text className="t-ls">ONLINE</Text></Text></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="padding:0 20px;gap:16px">
      <label className="field" style="cursor:text">
        <Image source={require('../../assets/icon_75.svg')} className="ic" />
        <input type="text" value="neon arbor" aria-label="Search all music" />
        <Pressable className="ib ib-28 none" aria-label="Clear search"><Image source={require('../../assets/icon_106.svg')} className="ic" /></Pressable>
        <Text className="vr" style="height:20px"></Text>
        <Pressable className="ib ib-28 none" aria-label="Voice search"><Image source={require('../../assets/mic.svg')} className="ic" /></Pressable>
      </label>
      <View className="scrollx g8" style="margin:0 -20px;padding:0 20px">
        <Pressable className="chip chip-on" href="#">All</Pressable><Pressable className="chip " href="#">Songs</Pressable><Pressable className="chip " href="#">Albums</Pressable><Pressable className="chip " href="#">Artists</Pressable><Pressable className="chip " href="#">Playlists</Pressable><Pressable className="chip " href="#">Genres</Pressable>
      </View>
      <View className="row g8 t-bs c3"><Image source={require('../../assets/cloud_5.svg')} className="ic" /><Text>Searching Sonare library · 1,284 results</Text></View>

      <View className="col" style="gap:10px">
        <Text className="t-ov c3">Top result</Text>
        <Pressable className="surf row g14" style="padding:12px;text-decoration:none;color:inherit" href="M06-Album.html">
          <View className="art a2 art-r-sm art-rings" style="width:76px;height:76px;"></View>
          <Text className="col grow" style="gap:4px">
            <Text className="t-tl c1 trunc">Neon Arboretum</Text>
            <Text className="t-bs c2">Album · Vela Nine · 2025</Text>
            <Text className="row g6"><Text className="badge bg-cloud"><Image source={require('../../assets/cloud_3.svg')} className="ic" />Server</Text><Text className="badge bg-neutral">9 tracks</Text></Text>
          </Text>
          <Text className="playbtn-fab"><Image source={require('../../assets/play_2.svg')} className="ic" /></Text>
        </Pressable>
      </View>

      <View className="col" style="gap:10px">
    <View className="shead"><Text className="t-h2 c1">Songs</Text><Pressable className="row g2 t-ll c2 none" href="#" style="text-decoration:none">All<Image source={require('../../assets/chevron_right.svg')} className="ic" /></Pressable></View>
    <View className="col g2"><View className="srow">
      <View className="art a2 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:15</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Static Bloom"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a2 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Nightjar</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:48</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Nightjar"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a1 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Paper Lanterns"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View></View></View>

      <View className="col" style="gap:10px">
    <View className="shead"><Text className="t-h2 c1">Artists</Text></View>
    <View className="scrollx g16" style="margin:0 -20px;padding:0 20px">
        <Text className="acard center" style="width:84px">
      <View className="art a2 art-circ art-rings" style="width:84px;height:84px;"></View>
      <Text className="col center" style="gap:2px;width:84px">
        <Text className="t-tm c1 trunc" style="max-width:84px">Vela Nine</Text>
        <Text className="t-bs c3">2 albums</Text>
      </Text>
    </Text><Text className="acard center" style="width:84px">
      <View className="art a10 art-circ art-rings" style="width:84px;height:84px;"></View>
      <Text className="col center" style="gap:2px;width:84px">
        <Text className="t-tm c1 trunc" style="max-width:84px">Mira Sound</Text>
        <Text className="t-bs c3">1 albums</Text>
      </Text>
    </Text><Text className="acard center" style="width:84px">
      <View className="art a9 art-circ art-rings" style="width:84px;height:84px;"></View>
      <Text className="col center" style="gap:2px;width:84px">
        <Text className="t-tm c1 trunc" style="max-width:84px">Ocean Bureau</Text>
        <Text className="t-bs c3">1 albums</Text>
      </Text>
    </Text></View></View>
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
  <View className="mnav none"><Pressable href="M01-Home-Online.html" className=""><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className=""><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M03-Search-Online.html" className="on"><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
