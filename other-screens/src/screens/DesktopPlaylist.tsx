import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopPlaylist() {
  return (
    <>
<DesktopLayout>
<div className="flex flex-col relative overflow-hidden">
      <div className="ambient h-[380px]">
        <i className="w-[500px] h-[500px]" style={{'left': '-120px', 'top': '-240px', 'background': '#2A5AA8'}}></i>
        <i className="w-[400px] h-[400px]" style={{'left': '380px', 'top': '-210px', 'background': '#A8365A'}}></i>
      </div>
      <div className="col relative gap-[24px]" style={{'padding': '32px 32px 0'}}>
        <div className="flex flex-row items-center gap-[28px] items-end">
          <div className="art a1 art-r-lg art-rings w-[210px] h-[210px]" style={{'boxShadow': 'var(--e4)'}}></div>
          <div className="flex flex-col flex-grow min-w-0 gap-[12px]">
            <span className="text-[11px] leading-[14px] font-semibold tracking-[0.9px] uppercase text-t3">Playlist</span>
            <span className="t-dis text-t1">Late Drive</span>
            <span className="text-[14px] leading-[20px] font-normal text-t2">Made by you · 42 songs · 2 hr 51 min · updated 2 days ago</span>
            <div className="flex flex-row items-center gap-[8px]"><span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span><span className="badge bg-dl"><img src="/assets/icon_ce6975b1.svg" className="ic" alt="icon" />Synced to account</span><span className="badge bg-neutral">38 of 42 downloaded</span></div>
            <div className="flex flex-row items-center gap-[12px] mt-[6px]">
              <button className="playbtn playbtn-56" aria-label="Play playlist"><img src="/assets/icon_53abdc1a.svg" className="ic" alt="icon" /></button>
              <button className="btn btn-out btn-lg"><img src="/assets/icon_011b35fd.svg" className="ic" alt="icon" />Shuffle</button>
              <button className="ib ib-44 ib-bord" aria-label="Favourite"><img src="/assets/icon_5917d7ce.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-44 ib-bord" aria-label="Download all"><img src="/assets/icon_324b7d90.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-44 ib-bord" aria-label="Edit playlist"><img src="/assets/icon_7231cbd5.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-44 ib-bord" aria-label="More options"><img src="/assets/icon_a0062b9c.svg" className="ic" alt="icon" /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[2px]">
          <div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">#</span><span></span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">TITLE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">ALBUM</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">SOURCE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">PLAYS</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right"><img src="/assets/icon_dbc7bf8a.svg" className="ic" alt="icon" /></span><span></span></div>
          <div className="grid srow-on gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]"><span className="eqbars"><i className="h-[9px]"></i><i className="h-[14px]"></i><i className="h-[6px]"></i><i className="h-[11px]"></i></span></span>
            <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-acc truncate">Paper Lanterns</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span><span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
            <span className="t-mono-s text-t3 text-right">142</span>
            <span className="t-mono-s text-t3 text-right">3:42</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><img src="/assets/icon_a2d49ea1.svg" className="ic" alt="icon" /></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]"><img src="/assets/icon_7a2b5c8d.svg" className="ic" alt="icon" /></span>
            <div className="art a2 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Static Bloom</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Vela Nine</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Neon Arboretum</span><span className="badge bg-cloud"><img src="/assets/icon_19bce3e5.svg" className="ic" alt="icon" />Server</span>
            <span className="t-mono-s text-t3 text-right">38</span>
            <span className="t-mono-s text-t3 text-right">4:15</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><img src="/assets/icon_a2d49ea1.svg" className="ic" alt="icon" /></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]"><img src="/assets/icon_7a2b5c8d.svg" className="ic" alt="icon" /></span>
            <div className="art a3 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Winter Arithmetic</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">The Orchard Machine</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Slow Frequencies</span><span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
            <span className="t-mono-s text-t3 text-right">88</span>
            <span className="t-mono-s text-t3 text-right">5:08</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><img src="/assets/icon_a2d49ea1.svg" className="ic" alt="icon" /></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px', 'outline': '1px dashed var(--ln3)', 'opacity': '.7'}}>
            <span className="srow-idx drag w-[auto]"><img src="/assets/icon_7a2b5c8d.svg" className="ic" alt="icon" /></span>
            <div className="art a4 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Undertow</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Mara Vel</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Salt &amp; Signal</span><span className="badge bg-cloud"><img src="/assets/icon_19bce3e5.svg" className="ic" alt="icon" />Server</span>
            <span className="t-mono-s text-t3 text-right">44</span>
            <span className="t-mono-s text-t3 text-right">3:27</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><img src="/assets/icon_a2d49ea1.svg" className="ic" alt="icon" /></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]"><img src="/assets/icon_7a2b5c8d.svg" className="ic" alt="icon" /></span>
            <div className="art a6 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Ferrous</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Kite &amp; Anchor</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Tidal Drift</span><span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
            <span className="t-mono-s text-t3 text-right">76</span>
            <span className="t-mono-s text-t3 text-right">3:18</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><img src="/assets/icon_a2d49ea1.svg" className="ic" alt="icon" /></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]"><img src="/assets/icon_7a2b5c8d.svg" className="ic" alt="icon" /></span>
            <div className="art a7 art-r-sm art-rings w-[40px] h-[40px]"></div>
            <span className="flex flex-col gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Glass Houses</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Anais Ferrow</span></span>
            <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Quiet Riot Act</span><span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
            <span className="t-mono-s text-t3 text-right">103</span>
            <span className="t-mono-s text-t3 text-right">3:55</span>
            <span className="flex flex-row items-center gap-[2px] justify-end">
              <button className="ib ib-28" aria-label="Favourite"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><img src="/assets/icon_a2d49ea1.svg" className="ic" alt="icon" /></button></span>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}