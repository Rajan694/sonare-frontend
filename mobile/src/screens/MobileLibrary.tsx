import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileLibrary() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">05 · Library</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Local library with tabs (Songs/Albums/Artists/Genres/Folders), sort control and the song list.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Text className="t-h1 c1 grow">Library</Text>
      <Text className="seg">
      <Pressable className="seg-i "><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev"><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text></View>
  <View className="col grow"><View className="col">
      <View className="tabs">
        <Pressable className="tab on">Songs</Pressable><Pressable className="tab ">Albums</Pressable><Pressable className="tab ">Artists</Pressable><Pressable className="tab ">Genres</Pressable><Pressable className="tab ">Folders</Pressable>
      </View>
      <View className="row between">
        <Pressable className="chip chip-sm"><Image source={require('../../assets/icon_48.svg')} className="ic" />Recently added<Image source={require('../../assets/icon_30.svg')} className="ic" /></Pressable>
        <Text className="row g4">
          <Pressable className="ib ib-32"><Image source={require('../../assets/icon_51.svg')} className="ic" /></Pressable>
          <Pressable className="ib ib-32 ib-on"><Image source={require('../../assets/icon_96.svg')} className="ic" /></Pressable>
          <Pressable className="ib ib-32"><Image source={require('../../assets/grid_2.svg')} className="ic" /></Pressable>
        </Text>
      </View>
      <View className="row g10">
        <Pressable className="btn btn-sm btn-acc"><Image source={require('../../assets/play_4.svg')} className="ic" />Play all</Pressable>
        <Pressable className="btn btn-sm btn-out"><Image source={require('../../assets/shuffle.svg')} className="ic" />Shuffle</Pressable>
        <Text className="t-bs c3 grow">2,184 songs</Text>
      </View>
      <View className="col g2">
        <View className="srow srow-on">
      <View className="art a1 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
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
        <Text className="row g6"><Text className="t-tm c1 trunc">Winter Arithmetic</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">5:08</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a7 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Glass Houses</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Anais Ferrow · Quiet Riot Act</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:55</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a6 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Ferrous</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Kite &amp; Anchor · Tidal Drift</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:18</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a4 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Half-Light</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Mara Vel · Salt &amp; Signal</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:02</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm"></View>
      <Text className="col grow">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cassette Sunday</Text><Text className="src src-local"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">2:58</Text>
      <Pressable className="ib ib-32 none"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
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
  <View className="mnav none"><Pressable className=""><Image source={require('../../assets/home.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable className="on"><Image source={require('../../assets/library.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable className=""><Image source={require('../../assets/playlist.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable className=""><Image source={require('../../assets/icon_76.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
