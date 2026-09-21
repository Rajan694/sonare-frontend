import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileLibrary() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">05 · Library</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Local library with tabs (Songs/Albums/Artists/Genres/Folders), sort control and the song list.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Text className="t-h1 c1 grow">Library</Text>
      <Text className="seg">
      <Pressable className="seg-i " href="M01-Home-Online.html" aria-current="false"><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev" href="M02-Home-Offline.html" aria-current="true"><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="gap:0">
      <View className="tabs" style="padding:0 14px">
        <Pressable className="tab on" href="#">Songs</Pressable><Pressable className="tab " href="#">Albums</Pressable><Pressable className="tab " href="#">Artists</Pressable><Pressable className="tab " href="#">Genres</Pressable><Pressable className="tab " href="#">Folders</Pressable>
      </View>
      <View className="row between" style="padding:12px 20px 8px">
        <Pressable className="chip chip-sm"><Image source={require('../../assets/icon_48.svg')} className="ic" />Recently added<Image source={require('../../assets/icon_30.svg')} className="ic" /></Pressable>
        <Text className="row g4">
          <Pressable className="ib ib-32" aria-label="Filter"><Image source={require('../../assets/icon_51.svg')} className="ic" /></Pressable>
          <Pressable className="ib ib-32 ib-on" aria-label="List view"><Image source={require('../../assets/icon_96.svg')} className="ic" /></Pressable>
          <Pressable className="ib ib-32" aria-label="Grid view"><Image source={require('../../assets/grid_2.svg')} className="ic" /></Pressable>
        </Text>
      </View>
      <View className="row g10" style="padding:0 20px 10px">
        <Pressable className="btn btn-sm btn-acc" href="M10-Now-Playing-Offline.html"><Image source={require('../../assets/play_4.svg')} className="ic" />Play all</Pressable>
        <Pressable className="btn btn-sm btn-out"><Image source={require('../../assets/shuffle.svg')} className="ic" />Shuffle</Pressable>
        <Text className="t-bs c3 grow" style="text-align:right">2,184 songs</Text>
      </View>
      <View className="col g2" style="padding:0 12px">
        <View className="srow srow-on">
      <View className="art a1 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Paper Lanterns"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a1 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:33</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Copper Wires"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Winter Arithmetic</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">5:08</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Winter Arithmetic"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a7 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Glass Houses</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Anais Ferrow · Quiet Riot Act</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:55</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Glass Houses"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a6 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Ferrous</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Kite &amp; Anchor · Tidal Drift</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:18</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Ferrous"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a4 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Half-Light</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Mara Vel · Salt &amp; Signal</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:02</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Half-Light"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cassette Sunday</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">2:58</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Cassette Sunday"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
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
