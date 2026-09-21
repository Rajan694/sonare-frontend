import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopSettings() {
  return (
    <>
<DesktopLayout>
<div className="flex flex-row items-center flex-grow min-w-0 overflow-hidden">
      <div className="col none w-[248px] gap-[2px]" style={{'borderRight': '1px solid var(--ln)', 'padding': '24px 12px'}}>
        <span className="t-ov c3" style={{'padding': '0 12px 12px'}}>Settings</span>
        <a className="sitem" href="#"><img src="/assets/icon_020c69e6.svg" className="ic" alt="icon" />Account</a><a className="sitem" href="#"><img src="/assets/icon_bef45ac6.svg" className="ic" alt="icon" />Playback</a><a className="sitem" href="#"><img src="/assets/icon_b195d8cd.svg" className="ic" alt="icon" />Audio & effects</a><a className="sitem" href="#"><img src="/assets/icon_5978f1ae.svg" className="ic" alt="icon" />Library & scanning</a><a className="sitem" href="#"><img src="/assets/icon_b54151dc.svg" className="ic" alt="icon" />Downloads & data</a><a className="sitem" href="#"><img src="/assets/icon_98129c16.svg" className="ic" alt="icon" />Appearance</a><a className="sitem on" href="#"><img src="/assets/icon_8c381d9a.svg" className="ic" alt="icon" />Connection mode</a><a className="sitem" href="#"><img src="/assets/icon_001d19ff.svg" className="ic" alt="icon" />About</a>
      </div>
      <div className="flex flex-col flex-grow min-w-0 overflow-hidden min-w-[0]"><div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
        <div className="flex flex-col gap-[6px]">
          <span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Connection mode</span>
          <span className="text-[14px] leading-[20px] font-normal text-t2">Controls what the entire application shows and where playback sources come from.</span>
        </div>

        <div className="bg-s1 border border-ln rounded-lg flex flex-col p-[24px] gap-[18px]">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-[4px]"><span className="text-[17px] leading-[24px] font-semibold tracking-[-0.1px] text-t1">Current mode</span>
            <span className="text-[13px] leading-[18px] font-normal text-t3">Offline since 18:42 · nothing fetched from the server since</span></div>
            <span className="seg seg-lg">
      <a className="seg-i" href="D01-Home-Online.html" aria-current="false"><img src="/assets/icon_b33441c2.svg" className="ic" alt="icon" />Online</a>
      <a className="seg-i seg-on-dev" href="D02-Home-Offline.html" aria-current="true"><img src="/assets/icon_aafe8902.svg" className="ic" alt="icon" />Offline</a>
    </span>
          </div>
          <span className="h-[1px] bg-ln border-0 m-0 block"></span>
          <div className="flex flex-row items-center gap-[24px]">
            <div className="flex flex-col flex-grow min-w-0 gap-[6px]">
                <span className="flex flex-row items-center gap-[8px] text-t3"><img src="/assets/icon_cd4da788.svg" className="ic" alt="icon" /><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px]">SONGS ON DEVICE</span></span>
                <span className="text-[24px] leading-[30px] font-semibold tracking-[-0.2px] text-gold">2,184</span></div><div className="flex flex-col flex-grow min-w-0 gap-[6px]">
                <span className="flex flex-row items-center gap-[8px] text-t3"><img src="/assets/icon_8ee5be8d.svg" className="ic" alt="icon" /><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px]">SCANNED FOLDERS</span></span>
                <span className="text-[24px] leading-[30px] font-semibold tracking-[-0.2px] text-gold">5</span></div><div className="flex flex-col flex-grow min-w-0 gap-[6px]">
                <span className="flex flex-row items-center gap-[8px] text-t3"><img src="/assets/icon_4e52c491.svg" className="ic" alt="icon" /><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px]">LOCAL STORAGE USED</span></span>
                <span className="text-[24px] leading-[30px] font-semibold tracking-[-0.2px] text-gold">16.7 GB</span></div><div className="flex flex-col flex-grow min-w-0 gap-[6px]">
                <span className="flex flex-row items-center gap-[8px] text-t3"><img src="/assets/icon_b35de3fd.svg" className="ic" alt="icon" /><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px]">SERVER REQUESTS TODAY</span></span>
                <span className="text-[24px] leading-[30px] font-semibold tracking-[-0.2px] text-t3">0</span></div>
          </div>
        </div>

        <div className="surf col" style={{'padding': '4px 0'}}>
          <div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox"><img src="/assets/icon_2af18165.svg" className="ic" alt="icon" /></span>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Stay offline until I switch back</span><span className="text-[13px] leading-[18px] font-normal text-t3">Ignore the network even when Wi-Fi returns</span></span>
              <button className="sw on flex-none" aria-label="Stay offline until I switch back"><i></i></button></div><div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox"><img src="/assets/icon_098dee3c.svg" className="ic" alt="icon" /></span>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Sync playlists when back online</span><span className="text-[13px] leading-[18px] font-normal text-t3">Queue changes and push them on reconnect</span></span>
              <button className="sw on flex-none" aria-label="Sync playlists when back online"><i></i></button></div><div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox"><img src="/assets/icon_b54151dc.svg" className="ic" alt="icon" /></span>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Auto-download favourites</span><span className="text-[13px] leading-[18px] font-normal text-t3">Keep liked songs available offline</span></span>
              <button className="sw on flex-none" aria-label="Auto-download favourites"><i></i></button></div><div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox"><img src="/assets/icon_016d5441.svg" className="ic" alt="icon" /></span>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Stream over mobile data</span><span className="text-[13px] leading-[18px] font-normal text-t3">Only applies in Online Mode</span></span>
              <button className="sw flex-none" aria-label="Stream over mobile data"><i></i></button></div><div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox"><img src="/assets/icon_fe82e109.svg" className="ic" alt="icon" /></span>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Hide online-only content while offline</span><span className="text-[13px] leading-[18px] font-normal text-t3">Rather than showing it greyed out</span></span>
              <button className="sw on flex-none" aria-label="Hide online-only content while offline"><i></i></button></div>
        </div>

        <div className="flex flex-row items-center gap-[10px]">
          <a className="btn btn-out" href="D16-Folders.html"><img src="/assets/icon_8099e0d4.svg" className="ic" alt="icon" />Manage music folders</a>
          <button className="btn btn-out"><img src="/assets/icon_188bcdca.svg" className="ic" alt="icon" />Clear cached artwork (1.2 GB)</button>
        </div>
      </div></div>
    </div></DesktopLayout>
    </>
  );
}