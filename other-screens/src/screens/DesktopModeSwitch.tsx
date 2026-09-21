import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopModeSwitch() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-[4px]"><span className="text-[13px] leading-[18px] font-normal text-t3">Thursday evening</span>
        <span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Welcome back, Rajan</span></div>
      </div>
      <div className="grid gap-[12px]" style={{'gridTemplateColumns': 'repeat(3,minmax(0,1fr))'}}>
        <span className="tile h-[64px] p-[10px] pr-[16px]"><div className="art a1 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Paper Lanterns</span>
          <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Hollow Coast</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]"><div className="art a2 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Static Bloom</span>
          <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Vela Nine</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]"><div className="art a3 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Winter Arithmetic</span>
          <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">The Orchard Machine</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]"><div className="art a4 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Undertow</span>
          <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Mara Vel</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]"><div className="art a7 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Glass Houses</span>
          <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Anais Ferrow</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]"><div className="art a5 art-r-sm art-rings w-[44px] h-[44px]"></div>
          <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Low Orbit</span>
          <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Sundial Theory</span></span></span>
      </div>
      <div className="flex flex-col gap-[14px]">
    <div className="shead"><span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Made for you</span></div><div className="flex flex-row items-center gap-[20px]"><a className="acard w-[176px]" href="#">
      <div className="art a2 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Neon Arboretum</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Vela Nine</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a5 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Parallax</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Sundial Theory</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a10 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Velvet Static</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Mira Sound</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a9 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Fathom Line</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Ocean Bureau</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a11 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Blue Hour Tapes</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Dell &amp; Ray</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a12 art-r-md art-rings w-[176px] h-[176px]"></div>
      <span className="flex flex-col gap-[2px]">
        <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Brasswork</span>
        <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">The Foundry Set</span>
      </span>
    </a></div></div>
    </div></DesktopLayout>
    </>
  );
}