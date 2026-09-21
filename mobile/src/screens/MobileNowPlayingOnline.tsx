import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileNowPlayingOnline() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">09 · Now Playing — Online</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Full player, streaming source. Green waveform rail, codec/bitrate line, cast output.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="ambient" style="height:520px">
    <i style="width:340px;height:340px;left:-70px;top:-60px;background:#2A5AA8"></i>
    <i style="width:280px;height:280px;right:-80px;top:40px;background:#0F7A5E"></i>
    <i style="width:260px;height:260px;left:90px;top:230px;background:#6B3FA0;opacity:.35"></i>
  </View>
  <View className="col grow" style="position:relative;padding:14px 22px 0">
    <View className="row between none" style="height:44px">
      <Pressable className="ib none" href="M01-Home-Online.html" aria-label="Collapse player"><Image source={require('../../assets/icon_a5e5bd6f.svg')} className="ic" /></Pressable>
      <Text className="col center none" style="gap:1px">
        <Text className="t-ls c3">PLAYING FROM ALBUM</Text>
        <Text className="t-ll c1">Midnight Cartography</Text>
      </Text>
      <Pressable className="ib none" aria-label="More options"><Image source={require('../../assets/icon_4eb1b58e.svg')} className="ic" /></Pressable>
    </View>

    <View className="center" style="padding:22px 0 26px">
      <View className="art a1 art-r-xl art-rings" style="width:314px;height:314px;box-shadow:0 30px 70px -20px rgba(0,0,0,.9)"></View>
    </View>

    <View className="row between none g12">
      <Text className="col grow" style="gap:4px">
        <Text className="t-h1 c1 trunc">Paper Lanterns</Text>
        <Text className="t-tm c2 trunc">Hollow Coast</Text>
      </Text>
      <Pressable className="ib ib-44 none" aria-label="Favourite"><Image source={require('../../assets/icon_5bef6a7d.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44 none" aria-label="Add to playlist"><Image source={require('../../assets/icon_ddeb9749.svg')} className="ic" /></Pressable>
    </View>

    <View className="row g8 none" style="margin-top:12px">
      <Text className="row g6 none" style="height:24px;padding:0 9px;border-radius:999px;background:var(--accbg);color:var(--acc)">
        <Image source={require('../../assets/icon_65228d4f.svg')} className="ic" /><Text className="t-ls">STREAMING</Text>
      </Text>
      <Text className="t-mono-s c3">AAC · 320 kbps</Text>
    </View>

    <View className="col none" style="gap:6px;margin-top:16px">
      <Text className="wave" style="height:34px"><i className="on" style="height:14px"></i><i className="on" style="height:26px"></i><i className="on" style="height:15px"></i><i className="on" style="height:22px"></i><i className="on" style="height:20px"></i><i className="on" style="height:21px"></i><i className="on" style="height:24px"></i><i className="on" style="height:18px"></i><i className="on" style="height:24px"></i><i className="on" style="height:21px"></i><i className="on" style="height:15px"></i><i className="on" style="height:17px"></i><i className="on" style="height:25px"></i><i className="on" style="height:15px"></i><i className="on" style="height:18px"></i><i className="on" style="height:22px"></i><i className="on" style="height:30px"></i><i className="on" style="height:24px"></i><i className="on" style="height:28px"></i><i className="on" style="height:24px"></i><i className="on" style="height:32px"></i><i className="on" style="height:29px"></i><i className="on" style="height:31px"></i><i className="on" style="height:30px"></i><i className="on" style="height:34px"></i><i className="on" style="height:32px"></i><i className="on" style="height:29px"></i><i className="on" style="height:34px"></i><i className="on" style="height:34px"></i><i className="hd" style="height:30px"></i><i className="" style="height:34px"></i><i className="" style="height:31px"></i><i className="" style="height:23px"></i><i className="" style="height:24px"></i><i className="" style="height:20px"></i><i className="" style="height:25px"></i><i className="" style="height:30px"></i><i className="" style="height:28px"></i><i className="" style="height:23px"></i><i className="" style="height:20px"></i><i className="" style="height:23px"></i><i className="" style="height:18px"></i><i className="" style="height:26px"></i><i className="" style="height:30px"></i><i className="" style="height:22px"></i><i className="" style="height:30px"></i><i className="" style="height:22px"></i><i className="" style="height:25px"></i><i className="" style="height:19px"></i><i className="" style="height:19px"></i><i className="" style="height:21px"></i><i className="" style="height:18px"></i><i className="" style="height:18px"></i><i className="" style="height:21px"></i><i className="" style="height:23px"></i><i className="" style="height:16px"></i><i className="" style="height:20px"></i><i className="" style="height:22px"></i><i className="" style="height:20px"></i><i className="" style="height:21px"></i><i className="" style="height:14px"></i><i className="" style="height:12px"></i><i className="" style="height:19px"></i><i className="" style="height:11px"></i><i className="" style="height:12px"></i><i className="" style="height:11px"></i><i className="" style="height:15px"></i><i className="" style="height:16px"></i><i className="" style="height:15px"></i><i className="" style="height:17px"></i><i className="" style="height:17px"></i><i className="" style="height:16px"></i><i className="" style="height:20px"></i><i className="" style="height:22px"></i><i className="" style="height:22px"></i><i className="" style="height:20px"></i></Text>
      <View className="row between"><Text className="t-mono-s c2">1:24</Text><Text className="t-mono-s c3">-2:18</Text></View>
    </View>

    <View className="row between none" style="margin-top:14px">
      <Pressable className="ib ib-44" aria-label="Shuffle"><Image source={require('../../assets/icon_5fb6fc24.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44" aria-label="Previous track"><Image source={require('../../assets/icon_924ff832.svg')} className="ic" /></Pressable>
      <Pressable className="playbtn" aria-label="Pause" style="background:var(--acc);box-shadow:var(--glow-s)"><Image source={require('../../assets/icon_213c9eab.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44" aria-label="Next track"><Image source={require('../../assets/icon_65da5e7b.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44" aria-label="Repeat one"><Image source={require('../../assets/icon_5388c4e9.svg')} className="ic" /></Pressable>
    </View>

    <View className="row between none" style="margin-top:18px;padding-bottom:6px">
      <Pressable className="ib ib-44" href="M11-Lyrics.html" aria-label="Lyrics"><Image source={require('../../assets/icon_a9777263.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44" href="M13-Equalizer.html" aria-label="Equalizer"><Image source={require('../../assets/icon_7bdd370f.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44" aria-label="Audio output"><Image source={require('../../assets/icon_1a4b9f12.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44" aria-label="Sleep timer"><Image source={require('../../assets/icon_daa1cc18.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-44" href="M12-Queue.html" aria-label="Queue"><Image source={require('../../assets/icon_f3686277.svg')} className="ic" /></Pressable>
    </View>
  </View>

  <View className="row g10 none" style="position:relative;margin:0 22px 22px;padding:10px 12px;background:rgba(17,17,20,.86);border:1px solid var(--ln2);border-radius:14px">
    <Text className="icobox" style="width:30px;height:30px;background:transparent;color:var(--acc)"><Image source={require('../../assets/icon_9d49bcc0.svg')} className="ic" /></Text>
    <Text className="col grow" style="gap:1px">
      <Text className="t-ll c1">Living Room Speaker</Text>
      <Text className="t-ls c3">Cast · Sonare Connect</Text>
    </Text>
    <Pressable className="ib ib-32 none" aria-label="Change output"><Image source={require('../../assets/icon_aeba3a96.svg')} className="ic" /></Pressable>
  </View>
</View>
</View>

    </>
  );
}
