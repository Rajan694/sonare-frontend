import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopQueue() {
  return (
    <>
<DesktopLayout>
<>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-[4px]"><span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Your Library</span>
        <span className="text-[14px] leading-[20px] font-normal text-t2">Drag any song into the queue panel to play it next</span></div>
      </div>
      <div className="flex flex-col gap-[2px]"><div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">#</span><span></span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">TITLE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">ALBUM</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">SOURCE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">PLAYS</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right"><img src="/assets/icon_3.svg" className="ic" alt="icon" /></span><span></span></div><div className="grid srow-on gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
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
    <span className="srow-idx w-[auto]">4</span>
    <div className="art a7 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Glass Houses</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Anais Ferrow</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Quiet Riot Act</span>
    <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">103</span>
    <span className="t-mono-s text-t3 text-right">3:55</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Glass Houses"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">5</span>
    <div className="art a6 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Ferrous</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Kite &amp; Anchor</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Tidal Drift</span>
    <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">76</span>
    <span className="t-mono-s text-t3 text-right">3:18</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Ferrous"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">6</span>
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
  </div></div>
  </div>
  <div className="qpanel">
    <div className="row between none h-[64px]" style={{'padding': '0 16px 0 20px', 'borderBottom': '1px solid var(--ln)'}}>
      <span className="text-[17px] leading-[24px] font-semibold tracking-[-0.1px] text-t1">Queue</span>
      <span className="flex flex-row items-center gap-[2px]">
        <button className="ib ib-32" aria-label="Shuffle queue"><img src="/assets/shuffle_3.svg" className="ic" alt="icon" /></button>
        <button className="ib ib-32" aria-label="Repeat"><img src="/assets/repeat_3.svg" className="ic" alt="icon" /></button>
        <a className="ib ib-32" href="D05-Library.html" aria-label="Close queue"><img src="/assets/icon_44.svg" className="ic" alt="icon" /></a>
      </span>
    </div>
    <div className="flex flex-col p-[16px] gap-[14px] overflow-hidden">
      <div className="flex flex-row items-center gap-[8px]">
        <span className="row g6 none h-[24px] rounded-[999px]" style={{'padding': '0 9px', 'background': 'var(--accbg)', 'color': 'var(--acc)'}}>
          <img src="/assets/cloud_5.svg" className="ic" alt="icon" /><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px]">ONLINE QUEUE</span></span>
        <span className="text-[13px] leading-[18px] font-normal text-t3 flex-grow min-w-0">8 songs · 3 from server</span>
      </div>

      <span className="text-[11px] leading-[14px] font-semibold tracking-[0.9px] uppercase text-t3">Now playing</span>
      <div className="srow srow-on"><div className="art a1 art-r-sm art-rings w-[44px] h-[44px]"></div>
        <span className="flex flex-col flex-grow min-w-0 gap-[4px] min-w-[0]">
          <span className="flex flex-row items-center gap-[6px]"><span className="text-[13px] leading-[16px] font-medium text-acc truncate">Paper Lanterns</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
          <span className="flex flex-row items-center gap-[8px]"><span className="track" style={{}}><i className="w-[38%]"></i><b className="" style={{'left': '38%'}}></b></span><span className="t-mono-s text-t3 flex-none">-2:18</span></span>
        </span>
      </div>

      <div className="flex flex-row items-center justify-between">
        <span className="text-[11px] leading-[14px] font-semibold tracking-[0.9px] uppercase text-t3">Next in queue</span>
        <button className="t-ll cacc" style={{'background': 'none', 'border': '0', 'cursor': 'pointer', 'fontFamily': 'var(--font)'}}>Clear</button>
      </div>
      <div className="flex flex-col gap-[2px] overflow-hidden">
        <div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag flex-none"><img src="/assets/icon_130.svg" className="ic" alt="icon" /></span>
          <div className="art a1 art-r-sm w-[36px] h-[36px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[1px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Copper Wires</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Hollow Coast</span></span>
          <span className="t-mono-s text-t3 flex-none">4:33</span>
          <button className="ib ib-28 flex-none" aria-label="Remove"><img src="/assets/icon_43.svg" className="ic" alt="icon" /></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag flex-none"><img src="/assets/icon_130.svg" className="ic" alt="icon" /></span>
          <div className="art a3 art-r-sm w-[36px] h-[36px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[1px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Winter Arithmetic</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">The Orchard Machine</span></span>
          <span className="t-mono-s text-t3 flex-none">5:08</span>
          <button className="ib ib-28 flex-none" aria-label="Remove"><img src="/assets/icon_43.svg" className="ic" alt="icon" /></button>
        </div><div className="srow ghost" style={{'padding': '6px 8px'}}>
          <span className="drag flex-none"><img src="/assets/icon_130.svg" className="ic" alt="icon" /></span>
          <div className="art a2 art-r-sm w-[36px] h-[36px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[1px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Static Bloom</span><span className="src src-cloud" title="Streaming from server"><img src="/assets/cloud_2.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Vela Nine</span></span>
          <span className="t-mono-s text-t3 flex-none">4:15</span>
          <button className="ib ib-28 flex-none" aria-label="Remove"><img src="/assets/icon_43.svg" className="ic" alt="icon" /></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag flex-none"><img src="/assets/icon_130.svg" className="ic" alt="icon" /></span>
          <div className="art a6 art-r-sm w-[36px] h-[36px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[1px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Ferrous</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Kite &amp; Anchor</span></span>
          <span className="t-mono-s text-t3 flex-none">3:18</span>
          <button className="ib ib-28 flex-none" aria-label="Remove"><img src="/assets/icon_43.svg" className="ic" alt="icon" /></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag flex-none"><img src="/assets/icon_130.svg" className="ic" alt="icon" /></span>
          <div className="art a7 art-r-sm w-[36px] h-[36px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[1px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Glass Houses</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Anais Ferrow</span></span>
          <span className="t-mono-s text-t3 flex-none">3:55</span>
          <button className="ib ib-28 flex-none" aria-label="Remove"><img src="/assets/icon_43.svg" className="ic" alt="icon" /></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag flex-none"><img src="/assets/icon_130.svg" className="ic" alt="icon" /></span>
          <div className="art a4 art-r-sm w-[36px] h-[36px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[1px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Half-Light</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Mara Vel</span></span>
          <span className="t-mono-s text-t3 flex-none">4:02</span>
          <button className="ib ib-28 flex-none" aria-label="Remove"><img src="/assets/icon_43.svg" className="ic" alt="icon" /></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag flex-none"><img src="/assets/icon_130.svg" className="ic" alt="icon" /></span>
          <div className="art a5 art-r-sm w-[36px] h-[36px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[1px] min-w-[0]">
            <span className="flex flex-row items-center gap-[6px]"><span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Low Orbit</span><span className="src src-cloud" title="Streaming from server"><img src="/assets/cloud_2.svg" className="ic" alt="icon" /></span></span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Sundial Theory</span></span>
          <span className="t-mono-s text-t3 flex-none">6:02</span>
          <button className="ib ib-28 flex-none" aria-label="Remove"><img src="/assets/icon_43.svg" className="ic" alt="icon" /></button>
        </div>
      </div>
    </div>
    <div className="row g8 none mt-[auto]" style={{'padding': '14px 16px', 'borderTop': '1px solid var(--ln)'}}>
      <button className="btn btn-sm btn-out flex-grow min-w-0"><img src="/assets/plus_4.svg" className="ic" alt="icon" />Save as playlist</button>
      <button className="btn btn-sm btn-out flex-none" aria-label="Queue options"><img src="/assets/icon_114.svg" className="ic" alt="icon" /></button>
    </div>
    </div>
    </>
    </DesktopLayout>
    </>
  );
}