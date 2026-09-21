import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopSearchOffline() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="flex flex-row items-center gap-[8px]">
        <a className="chip chip-on" style={{'background': 'var(--goldbg2)', 'borderColor': 'rgba(255,194,77,.45)', 'color': 'var(--gold)'}} href="#">All</a><a className="chip" style={{}} href="#">Songs</a><a className="chip" style={{}} href="#">Albums</a><a className="chip" style={{}} href="#">Artists</a><a className="chip" style={{}} href="#">Playlists</a><a className="chip" style={{}} href="#">Folders</a>
        <span className="flex-grow min-w-0"></span>
        <span className="flex flex-row items-center gap-[8px] text-[13px] leading-[18px] font-normal text-gold"><img src="/assets/smartphone_2.svg" className="ic" alt="icon" />Local results only · 3 matches on this device</span>
      </div>

      <div className="offstrip"><img src="/assets/icon_40.svg" className="ic" alt="icon" />
        <span className="t-bm grow" style={{'color': 'var(--gold)'}}>Search is limited to this device while you're offline.</span>
        <a className="btn btn-sm btn-out flex-none" href="D03-Search-Online.html"><img src="/assets/cloud_3.svg" className="ic" alt="icon" />Search online instead</a>
      </div>

      <div className="flex flex-col gap-[14px]">
    <div className="shead"><span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Songs on device</span></div><div className="flex flex-col gap-[2px]"><div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">#</span><span></span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">TITLE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">ALBUM</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">SOURCE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">PLAYS</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right"><img src="/assets/icon_3.svg" className="ic" alt="icon" /></span><span></span></div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">1</span>
    <div className="art a3 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Winter Arithmetic</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">The Orchard Machine</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Slow Frequencies</span>
    <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">88</span>
    <span className="t-mono-s text-t3 text-right">5:08</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Winter Arithmetic"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">2</span>
    <div className="art a3 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Cassette Sunday</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">The Orchard Machine</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Slow Frequencies</span>
    <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">134</span>
    <span className="t-mono-s text-t3 text-right">2:58</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Cassette Sunday"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">3</span>
    <div className="art a4 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Half-Light</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Mara Vel</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Salt &amp; Signal</span>
    <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">119</span>
    <span className="t-mono-s text-t3 text-right">4:02</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Half-Light"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
    </span>
  </div></div></div>

      <div className="flex flex-row items-center gap-[24px] items-start">
        <div className="flex flex-col flex-grow min-w-0 gap-[14px] min-w-[0]">
          <span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Folders</span>
          <div className="flex flex-col gap-[2px]">
            <a className="srow no-underline" href="D16-Folders.html" style={{'color': 'inherit'}}>
              <span className="icobox icobox-gold"><img src="/assets/folder.svg" className="ic" alt="icon" /></span>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Music/Albums</span>
              <span className="t-mono-s text-t3">/storage/emulated/0/Music/Albums</span></span>
              <span className="text-[13px] leading-[18px] font-normal text-t3 flex-none">842 songs · 6.1 GB</span><img src="/assets/chevron_right_3.svg" className="ic" alt="icon" /></a><a className="srow no-underline" href="D16-Folders.html" style={{'color': 'inherit'}}>
              <span className="icobox icobox-gold"><img src="/assets/icon_26.svg" className="ic" alt="icon" /></span>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">SD Card/Music</span>
              <span className="t-mono-s text-t3">/storage/sdcard1/Music</span></span>
              <span className="text-[13px] leading-[18px] font-normal text-t3 flex-none">1130 songs · 8.7 GB</span><img src="/assets/chevron_right_3.svg" className="ic" alt="icon" /></a>
          </div>
        </div>
        <div className="flex flex-col w-[420px] flex-none gap-[14px]">
          <span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Not on this device</span>
          <div className="surf row g14 p-[18px]" style={{'opacity': '.7'}}>
            <span className="icobox"><img src="/assets/cloud_7.svg" className="ic" alt="icon" /></span>
            <span className="flex flex-col flex-grow min-w-0 gap-[3px]">
              <span className="text-[15px] leading-[22px] font-medium text-t2">11 more matches on the server</span>
              <span className="text-[13px] leading-[18px] font-normal text-t3">Switch to Online Mode to search and stream them.</span></span>
            <a className="btn btn-sm btn-out flex-none" href="D03-Search-Online.html">Go online</a>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}