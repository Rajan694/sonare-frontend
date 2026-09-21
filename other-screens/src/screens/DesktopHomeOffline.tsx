import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopHomeOffline() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-[4px]">
          <span className="flex flex-row items-center gap-[8px]"><span className="dot dot-gold"></span><span className="text-[13px] leading-[18px] font-normal text-gold">OFFLINE MODE · SINCE 18:42</span></span>
          <span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Your device library</span>
          <span className="text-[14px] leading-[20px] font-normal text-t2">2,184 songs · 168 albums · 74 artists · 16.7 GB</span>
        </div>
        <div className="flex flex-row items-center gap-[10px]">
          <a className="btn btn-out" href="D16-Folders.html"><img src="/assets/icon_bde1bdda.svg" className="ic" alt="icon" />Scan folders</a>
          <a className="btn btn-gold" href="D10-Now-Playing-Offline.html"><img src="/assets/icon_d6846b8b.svg" className="ic" alt="icon" />Resume</a>
        </div>
      </div>

      <div className="offstrip"><img src="/assets/icon_2af18165.svg" className="ic" alt="icon" />
        <span className="t-bm grow" style={{'color': 'var(--gold)'}}>You're offline — showing music available on this device.
        <span className="text-t2">Recommendations, trending and server search are hidden until you go online.</span></span>
        <a className="btn btn-sm btn-out flex-none" href="D01-Home-Online.html"><img src="/assets/icon_b33441c2.svg" className="ic" alt="icon" />Go online</a>
      </div>

      <div className="grid gap-[12px]" style={{'gridTemplateColumns': 'repeat(3,minmax(0,1fr))'}}>
        <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
          <div className="art a1 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Paper Lanterns</span><span className="src src-local" title="On this device"><img src="/assets/icon_64e34e0b.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Hollow Coast</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><img src="/assets/icon_6fc2fe5f.svg" className="ic" alt="icon" /></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
          <div className="art a1 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Copper Wires</span><span className="src src-local" title="On this device"><img src="/assets/icon_64e34e0b.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Hollow Coast</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><img src="/assets/icon_6fc2fe5f.svg" className="ic" alt="icon" /></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
          <div className="art a3 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Winter Arithmetic</span><span className="src src-local" title="On this device"><img src="/assets/icon_64e34e0b.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">The Orchard Machine</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><img src="/assets/icon_6fc2fe5f.svg" className="ic" alt="icon" /></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
          <div className="art a3 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Cassette Sunday</span><span className="src src-local" title="On this device"><img src="/assets/icon_64e34e0b.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">The Orchard Machine</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><img src="/assets/icon_6fc2fe5f.svg" className="ic" alt="icon" /></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
          <div className="art a7 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Glass Houses</span><span className="src src-local" title="On this device"><img src="/assets/icon_64e34e0b.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Anais Ferrow</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><img src="/assets/icon_6fc2fe5f.svg" className="ic" alt="icon" /></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
          <div className="art a6 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Ferrous</span><span className="src src-local" title="On this device"><img src="/assets/icon_64e34e0b.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Kite &amp; Anchor</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><img src="/assets/icon_6fc2fe5f.svg" className="ic" alt="icon" /></span></a>
      </div>

      <div className="flex flex-col gap-[14px]">
    <div className="shead"><span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Albums on this device</span><a className="flex flex-row items-center gap-[2px] text-[13px] leading-[16px] font-medium text-t2 flex-none no-underline" href="D05-Library.html">See all<img src="/assets/icon_f7b5ebc9.svg" className="ic" alt="icon" /></a></div><div className="flex flex-row items-center gap-[20px]">
        <a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a1 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Midnight Cartography</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Hollow Coast</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a3 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Slow Frequencies</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">The Orchard Machine</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a7 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Quiet Riot Act</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Anais Ferrow</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a6 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Tidal Drift</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Kite &amp; Anchor</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a8 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Lantern Club</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Lantern Club</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a4 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Salt &amp; Signal</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Mara Vel</span>
      </span>
    </a></div></div>

      <div className="flex flex-col gap-[14px]">
    <div className="shead"><span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Most played locally</span><a className="flex flex-row items-center gap-[2px] text-[13px] leading-[16px] font-medium text-t2 flex-none no-underline" href="D05-Library.html">See all<img src="/assets/icon_f7b5ebc9.svg" className="ic" alt="icon" /></a></div><div className="flex flex-col gap-[2px]">
        <div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">#</span><span></span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">TITLE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">ALBUM</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">SOURCE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">PLAYS</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right"><img src="/assets/icon_dbc7bf8a.svg" className="ic" alt="icon" /></span><span></span></div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">1</span>
    <div className="art a8 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Tape Hiss Lullaby</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Lantern Club</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Lantern Club</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">201</span>
    <span className="t-mono-s text-t3 text-right">3:06</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Tape Hiss Lullaby"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">2</span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Paper Lanterns</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">142</span>
    <span className="t-mono-s text-t3 text-right">3:42</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Paper Lanterns"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">3</span>
    <div className="art a3 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Cassette Sunday</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">The Orchard Machine</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Slow Frequencies</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">134</span>
    <span className="t-mono-s text-t3 text-right">2:58</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Cassette Sunday"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div></div></div>
    </div></DesktopLayout>
    </>
  );
}