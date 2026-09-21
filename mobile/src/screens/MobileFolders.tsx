import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileFolders() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">16 · Local Music & Folders</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Local music management: storage meter, scan control, per-folder include/exclude, drop zone.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="row between none" style="height:64px;padding:0 20px;gap:10px"><Pressable className="ib none" href="M15-Settings.html" aria-label="Back"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Music folders</Text>
      <Pressable className="ib none" aria-label="Add folder"><Image source={require('../../assets/plus_2.svg')} className="ic" /></Pressable></View>
  <View className="col grow" style="overflow:hidden"><View className="col" style="padding:0 20px;gap:16px">
      <View className="surf col" style="padding:16px;gap:12px">
        <View className="row between">
          <Text className="col" style="gap:2px"><Text className="t-tm c1">Device storage</Text>
          <Text className="t-bs c3">16.7 GB of music · 2,184 songs</Text></Text>
          <Text className="t-mono-s cgold none">28%</Text>
        </View>
        <Text className="track track-gold" style="height:8px;border-radius:4px"><i style="width:28%"></i></Text>
        <View className="row g16 wrap">
          <Text className="row g6"><i className="dot" style="background:var(--gold)"></i>
            <Text className="t-bs c2">Albums</Text><Text className="t-bs c3">6.1 GB</Text></Text><Text className="row g6"><i className="dot" style="background:var(--acc)"></i>
            <Text className="t-bs c2">Downloads</Text><Text className="t-bs c3">1.4 GB</Text></Text><Text className="row g6"><i className="dot" style="background:var(--blue)"></i>
            <Text className="t-bs c2">SD card</Text><Text className="t-bs c3">8.7 GB</Text></Text>
        </View>
      </View>

      <View className="row g10">
        <Pressable className="btn btn-sm btn-gold grow"><Image source={require('../../assets/icon_98.svg')} className="ic" />Scan now</Pressable>
        <Pressable className="btn btn-sm btn-out grow"><Image source={require('../../assets/plus_4.svg')} className="ic" />Add folder</Pressable>
      </View>
      <View className="row g8 t-bs c3"><Text className="dot dot-gold"></Text>Last scan 12 min ago · 6 new songs found</View>

      <View className="col" style="gap:8px">
        <Text className="t-ov c3" style="padding-left:4px">Scanned folders</Text>
        <View className="surf col" style="padding:2px 0">
          <View className="lrow">
            <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px">
              <Text className="t-tm c1 trunc">Music/Albums</Text>
              <Text className="t-mono-s c3 trunc">/storage/emulated/0/Music/Albums</Text>
              <Text className="t-bs c3">842 songs · 6.1 GB</Text>
            </Text>
            <Pressable className="sw gold on none" aria-label="Include Music/Albums"><i></i></Pressable>
          </View><View className="lrow">
            <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px">
              <Text className="t-tm c1 trunc">Music/Downloads</Text>
              <Text className="t-mono-s c3 trunc">/storage/emulated/0/Music/Downloads</Text>
              <Text className="t-bs c3">204 songs · 1.4 GB</Text>
            </Text>
            <Pressable className="sw gold on none" aria-label="Include Music/Downloads"><i></i></Pressable>
          </View><View className="lrow">
            <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_17.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px">
              <Text className="t-tm c1 trunc">SD Card/Music</Text>
              <Text className="t-mono-s c3 trunc">/storage/sdcard1/Music</Text>
              <Text className="t-bs c3">1130 songs · 8.7 GB</Text>
            </Text>
            <Pressable className="sw gold on none" aria-label="Include SD Card/Music"><i></i></Pressable>
          </View><View className="lrow">
            <Text className="icobox "><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px">
              <Text className="t-tm c1 trunc">Recordings</Text>
              <Text className="t-mono-s c3 trunc">/storage/emulated/0/Recordings</Text>
              <Text className="t-bs c3">18 songs · 240 MB</Text>
            </Text>
            <Pressable className="sw  none" aria-label="Include Recordings"><i></i></Pressable>
          </View><View className="lrow">
            <Text className="icobox "><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow" style="gap:2px">
              <Text className="t-tm c1 trunc">WhatsApp Audio</Text>
              <Text className="t-mono-s c3 trunc">/storage/emulated/0/WhatsApp/Media</Text>
              <Text className="t-bs c3">63 songs · 310 MB</Text>
            </Text>
            <Pressable className="sw  none" aria-label="Include WhatsApp Audio"><i></i></Pressable>
          </View>
        </View>
      </View>

      <View className="col" style="gap:8px">
        <Text className="t-ov c3" style="padding-left:4px">Excluded</Text>
        <View className="empty">
      <Text className="empty-ic"><Image source={require('../../assets/icon_66.svg')} className="ic" /></Text>
      <Text className="t-tl c1">Nothing excluded</Text>
      <Text className="t-bm c2" style="max-width:300px">Turn a folder off above to keep it out of your library and search results.</Text>
      
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
