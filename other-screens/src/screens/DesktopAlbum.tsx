import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopAlbum() {
  return (
    <>
<DesktopLayout>
<div className="flex flex-col relative overflow-hidden">
      <div className="ambient h-[420px]">
        <i className="w-[520px] h-[520px]" style={{'left': '-120px', 'top': '-240px', 'background': '#2A5AA8'}}></i>
        <i className="w-[420px] h-[420px]" style={{'left': '420px', 'top': '-200px', 'background': '#6B3FA0'}}></i>
      </div>
      <div className="col relative gap-[26px]" style={{'padding': '32px 32px 0'}}>
        <div className="flex flex-row items-center gap-[28px] items-end">
          <div className="art a1 art-r-lg art-rings w-[232px] h-[232px]" style={{'boxShadow': 'var(--e4)'}}></div>
          <div className="flex flex-col flex-grow min-w-0 gap-[12px] min-w-[0]">
            <span className="text-[11px] leading-[14px] font-semibold tracking-[0.9px] uppercase text-t3">Album · on this device</span>
            <span className="t-dis text-t1">Midnight Cartography</span>
            <div className="flex flex-row items-center gap-[10px]">
              <a className="row g8 no-underline" href="D07-Artist.html" style={{'color': 'inherit'}}>
                <div className="art a1 art-circ w-[24px] h-[24px]"></div><span className="text-[15px] leading-[22px] font-medium text-t1">Hollow Coast</span></a>
              <span className="text-[14px] leading-[20px] font-normal text-t3">· 2024 · 11 songs · 48 min</span>
            </div>
            <div className="flex flex-row items-center gap-[8px]"><span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span><span className="badge bg-neutral">FLAC · 1411 KBPS</span><span className="badge bg-neutral">Post-Rock</span></div>
            <div className="flex flex-row items-center gap-[12px] mt-[6px]">
              <button className="playbtn playbtn-56" aria-label="Play album"><img src="/assets/play_3.svg" className="ic" alt="icon" /></button>
              <button className="btn btn-out btn-lg"><img src="/assets/shuffle_3.svg" className="ic" alt="icon" />Shuffle</button>
              <button className="ib ib-44 ib-bord" aria-label="Favourite album"><img src="/assets/icon.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-44 ib-bord" aria-label="Downloaded"><img src="/assets/icon_70.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-44 ib-bord" aria-label="More options"><img src="/assets/icon_107.svg" className="ic" alt="icon" /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[2px]">
          <div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">#</span><span></span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">TITLE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">ALBUM</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">SOURCE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">PLAYS</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right"><img src="/assets/icon_3.svg" className="ic" alt="icon" /></span><span></span></div>
          <div className="grid srow-on gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]"><span className="eqbars"><i className="h-[9px]"></i><i className="h-[14px]"></i><i className="h-[6px]"></i><i className="h-[11px]"></i></span></span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-acc truncate">Paper Lanterns</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span>
    <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">142</span>
    <span className="t-mono-s text-t3 text-right">3:42</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Paper Lanterns"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">2</span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Copper Wires</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span>
    <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">97</span>
    <span className="t-mono-s text-t3 text-right">4:33</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Copper Wires"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">3</span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Cartographer</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span>
    <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">61</span>
    <span className="t-mono-s text-t3 text-right">5:16</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Cartographer"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
    </span>
  </div>
          <div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx w-[auto]">4</span><div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Tin Roof Morning</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span><span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
            <span className="t-mono-s text-t3 text-right">54</span>
            <span className="t-mono-s text-t3 text-right">4:02</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx w-[auto]">5</span><div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">North Field</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span><span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
            <span className="t-mono-s text-t3 text-right">41</span>
            <span className="t-mono-s text-t3 text-right">3:29</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx w-[auto]">6</span><div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Signal Hill</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span><span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
            <span className="t-mono-s text-t3 text-right">33</span>
            <span className="t-mono-s text-t3 text-right">5:11</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx w-[auto]">7</span><div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Harbour Lights</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span><span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
            <span className="t-mono-s text-t3 text-right">28</span>
            <span className="t-mono-s text-t3 text-right">4:20</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button></span>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}