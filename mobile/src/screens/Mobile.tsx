import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function Mobile() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">Sonare — Cover & principles</Text>
  <Text className="sa-meta">Foundations & components &middot; 1280 &times; 1080</Text>
</header>
<Text className="sa-note">Cover: product thesis, the source language (green = server, gold = on device), and the waveform seek rail.</Text>
<View className="sa-frame" style="width:1280px;height:1080px">
<View className="scr col" style="width:1280px;height:1080px;padding:56px 56px 0;gap:38px">
    <View className="row between none">
      <View className="row g14 none">
        <Text className="row center none" style="width:52px;height:52px;border-radius:16px;background:var(--acc);color:#000;box-shadow:var(--glow-s)"><Image source={require('../../assets/music.svg')} className="ic" /></Text>
        <View className="col" style="gap:2px">
          <Text className="t-dis c1" style="letter-spacing:-1.2px">Sonare</Text>
          <Text className="t-ov c3">Offline-first music player · design system v1.0</Text>
        </View>
      </View>
      <View className="row g10 none"><Text className="seg seg-lg">
      <Pressable className="seg-i seg-on-cloud" href="#" aria-current="true"><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i " href="#" aria-current="false"><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text><Text className="seg seg-lg">
      <Pressable className="seg-i " href="#" aria-current="false"><Image source={require('../../assets/cloud_5.svg')} className="ic" />Online</Pressable>
      <Pressable className="seg-i seg-on-dev" href="#" aria-current="true"><Image source={require('../../assets/smartphone_7.svg')} className="ic" />Offline</Pressable>
    </Text></View>
    </View>

    <Text className="hr none"></Text>

    <View className="row g40 none" style="align-items:flex-start">
      <View className="col" style="width:560px;flex:none;gap:22px">
        <Text className="t-h1 c1">A player that always tells you where the music is coming from.</Text>
        <Text className="t-bl c2">Sonare joins the local-library power of a device-first player to the discovery layer of a
        streaming service. One global switch — <Text className="cacc">Online</Text> or <Text className="cgold">Offline</Text> —
        decides what the whole application shows, and every song, album and playlist carries a source glyph so the
        answer is never ambiguous.</Text>
        <View className="col" style="gap:12px">
          <View className="row g14">
              <Text className="icobox icobox-acc none"><Image source={require('../../assets/smartphone_3.svg')} className="ic" /></Text>
              <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Offline-first</Text>
              <Text className="t-bm c2">Everything on device works with the network unplugged. Queue, favourites and play counts survive.</Text></Text></View><View className="row g14">
              <Text className="icobox icobox-acc none"><Image source={require('../../assets/cloud_2.svg')} className="ic" /></Text>
              <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Online adds, never replaces</Text>
              <Text className="t-bm c2">Going online layers discovery on top of the local library — it never hides what you already own.</Text></Text></View><View className="row g14">
              <Text className="icobox icobox-acc none"><Image source={require('../../assets/sliders.svg')} className="ic" /></Text>
              <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Music before chrome</Text>
              <Text className="t-bm c2">Large artwork, a waveform seek rail, and no decoration that does not carry information.</Text></Text></View><View className="row g14">
              <Text className="icobox icobox-acc none"><Image source={require('../../assets/minimize.svg')} className="ic" /></Text>
              <Text className="col grow" style="gap:2px"><Text className="t-tm c1">One language, three shells</Text>
              <Text className="t-bm c2">Mobile, Windows and web share tokens and components but adapt layout, not just scale.</Text></Text></View>
        </View>
      </View>

      <View className="col grow" style="gap:20px">
        <View className="surf col" style="padding:26px;gap:20px">
          <Text className="t-ov c3">The source language</Text>
          <View className="row g28">
            <View className="col grow" style="gap:12px">
              <View className="row g10"><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text><Text className="t-tm cacc">Server</Text></View>
              <Text className="t-bm c2">Green. Streamed from the API. Shown only in Online Mode.</Text>
              <Text className="badge bg-cloud"><Image source={require('../../assets/cloud_3.svg')} className="ic" />Server</Text>
            </View>
            <Text className="vr"></Text>
            <View className="col grow" style="gap:12px">
              <View className="row g10"><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text><Text className="t-tm cgold">On device</Text></View>
              <Text className="t-bm c2">Gold. A real file in a scanned folder. Always playable.</Text>
              <Text className="badge bg-local"><Image source={require('../../assets/smartphone.svg')} className="ic" />On device</Text>
            </View>
          </View>
          <Text className="hr"></Text>
          <View className="col g2">
            <View className="srow srow-on">
      <Text className="srow-idx"><Text className="eqbars"><i style="height:9px"></i><i style="height:14px"></i><i style="height:6px"></i><i style="height:11px"></i></Text></Text><View className="art a1 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/smartphone_4.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">3:42</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Paper Lanterns"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
            <View className="srow">
      <Text className="srow-idx">2</Text><View className="art a2 art-r-sm" style="width:44px;height:44px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/cloud.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      
      <Text className="t-mono-s c3 none">4:15</Text>
      <Pressable className="ib ib-32 none" aria-label="More options for Static Bloom"><Image source={require('../../assets/icon_20.svg')} className="ic" /></Pressable>
    </View>
          </View>
        </View>

        <View className="row g16">
          <View className="surf col grow" style="padding:20px;gap:10px">
            <Text className="t-ov c3">Canvas</Text>
            <Text className="t-dis2 c1">#000000</Text>
            <Text className="t-bs c2">True black. Artwork and the accent are the only bright things on screen.</Text>
          </View>
          <View className="surf col grow" style="padding:20px;gap:10px">
            <Text className="t-ov c3">Accent</Text>
            <Text className="t-dis2 cacc">#00E28A</Text>
            <Text className="t-bs c2">12.2 : 1 on black. Used for play, progress and anything online.</Text>
          </View>
          <View className="surf col grow" style="padding:20px;gap:10px">
            <Text className="t-ov c3">On device</Text>
            <Text className="t-dis2 cgold">#FFC24D</Text>
            <Text className="t-bs c2">13.1 : 1 on black. Reserved for local files and Offline Mode.</Text>
          </View>
        </View>

        <View className="surf col" style="padding:22px;gap:14px">
          <Text className="t-ov c3">Signature — the waveform seek rail</Text>
          <Text className="wave" style="height:44px"><i className="on" style="height:18px"></i><i className="on" style="height:33px"></i><i className="on" style="height:19px"></i><i className="on" style="height:28px"></i><i className="on" style="height:25px"></i><i className="on" style="height:26px"></i><i className="on" style="height:30px"></i><i className="on" style="height:22px"></i><i className="on" style="height:31px"></i><i className="on" style="height:27px"></i><i className="on" style="height:20px"></i><i className="on" style="height:22px"></i><i className="on" style="height:34px"></i><i className="on" style="height:19px"></i><i className="on" style="height:23px"></i><i className="on" style="height:27px"></i><i className="on" style="height:36px"></i><i className="on" style="height:27px"></i><i className="on" style="height:30px"></i><i className="on" style="height:25px"></i><i className="on" style="height:32px"></i><i className="on" style="height:28px"></i><i className="on" style="height:30px"></i><i className="on" style="height:28px"></i><i className="on" style="height:32px"></i><i className="on" style="height:30px"></i><i className="on" style="height:27px"></i><i className="on" style="height:37px"></i><i className="on" style="height:35px"></i><i className="on" style="height:31px"></i><i className="on" style="height:39px"></i><i className="on" style="height:35px"></i><i className="on" style="height:27px"></i><i className="on" style="height:30px"></i><i className="on" style="height:26px"></i><i className="on" style="height:34px"></i><i className="on" style="height:44px"></i><i className="on" style="height:43px"></i><i className="on" style="height:35px"></i><i className="on" style="height:29px"></i><i className="on" style="height:33px"></i><i className="on" style="height:26px"></i><i className="on" style="height:37px"></i><i className="on" style="height:43px"></i><i className="on" style="height:32px"></i><i className="on" style="height:44px"></i><i className="on" style="height:32px"></i><i className="on" style="height:38px"></i><i className="on" style="height:29px"></i><i className="on" style="height:28px"></i><i className="on" style="height:33px"></i><i className="on" style="height:28px"></i><i className="on" style="height:30px"></i><i className="on" style="height:36px"></i><i className="on" style="height:40px"></i><i className="on" style="height:28px"></i><i className="on" style="height:37px"></i><i className="hd" style="height:43px"></i><i className="" style="height:41px"></i><i className="" style="height:43px"></i><i className="" style="height:28px"></i><i className="" style="height:26px"></i><i className="" style="height:41px"></i><i className="" style="height:23px"></i><i className="" style="height:25px"></i><i className="" style="height:24px"></i><i className="" style="height:34px"></i><i className="" style="height:37px"></i><i className="" style="height:33px"></i><i className="" style="height:34px"></i><i className="" style="height:32px"></i><i className="" style="height:29px"></i><i className="" style="height:35px"></i><i className="" style="height:37px"></i><i className="" style="height:34px"></i><i className="" style="height:31px"></i><i className="" style="height:23px"></i><i className="" style="height:34px"></i><i className="" style="height:24px"></i><i className="" style="height:22px"></i><i className="" style="height:36px"></i><i className="" style="height:30px"></i><i className="" style="height:40px"></i><i className="" style="height:36px"></i><i className="" style="height:40px"></i><i className="" style="height:35px"></i><i className="" style="height:33px"></i><i className="" style="height:35px"></i><i className="" style="height:34px"></i><i className="" style="height:24px"></i><i className="" style="height:39px"></i><i className="" style="height:25px"></i><i className="" style="height:33px"></i><i className="" style="height:37px"></i><i className="" style="height:38px"></i><i className="" style="height:37px"></i><i className="" style="height:40px"></i><i className="" style="height:38px"></i><i className="" style="height:40px"></i><i className="" style="height:31px"></i><i className="" style="height:35px"></i><i className="" style="height:22px"></i><i className="" style="height:37px"></i><i className="" style="height:35px"></i><i className="" style="height:28px"></i><i className="" style="height:35px"></i><i className="" style="height:25px"></i><i className="" style="height:28px"></i><i className="" style="height:30px"></i><i className="" style="height:33px"></i><i className="" style="height:21px"></i><i className="" style="height:27px"></i><i className="" style="height:31px"></i><i className="" style="height:31px"></i><i className="" style="height:23px"></i><i className="" style="height:24px"></i><i className="" style="height:23px"></i><i className="" style="height:16px"></i><i className="" style="height:23px"></i><i className="" style="height:27px"></i><i className="" style="height:18px"></i><i className="" style="height:24px"></i><i className="" style="height:26px"></i><i className="" style="height:15px"></i><i className="" style="height:14px"></i><i className="" style="height:22px"></i><i className="" style="height:17px"></i><i className="" style="height:23px"></i><i className="" style="height:14px"></i><i className="" style="height:21px"></i><i className="" style="height:19px"></i><i className="" style="height:15px"></i><i className="" style="height:15px"></i><i className="" style="height:23px"></i><i className="" style="height:19px"></i><i className="" style="height:22px"></i><i className="" style="height:15px"></i><i className="" style="height:23px"></i><i className="" style="height:24px"></i><i className="" style="height:16px"></i><i className="" style="height:20px"></i><i className="" style="height:18px"></i><i className="" style="height:18px"></i><i className="" style="height:17px"></i><i className="" style="height:28px"></i><i className="" style="height:20px"></i><i className="" style="height:18px"></i><i className="" style="height:17px"></i><i className="" style="height:22px"></i><i className="" style="height:24px"></i></Text>
          <View className="row between"><Text className="t-mono c2">1:24</Text>
          <Text className="t-bs c3">Replaces the plain progress bar in the full player. Gold variant in Offline Mode.</Text>
          <Text className="t-mono c3">-2:18</Text></View>
          <Text className="wave wave-gold" style="height:30px"><i className="on" style="height:13px"></i><i className="on" style="height:23px"></i><i className="on" style="height:14px"></i><i className="on" style="height:19px"></i><i className="on" style="height:17px"></i><i className="on" style="height:18px"></i><i className="on" style="height:21px"></i><i className="on" style="height:15px"></i><i className="on" style="height:21px"></i><i className="on" style="height:19px"></i><i className="on" style="height:14px"></i><i className="on" style="height:16px"></i><i className="on" style="height:23px"></i><i className="on" style="height:14px"></i><i className="on" style="height:16px"></i><i className="on" style="height:19px"></i><i className="on" style="height:25px"></i><i className="on" style="height:19px"></i><i className="on" style="height:21px"></i><i className="on" style="height:17px"></i><i className="on" style="height:22px"></i><i className="on" style="height:20px"></i><i className="on" style="height:21px"></i><i className="on" style="height:20px"></i><i className="on" style="height:22px"></i><i className="on" style="height:21px"></i><i className="on" style="height:19px"></i><i className="on" style="height:25px"></i><i className="on" style="height:24px"></i><i className="on" style="height:21px"></i><i className="on" style="height:27px"></i><i className="on" style="height:24px"></i><i className="on" style="height:19px"></i><i className="on" style="height:21px"></i><i className="on" style="height:18px"></i><i className="on" style="height:24px"></i><i className="on" style="height:30px"></i><i className="on" style="height:29px"></i><i className="on" style="height:24px"></i><i className="on" style="height:20px"></i><i className="on" style="height:23px"></i><i className="on" style="height:18px"></i><i className="on" style="height:26px"></i><i className="on" style="height:29px"></i><i className="on" style="height:22px"></i><i className="on" style="height:30px"></i><i className="on" style="height:22px"></i><i className="on" style="height:26px"></i><i className="on" style="height:20px"></i><i className="on" style="height:20px"></i><i className="on" style="height:23px"></i><i className="on" style="height:20px"></i><i className="on" style="height:21px"></i><i className="on" style="height:25px"></i><i className="on" style="height:27px"></i><i className="on" style="height:20px"></i><i className="on" style="height:26px"></i><i className="on" style="height:29px"></i><i className="on" style="height:28px"></i><i className="on" style="height:30px"></i><i className="on" style="height:19px"></i><i className="on" style="height:18px"></i><i className="on" style="height:28px"></i><i className="on" style="height:16px"></i><i className="on" style="height:17px"></i><i className="on" style="height:17px"></i><i className="on" style="height:24px"></i><i className="on" style="height:25px"></i><i className="on" style="height:23px"></i><i className="on" style="height:23px"></i><i className="on" style="height:22px"></i><i className="on" style="height:20px"></i><i className="on" style="height:24px"></i><i className="on" style="height:25px"></i><i className="on" style="height:24px"></i><i className="on" style="height:21px"></i><i className="on" style="height:16px"></i><i className="on" style="height:23px"></i><i className="on" style="height:17px"></i><i className="on" style="height:15px"></i><i className="on" style="height:25px"></i><i className="on" style="height:21px"></i><i className="on" style="height:27px"></i><i className="on" style="height:25px"></i><i className="on" style="height:28px"></i><i className="on" style="height:24px"></i><i className="on" style="height:23px"></i><i className="hd" style="height:24px"></i><i className="" style="height:23px"></i><i className="" style="height:17px"></i><i className="" style="height:27px"></i><i className="" style="height:17px"></i><i className="" style="height:23px"></i><i className="" style="height:25px"></i><i className="" style="height:26px"></i><i className="" style="height:25px"></i><i className="" style="height:27px"></i><i className="" style="height:26px"></i><i className="" style="height:27px"></i><i className="" style="height:21px"></i><i className="" style="height:24px"></i><i className="" style="height:15px"></i><i className="" style="height:26px"></i><i className="" style="height:24px"></i><i className="" style="height:20px"></i><i className="" style="height:24px"></i><i className="" style="height:17px"></i><i className="" style="height:20px"></i><i className="" style="height:21px"></i><i className="" style="height:23px"></i><i className="" style="height:15px"></i><i className="" style="height:19px"></i><i className="" style="height:22px"></i><i className="" style="height:21px"></i><i className="" style="height:16px"></i><i className="" style="height:17px"></i><i className="" style="height:16px"></i><i className="" style="height:12px"></i><i className="" style="height:16px"></i><i className="" style="height:19px"></i><i className="" style="height:13px"></i><i className="" style="height:17px"></i><i className="" style="height:18px"></i><i className="" style="height:11px"></i><i className="" style="height:10px"></i><i className="" style="height:16px"></i><i className="" style="height:12px"></i><i className="" style="height:16px"></i><i className="" style="height:10px"></i><i className="" style="height:15px"></i><i className="" style="height:14px"></i><i className="" style="height:11px"></i><i className="" style="height:11px"></i><i className="" style="height:16px"></i><i className="" style="height:13px"></i><i className="" style="height:15px"></i><i className="" style="height:11px"></i><i className="" style="height:16px"></i><i className="" style="height:17px"></i><i className="" style="height:12px"></i><i className="" style="height:14px"></i><i className="" style="height:13px"></i><i className="" style="height:13px"></i><i className="" style="height:12px"></i><i className="" style="height:19px"></i><i className="" style="height:14px"></i><i className="" style="height:13px"></i><i className="" style="height:12px"></i><i className="" style="height:16px"></i><i className="" style="height:17px"></i></Text>
        </View>
      </View>
    </View>

    <Text className="hr none"></Text>

    <View className="row g16 none">
      <View className="surf row g12 grow" style="padding:16px">
          <Text className="icobox none"><Image source={require('../../assets/icon_60.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Foundations</Text><Text className="t-bs c3">6 boards</Text></Text></View><View className="surf row g12 grow" style="padding:16px">
          <Text className="icobox none"><Image source={require('../../assets/grid.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Components</Text><Text className="t-bs c3">40+ patterns</Text></Text></View><View className="surf row g12 grow" style="padding:16px">
          <Text className="icobox none"><Image source={require('../../assets/smartphone_3.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Mobile</Text><Text className="t-bs c3">16 screens · 390×844</Text></Text></View><View className="surf row g12 grow" style="padding:16px">
          <Text className="icobox none"><Image source={require('../../assets/icon_103.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Windows</Text><Text className="t-bs c3">16 screens · 1440×900</Text></Text></View><View className="surf row g12 grow" style="padding:16px">
          <Text className="icobox none"><Image source={require('../../assets/minimize.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Web</Text><Text className="t-bs c3">16 screens · 1280</Text></Text></View><View className="surf row g12 grow" style="padding:16px">
          <Text className="icobox none"><Image source={require('../../assets/icon_25.svg')} className="ic" /></Text>
          <Text className="col grow" style="gap:2px"><Text className="t-tm c1">Tablet</Text><Text className="t-bs c3">4 screens · 834</Text></Text></View>
    </View>
  </View>
</View>

    </>
  );
}
