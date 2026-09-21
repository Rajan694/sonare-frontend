import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopModeSwitch() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="row between" >
        <div className="col gap-[4px]" ><span className="t-bs c3" >Thursday evening</span>
        <span className="t-dis2 c1" >Welcome back, Rajan</span></div>
      </div>
      <div className="grid gap-[12px]" style={{'gridTemplateColumns': 'repeat(3,minmax(0,1fr))'}}>
        <span className="tile h-[64px] p-[10px] pr-[16px]" ><div className="art a1 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Paper Lanterns</span>
          <span className="t-bs c3 trunc" >Hollow Coast</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]" ><div className="art a2 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Static Bloom</span>
          <span className="t-bs c3 trunc" >Vela Nine</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]" ><div className="art a3 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Winter Arithmetic</span>
          <span className="t-bs c3 trunc" >The Orchard Machine</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]" ><div className="art a4 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Undertow</span>
          <span className="t-bs c3 trunc" >Mara Vel</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]" ><div className="art a7 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Glass Houses</span>
          <span className="t-bs c3 trunc" >Anais Ferrow</span></span></span><span className="tile h-[64px] p-[10px] pr-[16px]" ><div className="art a5 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Low Orbit</span>
          <span className="t-bs c3 trunc" >Sundial Theory</span></span></span>
      </div>
      <div className="col gap-[14px]" >
    <div className="shead" ><span className="t-h2 c1" >Made for you</span></div><div className="row g20" ><a className="acard w-[176px]" href="#">
      <div className="art a2 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Neon Arboretum</span>
        <span className="t-bs c2 trunc w-[176px]" >Vela Nine</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a5 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Parallax</span>
        <span className="t-bs c2 trunc w-[176px]" >Sundial Theory</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a10 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Velvet Static</span>
        <span className="t-bs c2 trunc w-[176px]" >Mira Sound</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a9 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Fathom Line</span>
        <span className="t-bs c2 trunc w-[176px]" >Ocean Bureau</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a11 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Blue Hour Tapes</span>
        <span className="t-bs c2 trunc w-[176px]" >Dell &amp; Ray</span>
      </span>
    </a><a className="acard w-[176px]" href="#">
      <div className="art a12 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Brasswork</span>
        <span className="t-bs c2 trunc w-[176px]" >The Foundry Set</span>
      </span>
    </a></div></div>
    </div></DesktopLayout>
    </>
  );
}