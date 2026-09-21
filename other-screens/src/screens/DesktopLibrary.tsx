import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopLibrary() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-[4px]">
          <span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Your Library</span>
          <span className="text-[14px] leading-[20px] font-normal text-t2">2,184 songs · sorted by recently added</span>
        </div>
        <div className="flex flex-row items-center gap-[10px]">
          <a className="btn btn-out" href="D16-Folders.html"><img src="/assets/icon_8099e0d4.svg" className="ic" alt="icon" />Manage folders</a>
          <button className="btn btn-out"><img src="/assets/icon_3656bae4.svg" className="ic" alt="icon" />Shuffle all</button>
          <a className="btn btn-gold" href="D10-Now-Playing-Offline.html"><img src="/assets/icon_d6846b8b.svg" className="ic" alt="icon" />Play all</a>
        </div>
      </div>
      <div className="flex flex-col gap-[14px]">
        <div className="tabs">
          <a className="tab on" href="#">Songs</a><a className="tab" href="#">Albums</a><a className="tab" href="#">Artists</a><a className="tab" href="#">Genres</a><a className="tab" href="#">Folders</a><a className="tab" href="#">Favourites</a><a className="tab" href="#">Most played</a>
          <span className="flex-grow min-w-0"></span>
          <button className="chip chip-sm"><img src="/assets/icon_7501d6dc.svg" className="ic" alt="icon" />Recently added<img src="/assets/icon_af776a80.svg" className="ic" alt="icon" /></button>
          <span className="flex flex-row items-center gap-[2px] ml-[8px]">
            <button className="ib ib-28 ib-on" aria-label="List view"><img src="/assets/icon_9de52c5b.svg" className="ic" alt="icon" /></button>
            <button className="ib ib-28" aria-label="Grid view"><img src="/assets/icon_085f45a7.svg" className="ic" alt="icon" /></button>
          </span>
        </div>
        <div className="flex flex-col gap-[2px]"><div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">#</span><span></span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">TITLE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">ALBUM</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">SOURCE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">PLAYS</span>
    <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right"><img src="/assets/icon_dbc7bf8a.svg" className="ic" alt="icon" /></span><span></span></div><div className="grid srow-on gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]"><span className="eqbars"><i className="h-[9px]"></i><i className="h-[14px]"></i><i className="h-[6px]"></i><i className="h-[11px]"></i></span></span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-acc truncate">Paper Lanterns</span>
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
    <span className="srow-idx w-[auto]">2</span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Copper Wires</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">97</span>
    <span className="t-mono-s text-t3 text-right">4:33</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Copper Wires"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">3</span>
    <div className="art a3 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Winter Arithmetic</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">The Orchard Machine</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Slow Frequencies</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">88</span>
    <span className="t-mono-s text-t3 text-right">5:08</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Winter Arithmetic"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">4</span>
    <div className="art a7 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Glass Houses</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Anais Ferrow</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Quiet Riot Act</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">103</span>
    <span className="t-mono-s text-t3 text-right">3:55</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Glass Houses"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">5</span>
    <div className="art a6 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Ferrous</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Kite &amp; Anchor</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Tidal Drift</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">76</span>
    <span className="t-mono-s text-t3 text-right">3:18</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Ferrous"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">6</span>
    <div className="art a4 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Half-Light</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Mara Vel</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Salt &amp; Signal</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">119</span>
    <span className="t-mono-s text-t3 text-right">4:02</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Half-Light"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">7</span>
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
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]">8</span>
    <div className="art a7 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Sodium Lamps</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Anais Ferrow</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Quiet Riot Act</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">58</span>
    <span className="t-mono-s text-t3 text-right">4:11</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Sodium Lamps"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div></div>
      </div>
    </div>
    <div className="menu col absolute" style={{'left': '640px', 'top': '472px'}}>
      <span className="mi"><img src="/assets/icon_6fc2fe5f.svg" className="ic" alt="icon" />Play<span className="flex-grow min-w-0"></span><span className="kbd">Enter</span></span>
      <span className="mi"><img src="/assets/icon_72282924.svg" className="ic" alt="icon" />Play next<span className="flex-grow min-w-0"></span><span className="kbd">Ctrl ↵</span></span>
      <span className="mi"><img src="/assets/icon_0dd28fec.svg" className="ic" alt="icon" />Add to queue</span>
      <span className="mi"><img src="/assets/icon_7ca515f5.svg" className="ic" alt="icon" />Add to playlist<img src="/assets/icon_f7b5ebc9.svg" className="ic" alt="icon" /></span>
      <span className="hr" style={{'margin': '5px 8px'}}></span>
      <span className="mi"><img src="/assets/icon_9ae06eed.svg" className="ic" alt="icon" />Add to favourites<span className="flex-grow min-w-0"></span><span className="kbd">L</span></span>
      <span className="mi"><img src="/assets/icon_7eac30fc.svg" className="ic" alt="icon" />Edit tags</span>
      <span className="mi"><img src="/assets/icon_8ee5be8d.svg" className="ic" alt="icon" />Show in folder</span>
      <span className="hr" style={{'margin': '5px 8px'}}></span>
      <span className="mi dis"><img src="/assets/icon_b35de3fd.svg" className="ic" alt="icon" />Share link<span className="flex-grow min-w-0"></span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px]">Offline</span></span>
      <span className="mi danger"><img src="/assets/icon_0392ec97.svg" className="ic" alt="icon" />Delete from device</span>
    </div></DesktopLayout>
    </>
  );
}