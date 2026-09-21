import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileHomeOnline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">01 · Home — Online</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Home in Online Mode: greeting, continue-listening card, jump-back-in grid, recommendations, trending.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Text className="seg">
      <Pressable className="seg-i seg-on-cloud" href="M01-Home-Online.html" aria-current="true"><Image source={require('../../assets/icon_dbb4a7b2.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i " href="M02-Home-Offline.html" aria-current="false"><Image source={require('../../assets/icon_eca8a722.svg')} className="ic" />Offline</Pressable>
    </Text>
      <Text className="row g4 none">
        <Pressable className="ib" href="M03-Search-Online.html" aria-label="Search"><Image source={require('../../assets/icon_1cbd1416.svg')} className="ic" /></Pressable>
        <Pressable className="ib" href="M15-Settings.html" aria-label="Settings"><Image source={require('../../assets/icon_e1f0f7c5.svg')} className="ic" /></Pressable>
        <Pressable className="ib ib-32 none" aria-label="Your profile" style="padding:0">
      <Text className="art a5 art-circ" style="width:30px;height:30px;display:block"></Text></Pressable>
      </Text></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="padding:4px 20px 0;gap:22px">
      <View className="col" style="gap:2px">
        <Text className="t-bs c3">Thursday evening</Text>
        <Text className="t-h1 c1">Welcome back, Rajan</Text>
      </View>

      <Pressable className="surf row g14" style="padding:12px;text-decoration:none;color:inherit" href="M09-Now-Playing-Online.html">
        <View className="art a1 art-r-sm art-rings" style="width:68px;height:68px;"></View>
        <Text className="col grow" style="gap:6px">
          <Text className="t-ov c3">Continue listening</Text>
          <Text className="t-tm c1 trunc">Paper Lanterns</Text>
          <Text className="row g8"><Text className="track" style=""><i style="width:38%"></i><b style="left:38%"></b></Text><Text className="t-mono-s c3 none">1:24</Text></Text>
        </Text>
        <Text className="playbtn-fab"><Image source={require('../../assets/icon_70d425db.svg')} className="ic" /></Text>
      </Pressable>

      <View className="col" style="gap:12px">
    <View className="shead"><Text className="t-h2 c1">Jump back in</Text></View>
    <View className="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        <Pressable className="tile" href="M06-Album.html"><View className="art a2 art-r-sm" style="width:40px;height:40px;"></View>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Static Bloom</Text>
          <Text className="t-ls c3 trunc">Vela Nine</Text></Text></Pressable><Pressable className="tile" href="M06-Album.html"><View className="art a3 art-r-sm" style="width:40px;height:40px;"></View>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Winter Arithmetic</Text>
          <Text className="t-ls c3 trunc">The Orchard Machine</Text></Text></Pressable><Pressable className="tile" href="M06-Album.html"><View className="art a4 art-r-sm" style="width:40px;height:40px;"></View>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Undertow</Text>
          <Text className="t-ls c3 trunc">Mara Vel</Text></Text></Pressable><Pressable className="tile" href="M06-Album.html"><View className="art a7 art-r-sm" style="width:40px;height:40px;"></View>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Glass Houses</Text>
          <Text className="t-ls c3 trunc">Anais Ferrow</Text></Text></Pressable>
      </View></View>

      <View className="col" style="gap:12px">
    <View className="shead"><Text className="t-h2 c1">Made for you</Text><Pressable className="row g2 t-ll c2 none" href="M05-Library.html" style="text-decoration:none">All<Image source={require('../../assets/icon_a4e55cb2.svg')} className="ic" /></Pressable></View>
    <View className="scrollx g12" style="margin:0 -20px;padding:0 20px"><Pressable className="acard" style="width:132px" href="M06-Album.html">
      <View className="art a2 art-r-md art-rings" style="width:132px;height:132px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:132px">Neon Arboretum</Text>
        <Text className="t-bs c2 trunc" style="width:132px">Vela Nine</Text>
      </Text>
    </Pressable><Pressable className="acard" style="width:132px" href="M06-Album.html">
      <View className="art a5 art-r-md art-rings" style="width:132px;height:132px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:132px">Parallax</Text>
        <Text className="t-bs c2 trunc" style="width:132px">Sundial Theory</Text>
      </Text>
    </Pressable><Pressable className="acard" style="width:132px" href="M06-Album.html">
      <View className="art a10 art-r-md art-rings" style="width:132px;height:132px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:132px">Velvet Static</Text>
        <Text className="t-bs c2 trunc" style="width:132px">Mira Sound</Text>
      </Text>
    </Pressable><Pressable className="acard" style="width:132px" href="M06-Album.html">
      <View className="art a9 art-r-md art-rings" style="width:132px;height:132px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:132px">Fathom Line</Text>
        <Text className="t-bs c2 trunc" style="width:132px">Ocean Bureau</Text>
      </Text>
    </Pressable></View></View>

      <View className="col" style="gap:12px">
    <View className="shead"><Text className="t-h2 c1">Trending now</Text><Pressable className="row g2 t-ll c2 none" href="M03-Search-Online.html" style="text-decoration:none">All<Image source={require('../../assets/icon_a4e55cb2.svg')} className="ic" /></Pressable></View>
    <View className="col g2">
        <View className="srow">
      <Text className="srow-idx">1</Text><View className="art a2 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/icon_50979100.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:15</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Static Bloom"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">2</Text><View className="art a5 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Low Orbit</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/icon_50979100.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Sundial Theory · Parallax</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">6:02</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Low Orbit"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <Text className="srow-idx">3</Text><View className="art a10 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Velvet Static</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/icon_50979100.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Mira Sound · Velvet Static</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:51</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Velvet Static"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View>
      </View></View>
    </View></View>
  <View className="mini none">
    <Pressable className="row g12 grow" href="M09-Now-Playing-Online.html" style="text-decoration:none;color:inherit;min-width:0">
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
  <View className="mnav none"><Pressable href="M01-Home-Online.html" className="on"><Image source={require('../../assets/icon_27111392.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className=""><Image source={require('../../assets/icon_910e2fb2.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className=""><Image source={require('../../assets/icon_1d92030b.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M03-Search-Online.html" className=""><Image source={require('../../assets/icon_88a5aa5a.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
