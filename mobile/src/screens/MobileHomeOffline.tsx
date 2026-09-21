import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileHomeOffline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">02 · Home — Offline</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Home in Offline Mode: offline banner, resume-from-device, local albums, folder shortcuts. All server sections removed.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Text className="seg">
      <Pressable className="seg-i " href="M01-Home-Online.html" aria-current="false"><Image source={require('../../assets/icon_dbb4a7b2.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev" href="M02-Home-Offline.html" aria-current="true"><Image source={require('../../assets/icon_eca8a722.svg')} className="ic" />Offline</Pressable>
    </Text>
      <Text className="row g4 none">
        <Pressable className="ib" href="M04-Search-Offline.html" aria-label="Search this device"><Image source={require('../../assets/icon_1cbd1416.svg')} className="ic" /></Pressable>
        <Pressable className="ib" href="M16-Folders.html" aria-label="Music folders"><Image source={require('../../assets/icon_47b108d3.svg')} className="ic" /></Pressable>
        <Pressable className="ib ib-32 none" aria-label="Your profile" style="padding:0">
      <Text className="art a5 art-circ" style="width:30px;height:30px;display:block"></Text></Pressable>
      </Text></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="padding:4px 20px 0;gap:22px">
      <View className="offstrip">
        <Image source={require('../../assets/icon_689fb576.svg')} className="ic" />
        <Text className="col grow" style="gap:1px">
          <Text className="t-ll" style="color:var(--gold)">You're offline</Text>
          <Text className="t-bs c2">Showing the 2,184 songs stored on this device.</Text>
        </Text>
      </View>

      <Pressable className="surf row g14" style="padding:12px;text-decoration:none;color:inherit" href="M10-Now-Playing-Offline.html">
        <View className="art a1 art-r-sm art-rings" style="width:68px;height:68px;"></View>
        <Text className="col grow" style="gap:6px">
          <Text className="t-ov c3">Resume · on device</Text>
          <Text className="t-tm c1 trunc">Paper Lanterns</Text>
          <Text className="row g8"><Text className="track track-gold" style=""><i style="width:38%"></i><b style="left:38%"></b></Text><Text className="t-mono-s c3 none">1:24</Text></Text>
        </Text>
        <Text className="playbtn-fab" style="background:var(--gold);box-shadow:var(--glow-g)"><Image source={require('../../assets/icon_70d425db.svg')} className="ic" /></Text>
      </Pressable>

      <View className="col" style="gap:12px">
    <View className="shead"><Text className="t-h2 c1">Recently played</Text></View>
    <View className="col g2">
        <View className="srow">
      <View className="art a1 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:33</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Copper Wires"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a3 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Cassette Sunday</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">2:58</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Cassette Sunday"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a7 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Glass Houses</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Anais Ferrow · Quiet Riot Act</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:55</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Glass Houses"><Image source={require('../../assets/icon_58f52c4d.svg')} className="ic" /></Pressable>
    </View></View></View>

      <View className="col" style="gap:12px">
    <View className="shead"><Text className="t-h2 c1">Albums on device</Text><Pressable className="row g2 t-ll c2 none" href="M05-Library.html" style="text-decoration:none">All<Image source={require('../../assets/icon_a4e55cb2.svg')} className="ic" /></Pressable></View>
    <View className="scrollx g12" style="margin:0 -20px;padding:0 20px"><Pressable className="acard" style="width:132px" href="M06-Album.html">
      <View className="art a1 art-r-md art-rings" style="width:132px;height:132px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:132px">Midnight Cartography</Text>
        <Text className="t-bs c2 trunc" style="width:132px">Hollow Coast</Text>
      </Text>
    </Pressable><Pressable className="acard" style="width:132px" href="M06-Album.html">
      <View className="art a3 art-r-md art-rings" style="width:132px;height:132px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:132px">Slow Frequencies</Text>
        <Text className="t-bs c2 trunc" style="width:132px">The Orchard Machine</Text>
      </Text>
    </Pressable><Pressable className="acard" style="width:132px" href="M06-Album.html">
      <View className="art a7 art-r-md art-rings" style="width:132px;height:132px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:132px">Quiet Riot Act</Text>
        <Text className="t-bs c2 trunc" style="width:132px">Anais Ferrow</Text>
      </Text>
    </Pressable><Pressable className="acard" style="width:132px" href="M06-Album.html">
      <View className="art a6 art-r-md art-rings" style="width:132px;height:132px;"></View>
      <Text className="col" style="gap:2px">
        <Text className="t-tm c1 trunc" style="width:132px">Tidal Drift</Text>
        <Text className="t-bs c2 trunc" style="width:132px">Kite &amp; Anchor</Text>
      </Text>
    </Pressable></View></View>

      <View className="col" style="gap:12px">
    <View className="shead"><Text className="t-h2 c1">Your folders</Text><Pressable className="row g2 t-ll c2 none" href="M16-Folders.html" style="text-decoration:none">All<Image source={require('../../assets/icon_a4e55cb2.svg')} className="ic" /></Pressable></View>
    <View className="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        <Pressable className="tile" href="M16-Folders.html">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_e5d6d392.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Albums</Text>
          <Text className="t-ls c3">842 songs</Text></Text></Pressable><Pressable className="tile" href="M16-Folders.html">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_e5d6d392.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Downloads</Text>
          <Text className="t-ls c3">204 songs</Text></Text></Pressable><Pressable className="tile" href="M16-Folders.html">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_e5d6d392.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Music</Text>
          <Text className="t-ls c3">1130 songs</Text></Text></Pressable><Pressable className="tile" href="M16-Folders.html">
          <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_e5d6d392.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:1px"><Text className="t-ll c1 trunc">Recordings</Text>
          <Text className="t-ls c3">18 songs</Text></Text></Pressable>
      </View></View>
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
  <View className="mnav none"><Pressable href="M02-Home-Offline.html" className="on"><Image source={require('../../assets/icon_27111392.svg')} className="ic" /><Text>Home</Text></Pressable><Pressable href="M05-Library.html" className=""><Image source={require('../../assets/icon_910e2fb2.svg')} className="ic" /><Text>Library</Text></Pressable><Pressable href="M08-Playlist.html" className=""><Image source={require('../../assets/icon_1d92030b.svg')} className="ic" /><Text>Playlists</Text></Pressable><Pressable href="M04-Search-Offline.html" className=""><Image source={require('../../assets/icon_88a5aa5a.svg')} className="ic" /><Text>Search</Text></Pressable></View>
</View>
</View>

    </>
  );
}
