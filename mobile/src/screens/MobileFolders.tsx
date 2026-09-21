import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileFolders() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">16 · Local Music & Folders</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Local music management: storage meter, scan control, per-folder include/exclude, drop zone.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="row between none"><Pressable className="ib none"><Image source={require('../../assets/icon_32.svg')} className="ic" /></Pressable>
      <Text className="t-tl c1 grow">Music folders</Text>
      <Pressable className="ib none"><Image source={require('../../assets/plus_2.svg')} className="ic" /></Pressable></View>
  <View className="col grow"><View className="col">
      <View className="surf col">
        <View className="row between">
          <Text className="col"><Text className="t-tm c1">Device storage</Text>
          <Text className="t-bs c3">16.7 GB of music · 2,184 songs</Text></Text>
          <Text className="t-mono-s cgold none">28%</Text>
        </View>
        <Text className="track track-gold"><i></i></Text>
        <View className="row g16 wrap">
          <Text className="row g6"><i className="dot"></i>
            <Text className="t-bs c2">Albums</Text><Text className="t-bs c3">6.1 GB</Text></Text><Text className="row g6"><i className="dot"></i>
            <Text className="t-bs c2">Downloads</Text><Text className="t-bs c3">1.4 GB</Text></Text><Text className="row g6"><i className="dot"></i>
            <Text className="t-bs c2">SD card</Text><Text className="t-bs c3">8.7 GB</Text></Text>
        </View>
      </View>

      <View className="row g10">
        <Pressable className="btn btn-sm btn-gold grow"><Image source={require('../../assets/icon_98.svg')} className="ic" />Scan now</Pressable>
        <Pressable className="btn btn-sm btn-out grow"><Image source={require('../../assets/plus_4.svg')} className="ic" />Add folder</Pressable>
      </View>
      <View className="row g8 t-bs c3"><Text className="dot dot-gold"></Text>Last scan 12 min ago · 6 new songs found</View>

      <View className="col">
        <Text className="t-ov c3">Scanned folders</Text>
        <View className="surf col">
          <View className="lrow">
            <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow">
              <Text className="t-tm c1 trunc">Music/Albums</Text>
              <Text className="t-mono-s c3 trunc">/storage/emulated/0/Music/Albums</Text>
              <Text className="t-bs c3">842 songs · 6.1 GB</Text>
            </Text>
            <Pressable className="sw gold on none"><i></i></Pressable>
          </View><View className="lrow">
            <Text className="icobox icobox-gold"><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow">
              <Text className="t-tm c1 trunc">Music/Downloads</Text>
              <Text className="t-mono-s c3 trunc">/storage/emulated/0/Music/Downloads</Text>
              <Text className="t-bs c3">204 songs · 1.4 GB</Text>
            </Text>
            <Pressable className="sw gold on none"><i></i></Pressable>
          </View><View className="lrow">
            <Text className="icobox icobox-gold"><Image source={require('../../assets/icon_17.svg')} className="ic" /></Text>
            <Text className="col grow">
              <Text className="t-tm c1 trunc">SD Card/Music</Text>
              <Text className="t-mono-s c3 trunc">/storage/sdcard1/Music</Text>
              <Text className="t-bs c3">1130 songs · 8.7 GB</Text>
            </Text>
            <Pressable className="sw gold on none"><i></i></Pressable>
          </View><View className="lrow">
            <Text className="icobox "><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow">
              <Text className="t-tm c1 trunc">Recordings</Text>
              <Text className="t-mono-s c3 trunc">/storage/emulated/0/Recordings</Text>
              <Text className="t-bs c3">18 songs · 240 MB</Text>
            </Text>
            <Pressable className="sw  none"><i></i></Pressable>
          </View><View className="lrow">
            <Text className="icobox "><Image source={require('../../assets/folder.svg')} className="ic" /></Text>
            <Text className="col grow">
              <Text className="t-tm c1 trunc">WhatsApp Audio</Text>
              <Text className="t-mono-s c3 trunc">/storage/emulated/0/WhatsApp/Media</Text>
              <Text className="t-bs c3">63 songs · 310 MB</Text>
            </Text>
            <Pressable className="sw  none"><i></i></Pressable>
          </View>
        </View>
      </View>

      <View className="col">
        <Text className="t-ov c3">Excluded</Text>
        <View className="empty">
      <Text className="empty-ic"><Image source={require('../../assets/icon_66.svg')} className="ic" /></Text>
      <Text className="t-tl c1">Nothing excluded</Text>
      <Text className="t-bm c2">Turn a folder off above to keep it out of your library and search results.</Text>
      
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
