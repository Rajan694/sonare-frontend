import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopArtist() {
  return (
    <>
<DesktopLayout>
<div className="flex flex-col relative overflow-hidden">
      <div className="ambient h-[400px]">
        <i className="w-[620px] h-[620px]" style={{'left': '-100px', 'top': '-330px', 'background': '#2A5AA8'}}></i>
        <i className="w-[400px] h-[400px]" style={{'left': '520px', 'top': '-180px', 'background': '#0F7A5E'}}></i>
      </div>
      <div className="col relative gap-[26px]" style={{'padding': '32px 32px 0'}}>
        <div className="flex flex-row items-center gap-[28px] items-end">
          <div className="art a1 art-circ art-rings w-[200px] h-[200px]" style={{'boxShadow': 'var(--e4)'}}></div>
          <div className="flex flex-col flex-grow min-w-0 gap-[12px]">
            <span className="flex flex-row items-center gap-[8px]"><span className="text-[11px] leading-[14px] font-semibold tracking-[0.9px] uppercase text-t3">Artist</span><span className="badge bg-cloud"><img src="/assets/icon_6ba38231.svg" className="ic" alt="icon" />Verified</span></span>
            <span className="t-dis text-t1">Hollow Coast</span>
            <span className="text-[14px] leading-[20px] font-normal text-t2">14,208 plays · 3 albums on device · 1 streaming only</span>
            <div className="flex flex-row items-center gap-[12px] mt-[6px]">
              <button className="playbtn playbtn-56" aria-label="Play artist"><img src="/assets/icon_53abdc1a.svg" className="ic" alt="icon" /></button>
              <button className="btn btn-out btn-lg"><img src="/assets/icon_011b35fd.svg" className="ic" alt="icon" />Shuffle</button>
              <button className="btn btn-out btn-lg"><img src="/assets/icon_0851eeec.svg" className="ic" alt="icon" />Following</button>
              <button className="ib ib-44 ib-bord" aria-label="More options"><img src="/assets/icon_a0062b9c.svg" className="ic" alt="icon" /></button>
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center gap-[32px] items-start">
          <div className="flex flex-col flex-grow min-w-0 gap-[14px] min-w-[0]">
            <span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Popular</span>
            <div className="flex flex-col gap-[2px]"><div className="grid srow-on gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
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
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]"></div>
    <span className="flex flex-col gap-[2px] min-w-[0]">
      <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Cartographer</span>
      <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Hollow Coast</span>
    </span>
    <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Midnight Cartography</span>
    <span className="badge bg-local"><img src="/assets/icon_1425f50d.svg" className="ic" alt="icon" />On device</span>
    <span className="t-mono-s text-t3 text-right">61</span>
    <span className="t-mono-s text-t3 text-right">5:16</span>
    <span className="flex flex-row items-center gap-[2px] justify-end">
      <button className="ib ib-28" aria-label="Favourite Cartographer"><img src="/assets/icon_40ab73e4.svg" className="ic" alt="icon" /></button>
      <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_5393a18d.svg" className="ic" alt="icon" /></button>
    </span>
  </div></div>
          </div>
          <div className="flex flex-col w-[300px] flex-none gap-[14px]">
            <span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">About</span>
            <div className="bg-s1 border border-ln rounded-lg flex flex-col p-[18px] gap-[10px]">
              <span className="text-[14px] leading-[20px] font-normal text-t2">Coastal post-rock quartet formed in 2016. Known for tape-saturated guitars and field recordings from harbour towns.</span>
              <span className="h-[1px] bg-ln border-0 m-0 block"></span>
              <div className="flex flex-row items-center justify-between"><span className="text-[13px] leading-[18px] font-normal text-t3">Monthly listeners</span><span className="t-mono text-t1">412,905</span></div>
              <div className="flex flex-row items-center justify-between"><span className="text-[13px] leading-[18px] font-normal text-t3">On this device</span><span className="t-mono text-gold">31 songs</span></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[14px]">
          <div className="shead"><span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Albums</span><a className="flex flex-row items-center gap-[2px] text-[13px] leading-[16px] font-medium text-t2 flex-none no-underline" href="#">See all<img src="/assets/icon_f7b5ebc9.svg" className="ic" alt="icon" /></a></div>
          <div className="flex flex-row items-center gap-[20px]"><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a1 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Midnight Cartography</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Hollow Coast</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a5 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Parallax</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Sundial Theory</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a9 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Fathom Line</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Ocean Bureau</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a10 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Velvet Static</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Mira Sound</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a11 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Blue Hour Tapes</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Dell &amp; Ray</span>
      </span>
    </a></div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}