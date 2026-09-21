import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileArtist() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">07 · Artist</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Artist detail: circular hero, follow state, popular tracks with play counts, album shelf.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Pressable className="ib none" href="M06-Album.html" aria-label="Back"><Image source={require('../../assets/icon_d5a96b1c.svg')} className="ic" /></Pressable>
      <Text className="t-ll c2 grow" style="text-align:center">Artist</Text>
      <Pressable className="ib none" aria-label="More options"><Image source={require('../../assets/icon_4eb1b58e.svg')} className="ic" /></Pressable></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="position:relative">
      <View className="ambient" style="height:260px">
        <i style="width:260px;height:260px;left:60px;top:-110px;background:#2A5AA8"></i>
        <i style="width:200px;height:200px;right:-40px;top:-20px;background:#0F7A5E"></i>
      </View>
      <View className="col center" style="position:relative;padding:6px 20px 0;gap:12px">
        <View className="art a1 art-circ art-rings" style="width:128px;height:128px;box-shadow:var(--e4)"></View>
        <View className="col center" style="gap:4px">
          <Text className="t-h1 c1">Hollow Coast</Text>
          <Text className="t-bs c3">3 albums on device · 1 streaming · 14,208 plays</Text>
        </View>
        <View className="row g10">
          <Pressable className="btn btn-sm btn-out"><Image source={require('../../assets/icon_37f02a23.svg')} className="ic" />Following</Pressable>
          <Pressable className="ib ib-40 ib-bord" aria-label="Shuffle"><Image source={require('../../assets/icon_7cab7c15.svg')} className="ic" /></Pressable>
          <Pressable className="playbtn playbtn-48" aria-label="Play artist"><Image source={require('../../assets/icon_d1601434.svg')} className="ic" /></Pressable>
        </View>
      </View>
      <View className="col" style="padding:20px 20px 0;gap:18px">
        <View className="col" style="gap:10px">
    <View className="shead"><Text className="t-h2 c1">Popular</Text></View>
    <View className="col g2" style="margin:0 -8px">
          <View className="srow">
      <Text className="srow-idx">1</Text><View className="art a1 art-r-sm" style="width:40px;height:40px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">142 plays</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Paper Lanterns"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">2</Text><View className="art a1 art-r-sm" style="width:40px;height:40px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">97 plays</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:33</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Copper Wires"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">3</Text><View className="art a1 art-r-sm" style="width:40px;height:40px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cartographer</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">61 plays</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">5:16</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Cartographer"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View>
        </View></View>
        <View className="col" style="gap:10px">
    <View className="shead"><Text className="t-h2 c1">Albums</Text><Pressable className="row g2 t-ll c2 none" href="#" style="text-decoration:none">All<Image source={require('../../assets/icon_a4e55cb2.svg')} className="ic" /></Pressable></View>
    <View className="scrollx g12" style="margin:0 -20px;padding:0 20px">
          <Pressable className="acard" style="width:124px" href="M06-Album.html">
      <View className="art a1 art-r-md art-rings" style="width:124px;height:124px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:124px">Midnight Cartography</Text>
        <Text className="t-bs c2 trunc" style="width:124px">Hollow Coast</Text>
      </Text>
    </Pressable><Pressable className="acard" style="width:124px" href="M06-Album.html">
      <View className="art a5 art-r-md art-rings" style="width:124px;height:124px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:124px">Parallax</Text>
        <Text className="t-bs c2 trunc" style="width:124px">Sundial Theory</Text>
      </Text>
    </Pressable><Pressable className="acard" style="width:124px" href="M06-Album.html">
      <View className="art a9 art-r-md art-rings" style="width:124px;height:124px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:124px">Fathom Line</Text>
        <Text className="t-bs c2 trunc" style="width:124px">Ocean Bureau</Text>
      </Text>
    </Pressable>
        </View></View>
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
  <View className="mnav none"><Pressable href="M02-Home-Offline.html" className=""><Image source={require('../../assets/icon_27111392.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className="on"><Image source={require('../../assets/icon_910e2fb2.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className=""><Image source={require('../../assets/icon_1d92030b.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M04-Search-Offline.html" className=""><Image source={require('../../assets/icon_88a5aa5a.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
