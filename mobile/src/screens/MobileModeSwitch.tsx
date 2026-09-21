import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileModeSwitch() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back">&larr; All screens</Pressable>
  <Text className="sa-title">14 · Mode Switch</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">The Online→Offline switch interaction: confirmation surface listing exactly what stays and what is hidden, plus the resulting toast.</Text>
<View className="sa-frame">
<View className="scr col">
  <View className="col">
    <View className="row between none"><Text className="seg">
      <Pressable className="seg-i seg-on-cloud"><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i "><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text><Text className="row g4 none"><Text className="ib"><Image source={require('../../assets/icon_83.svg')} className="ic" /></Text><Text className="ib"><Image source={require('../../assets/icon_47.svg')} className="ic" /></Text><Pressable className="ib ib-32 none">
      <Text className="art a5 art-circ"></Text></Pressable></Text></View>
    <View className="col">
      <View className="col"><Text className="t-bs c3">Thursday evening</Text><Text className="t-h1 c1">Welcome back, Rajan</Text></View>
      <View className="surf row g14"><View className="art a1 art-r-sm art-rings"></View>
        <Text className="col grow"><Text className="t-ov c3">Continue listening</Text>
        <Text className="t-tm c1">Paper Lanterns</Text><Text className="row g8"><Text className="track"><i></i><b></b></Text></Text></Text></View>
      <View className="grid">
        <Text className="tile"><View className="art a2 art-r-sm"></View>
          <Text className="col grow"><Text className="t-ll c1 trunc">Static Bloom</Text>
          <Text className="t-ls c3 trunc">Vela Nine</Text></Text></Text><Text className="tile"><View className="art a3 art-r-sm"></View>
          <Text className="col grow"><Text className="t-ll c1 trunc">Winter Arithmetic</Text>
          <Text className="t-ls c3 trunc">The Orchard Machine</Text></Text></Text><Text className="tile"><View className="art a4 art-r-sm"></View>
          <Text className="col grow"><Text className="t-ll c1 trunc">Undertow</Text>
          <Text className="t-ls c3 trunc">Mara Vel</Text></Text></Text><Text className="tile"><View className="art a7 art-r-sm"></View>
          <Text className="col grow"><Text className="t-ll c1 trunc">Glass Houses</Text>
          <Text className="t-ls c3 trunc">Anais Ferrow</Text></Text></Text>
      </View>
    </View>
  </View>

  <View className="scrim"></View>

  <View className="row g10">
    <Text className="dot dot-gold"></Text>
    <Text className="col grow">
      <Text className="t-ll cgold">Switched to Offline Mode</Text>
      <Text className="t-bs c2">Server content hidden. Playback continues from this device.</Text>
    </Text>
    <Pressable className="ib ib-28 none"><Image source={require('../../assets/icon_106.svg')} className="ic" /></Pressable>
  </View>

  <View className="sheet col">
    <Text className="grab"></Text>
    <View className="col center">
      <Text className="seg seg-lg">
      <Pressable className="seg-i "><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev"><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text>
      <Text className="t-h2 c1">Switch to Offline Mode?</Text>
      <Text className="t-bm c2">Sonare will use only the music stored on this device. Nothing is fetched from the server.</Text>
    </View>

    <View className="inset col">
      <Text className="t-ov c3">Stays available</Text>
      <Text className="row g10">
        <Text className="src src-local"><Image source={require('../../assets/icon.svg')} className="ic" /></Text>
        <Text className="t-bs c1 grow">2,184 songs stored on this device</Text><Image source={require('../../assets/icon_91.svg')} className="ic" /></Text><Text className="row g10">
        <Text className="src src-local"><Image source={require('../../assets/folder_2.svg')} className="ic" /></Text>
        <Text className="t-bs c1 grow">5 music folders and all local playlists</Text><Image source={require('../../assets/icon_91.svg')} className="ic" /></Text><Text className="row g10">
        <Text className="src src-local"><Image source={require('../../assets/heart_3.svg')} className="ic" /></Text>
        <Text className="t-bs c1 grow">Favourites, play counts and history</Text><Image source={require('../../assets/icon_91.svg')} className="ic" /></Text>
      <Text className="hr"></Text>
      <Text className="t-ov c3">Hidden while offline</Text>
      <Text className="row g10">
        <Text className="src"><Image source={require('../../assets/cloud_6.svg')} className="ic" /></Text>
        <Text className="t-bs c3 grow">Server library, recommendations and trending</Text><Image source={require('../../assets/icon_34.svg')} className="ic" /></Text><Text className="row g10">
        <Text className="src"><Image source={require('../../assets/icon_3.svg')} className="ic" /></Text>
        <Text className="t-bs c3 grow">Online search results</Text><Image source={require('../../assets/icon_34.svg')} className="ic" /></Text><Text className="row g10">
        <Text className="src"><Image source={require('../../assets/sync.svg')} className="ic" /></Text>
        <Text className="t-bs c3 grow">Playlist sync with your account</Text><Image source={require('../../assets/icon_34.svg')} className="ic" /></Text>
    </View>

    <label className="row g10">
      <Text className="sw none" aria-hidden={true}><i></i></Text>
      <Text className="col grow"><Text className="t-tm c1">Stay offline until I switch back</Text>
      <Text className="t-bs c3">Otherwise Sonare reconnects when Wi-Fi returns</Text></Text>
    </label>

    <View className="row g10">
      <Pressable className="btn btn-lg btn-out grow">Cancel</Pressable>
      <Pressable className="btn btn-lg btn-gold grow"><Image source={require('../../assets/smartphone_2.svg')} className="ic" />Go offline</Pressable>
    </View>
  </View>
</View>
</View>

    </>
  );
}
