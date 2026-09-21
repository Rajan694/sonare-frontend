import React from 'react';
import { View, ScrollView, Text, Pressable, Image } from 'react-native';

export default function MobileQueue() {
  return (
    <>

<header className="sa-head">
  <Pressable className="sa-back" href="../index.html">&larr; All screens</Pressable>
  <Text className="sa-title">12 · Queue</Text>
  <Text className="sa-meta">Mobile · Android / iOS &middot; 390 &times; 844</Text>
</header>
<Text className="sa-note">Queue: now playing, upcoming tracks, drag handles, drop indicator, clear and save-as-playlist.</Text>
<View className="sa-frame" style="width:390px;height:844px">
<View className="scr col" style="width:390px;height:844px">
  <View className="ambient" style="height:300px"><i style="width:300px;height:300px;left:-80px;top:-120px;background:#2A5AA8"></i></View>
  <View className="col grow" style="position:relative;padding:14px 20px 0">
    <View className="row between none" style="height:44px">
      <Pressable className="ib none" href="M09-Now-Playing-Online.html" aria-label="Back to player"><Image source={require('../../assets/icon_a5e5bd6f.svg')} className="ic" /></Pressable>
      <Text className="t-ll c1 none">Queue</Text>
      <Pressable className="ib none" aria-label="Queue options"><Image source={require('../../assets/icon_4eb1b58e.svg')} className="ic" /></Pressable>
    </View>

    <View className="row g8 none" style="margin:8px 0 18px">
      <Text className="row g6 none" style="height:26px;padding:0 9px;border-radius:999px;background:var(--accbg);color:var(--acc)">
        <Image source={require('../../assets/icon_65228d4f.svg')} className="ic" /><Text className="t-ls">ONLINE QUEUE</Text></Text>
      <Text className="t-bs c3 grow">7 songs · 2 from server</Text>
      <Pressable className="ib ib-32 none" aria-label="Shuffle queue"><Image source={require('../../assets/icon_790043b8.svg')} className="ic" /></Pressable>
      <Pressable className="ib ib-32 none" aria-label="Repeat"><Image source={require('../../assets/icon_d59a6df2.svg')} className="ic" /></Pressable>
    </View>

    <Text className="t-ov c3 none" style="margin-bottom:10px">Now playing</Text>
    <View className="srow srow-on none" style="margin:0 -8px">
      <View className="art a1 art-r-sm art-rings" style="width:48px;height:48px;"></View>
      <Text className="col grow" style="gap:3px">
        <Text className="row g6"><Text className="t-tm cacc trunc">Paper Lanterns</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="row g8"><Text className="track" style=""><i style="width:38%"></i><b style="left:38%"></b></Text><Text className="t-mono-s c3 none">-2:18</Text></Text>
      </Text>
      <Pressable className="ib ib-32 none" aria-label="Pause"><Image source={require('../../assets/icon_8bd85e1d.svg')} className="ic" /></Pressable>
    </View>

    <View className="row between none" style="margin:20px 0 10px">
      <Text className="t-ov c3">Next in queue</Text>
      <Pressable className="t-ll cacc none" style="background:none;border:0;cursor:pointer;font-family:var(--font)">Clear queue</Pressable>
    </View>

    <View className="col g2" style="margin:0 -8px;overflow:hidden">
      <View className="srow">
      <View className="art a1 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Copper Wires</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Hollow Coast · Midnight Cartography</Text>
      </Text>
      <Pressable className="ib ib-32 none" aria-label="Remove from queue"><Image source={require('../../assets/icon_3a8142e1.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag" aria-label="Reorder Copper Wires"><Image source={require('../../assets/icon_cd19da42.svg')} className="ic" /></Pressable>
    </View><View className="srow srow-hover">
      <View className="art a3 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Winter Arithmetic</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">The Orchard Machine · Slow Frequencies</Text>
      </Text>
      <Pressable className="ib ib-32 none" aria-label="Remove from queue"><Image source={require('../../assets/icon_3a8142e1.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag" aria-label="Reorder Winter Arithmetic"><Image source={require('../../assets/icon_cd19da42.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a2 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Static Bloom</Text><Text className="src src-cloud" title="Streaming from server"><Image source={require('../../assets/icon_50979100.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Vela Nine · Neon Arboretum</Text>
      </Text>
      <Pressable className="ib ib-32 none" aria-label="Remove from queue"><Image source={require('../../assets/icon_3a8142e1.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag" aria-label="Reorder Static Bloom"><Image source={require('../../assets/icon_cd19da42.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a6 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Ferrous</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Kite &amp; Anchor · Tidal Drift</Text>
      </Text>
      <Pressable className="ib ib-32 none" aria-label="Remove from queue"><Image source={require('../../assets/icon_3a8142e1.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag" aria-label="Reorder Ferrous"><Image source={require('../../assets/icon_cd19da42.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a7 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Glass Houses</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Anais Ferrow · Quiet Riot Act</Text>
      </Text>
      <Pressable className="ib ib-32 none" aria-label="Remove from queue"><Image source={require('../../assets/icon_3a8142e1.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag" aria-label="Reorder Glass Houses"><Image source={require('../../assets/icon_cd19da42.svg')} className="ic" /></Pressable>
    </View><View className="srow">
      <View className="art a4 art-r-sm" style="width:42px;height:42px;"></View>
      <Text className="col grow" style="gap:2px">
        <Text className="row g6"><Text className="t-tm c1 trunc">Half-Light</Text><Text className="src src-local" title="On this device"><Image source={require('../../assets/icon_00df50b5.svg')} className="ic" /></Text></Text>
        <Text className="t-bs c2 trunc">Mara Vel · Salt &amp; Signal</Text>
      </Text>
      <Pressable className="ib ib-32 none" aria-label="Remove from queue"><Image source={require('../../assets/icon_3a8142e1.svg')} className="ic" /></Pressable>
                <Pressable className="ib ib-32 none drag" aria-label="Reorder Half-Light"><Image source={require('../../assets/icon_cd19da42.svg')} className="ic" /></Pressable>
    </View>
      <View className="srow ghost" style="margin-top:2px">
        <View className="art a10 art-r-sm" style="width:42px;height:42px;"></View>
        <Text className="col grow" style="gap:2px"><Text className="t-tm c2 trunc">Velvet Static</Text>
        <Text className="t-bs c3 trunc">Mira Sound · dropping here</Text></Text>
        <Text className="t-ls c3 none">Drop to insert</Text>
      </View>
    </View>
  </View>

  <View className="row g8 none" style="position:relative;padding:12px 20px 20px;background:rgba(11,11,13,.92);border-top:1px solid var(--ln2)">
    <Pressable className="btn btn-sm btn-out grow"><Image source={require('../../assets/icon_39290905.svg')} className="ic" />Save as playlist</Pressable>
    <Pressable className="btn btn-sm btn-out grow"><Image source={require('../../assets/icon_34fabe66.svg')} className="ic" />Add songs</Pressable>
  </View>
</View>
</View>

    </>
  );
}
