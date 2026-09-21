import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopHomeOffline() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="row between" >
        <div className="col gap-[4px]" >
          <span className="row g8" ><span className="dot dot-gold" ></span><span className="t-bs cgold" >OFFLINE MODE · SINCE 18:42</span></span>
          <span className="t-dis2 c1" >Your device library</span>
          <span className="t-bm c2" >2,184 songs · 168 albums · 74 artists · 16.7 GB</span>
        </div>
        <div className="row g10" >
          <a className="btn btn-out" href="D16-Folders.html"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 8.4V5.6A1.6 1.6 0 0 1 5.6 4h2.8M15.6 4h2.8A1.6 1.6 0 0 1 20 5.6v2.8M20 15.6v2.8a1.6 1.6 0 0 1-1.6 1.6h-2.8M8.4 20H5.6A1.6 1.6 0 0 1 4 18.4v-2.8"/><path className="" d="M4 12h16"/></svg>Scan folders</a>
          <a className="btn btn-gold" href="D10-Now-Playing-Offline.html"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg>Resume</a>
        </div>
      </div>

      <div className="offstrip" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m2.4 3.6 19.2 16.8"/><path className="" d="M5.4 12.4a10.6 10.6 0 0 1 3.4-2.2"/><path className="" d="M2 8.6a15.6 15.6 0 0 1 4.6-2.9"/><path className="" d="M12 20.2l2.2-2.6a3.4 3.4 0 0 0-4.4 0z"/><path className="" d="M18.8 12.4a10.6 10.6 0 0 0-3.6-2.3"/><path className="" d="M22 8.6a15.6 15.6 0 0 0-5.6-3.2"/></svg>
        <span className="t-bm grow" style={{'color': 'var(--gold)'}}>You're offline — showing music available on this device.
        <span className="c2" >Recommendations, trending and server search are hidden until you go online.</span></span>
        <a className="btn btn-sm btn-out none" href="D01-Home-Online.html"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Go online</a>
      </div>

      <div className="grid gap-[12px]" style={{'gridTemplateColumns': 'repeat(3,minmax(0,1fr))'}}>
        <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
          <div className="art a1 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" >
            <span className="row g6" ><span className="t-tm c1 trunc" >Paper Lanterns</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-bs c3 trunc" >Hollow Coast</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
          <div className="art a1 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" >
            <span className="row g6" ><span className="t-tm c1 trunc" >Copper Wires</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-bs c3 trunc" >Hollow Coast</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
          <div className="art a3 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" >
            <span className="row g6" ><span className="t-tm c1 trunc" >Winter Arithmetic</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-bs c3 trunc" >The Orchard Machine</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
          <div className="art a3 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" >
            <span className="row g6" ><span className="t-tm c1 trunc" >Cassette Sunday</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-bs c3 trunc" >The Orchard Machine</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
          <div className="art a7 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" >
            <span className="row g6" ><span className="t-tm c1 trunc" >Glass Houses</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-bs c3 trunc" >Anais Ferrow</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span></a><a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
          <div className="art a6 art-r-sm art-rings w-[44px] h-[44px]" ></div>
          <span className="col grow gap-[2px] min-w-[0]" >
            <span className="row g6" ><span className="t-tm c1 trunc" >Ferrous</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-bs c3 trunc" >Kite &amp; Anchor</span></span>
          <span className="playbtn-fab none w-[34px] h-[34px]" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span></a>
      </div>

      <div className="col gap-[14px]" >
    <div className="shead" ><span className="t-h2 c1" >Albums on this device</span><a className="row g2 t-ll c2 none no-underline" href="D05-Library.html" >See all<svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></a></div><div className="row g20" >
        <a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a1 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Midnight Cartography</span>
        <span className="t-bs c2 trunc w-[176px]" >Hollow Coast</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a3 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Slow Frequencies</span>
        <span className="t-bs c2 trunc w-[176px]" >The Orchard Machine</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a7 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Quiet Riot Act</span>
        <span className="t-bs c2 trunc w-[176px]" >Anais Ferrow</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a6 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Tidal Drift</span>
        <span className="t-bs c2 trunc w-[176px]" >Kite &amp; Anchor</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a8 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Lantern Club</span>
        <span className="t-bs c2 trunc w-[176px]" >Lantern Club</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a4 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Salt &amp; Signal</span>
        <span className="t-bs c2 trunc w-[176px]" >Mara Vel</span>
      </span>
    </a></div></div>

      <div className="col gap-[14px]" >
    <div className="shead" ><span className="t-h2 c1" >Most played locally</span><a className="row g2 t-ll c2 none no-underline" href="D05-Library.html" >See all<svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></a></div><div className="col g2" >
        <div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="t-ls c3 text-right" >#</span><span></span>
    <span className="t-ls c3" >TITLE</span><span className="t-ls c3" >ALBUM</span>
    <span className="t-ls c3" >SOURCE</span><span className="t-ls c3 text-right" >PLAYS</span>
    <span className="t-ls c3 text-right" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="12" cy="12" r="8.4"/><path className="" d="M12 7v5.3l3.4 2"/></svg></span><span></span></div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >1</span>
    <div className="art a8 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Tape Hiss Lullaby</span>
      <span className="t-bs c2 trunc" >Lantern Club</span>
    </span>
    <span className="t-bm c2 trunc" >Lantern Club</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >201</span>
    <span className="t-mono-s c3 text-right" >3:06</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Tape Hiss Lullaby"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >2</span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Paper Lanterns</span>
      <span className="t-bs c2 trunc" >Hollow Coast</span>
    </span>
    <span className="t-bm c2 trunc" >Midnight Cartography</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >142</span>
    <span className="t-mono-s c3 text-right" >3:42</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Paper Lanterns"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >3</span>
    <div className="art a3 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Cassette Sunday</span>
      <span className="t-bs c2 trunc" >The Orchard Machine</span>
    </span>
    <span className="t-bm c2 trunc" >Slow Frequencies</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >134</span>
    <span className="t-mono-s c3 text-right" >2:58</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Cassette Sunday"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div></div></div>
    </div></DesktopLayout>
    </>
  );
}