import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopQueue() {
  return (
    <>
<DesktopLayout>
<>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="row between" >
        <div className="col gap-[4px]" ><span className="t-dis2 c1" >Your Library</span>
        <span className="t-bm c2" >Drag any song into the queue panel to play it next</span></div>
      </div>
      <div className="col g2" ><div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="t-ls c3 text-right" >#</span><span></span>
    <span className="t-ls c3" >TITLE</span><span className="t-ls c3" >ALBUM</span>
    <span className="t-ls c3" >SOURCE</span><span className="t-ls c3 text-right" >PLAYS</span>
    <span className="t-ls c3 text-right" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="12" cy="12" r="8.4"/><path className="" d="M12 7v5.3l3.4 2"/></svg></span><span></span></div><div className="grid srow-on gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" ><span className="eqbars" ><i className="h-[9px]" ></i><i className="h-[14px]" ></i><i className="h-[6px]" ></i><i className="h-[11px]" ></i></span></span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm cacc trunc" >Paper Lanterns</span>
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
    <span className="srow-idx w-[auto]" >2</span>
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Copper Wires</span>
      <span className="t-bs c2 trunc" >Hollow Coast</span>
    </span>
    <span className="t-bm c2 trunc" >Midnight Cartography</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >97</span>
    <span className="t-mono-s c3 text-right" >4:33</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Copper Wires"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >3</span>
    <div className="art a3 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Winter Arithmetic</span>
      <span className="t-bs c2 trunc" >The Orchard Machine</span>
    </span>
    <span className="t-bm c2 trunc" >Slow Frequencies</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >88</span>
    <span className="t-mono-s c3 text-right" >5:08</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Winter Arithmetic"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >4</span>
    <div className="art a7 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Glass Houses</span>
      <span className="t-bs c2 trunc" >Anais Ferrow</span>
    </span>
    <span className="t-bm c2 trunc" >Quiet Riot Act</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >103</span>
    <span className="t-mono-s c3 text-right" >3:55</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Glass Houses"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >5</span>
    <div className="art a6 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Ferrous</span>
      <span className="t-bs c2 trunc" >Kite &amp; Anchor</span>
    </span>
    <span className="t-bm c2 trunc" >Tidal Drift</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >76</span>
    <span className="t-mono-s c3 text-right" >3:18</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Ferrous"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >6</span>
    <div className="art a4 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Half-Light</span>
      <span className="t-bs c2 trunc" >Mara Vel</span>
    </span>
    <span className="t-bm c2 trunc" >Salt &amp; Signal</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >119</span>
    <span className="t-mono-s c3 text-right" >4:02</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Half-Light"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div></div>
  </div>
  <div className="qpanel" >
    <div className="row between none h-[64px]" style={{'padding': '0 16px 0 20px', 'borderBottom': '1px solid var(--ln)'}}>
      <span className="t-tl c1" >Queue</span>
      <span className="row g2" >
        <button className="ib ib-32" aria-label="Shuffle queue"><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M16.6 3.6 20 7l-3.4 3.4"/><path className="" d="M16.6 13.6 20 17l-3.4 3.4"/><path className="" d="M3.8 7h3.4c1.7 0 2.7 1 3.7 2.4l2.7 3.9c1 1.4 2 2.4 3.7 2.4H20"/><path className="" d="M3.8 17h3.4c1.5 0 2.5-.8 3.4-2"/><path className="" d="M15.2 9c.9-1.2 1.9-2 3.4-2H20"/></svg></button>
        <button className="ib ib-32" aria-label="Repeat"><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M16.6 2.6 20 6l-3.4 3.4"/><path className="" d="M20 6H8.2A4.2 4.2 0 0 0 4 10.2v1.4"/><path className="" d="M7.4 21.4 4 18l3.4-3.4"/><path className="" d="M4 18h11.8a4.2 4.2 0 0 0 4.2-4.2v-1.4"/></svg></button>
        <a className="ib ib-32" href="D05-Library.html" aria-label="Close queue"><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></a>
      </span>
    </div>
    <div className="col p-[16px] gap-[14px] overflow-hidden" >
      <div className="row g8" >
        <span className="row g6 none h-[24px] rounded-[999px]" style={{'padding': '0 9px', 'background': 'var(--accbg)', 'color': 'var(--acc)'}}>
          <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg><span className="t-ls" >ONLINE QUEUE</span></span>
        <span className="t-bs c3 grow" >8 songs · 3 from server</span>
      </div>

      <span className="t-ov c3" >Now playing</span>
      <div className="srow srow-on" ><div className="art a1 art-r-sm art-rings w-[44px] h-[44px]" ></div>
        <span className="col grow gap-[4px] min-w-[0]" >
          <span className="row g6" ><span className="t-ll cacc trunc" >Paper Lanterns</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
          <span className="row g8" ><span className="track" style={{}}><i className="w-[38%]" ></i><b className="" style={{'left': '38%'}}></b></span><span className="t-mono-s c3 none" >-2:18</span></span>
        </span>
      </div>

      <div className="row between" >
        <span className="t-ov c3" >Next in queue</span>
        <button className="t-ll cacc" style={{'background': 'none', 'border': '0', 'cursor': 'pointer', 'fontFamily': 'var(--font)'}}>Clear</button>
      </div>
      <div className="col g2 overflow-hidden" >
        <div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag none" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
          <div className="art a1 art-r-sm w-[36px] h-[36px]" ></div>
          <span className="col grow gap-[1px] min-w-[0]" >
            <span className="row g6" ><span className="t-ll c1 trunc" >Copper Wires</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-ls c3 trunc" >Hollow Coast</span></span>
          <span className="t-mono-s c3 none" >4:33</span>
          <button className="ib ib-28 none" aria-label="Remove"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag none" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
          <div className="art a3 art-r-sm w-[36px] h-[36px]" ></div>
          <span className="col grow gap-[1px] min-w-[0]" >
            <span className="row g6" ><span className="t-ll c1 trunc" >Winter Arithmetic</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-ls c3 trunc" >The Orchard Machine</span></span>
          <span className="t-mono-s c3 none" >5:08</span>
          <button className="ib ib-28 none" aria-label="Remove"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button>
        </div><div className="srow ghost" style={{'padding': '6px 8px'}}>
          <span className="drag none" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
          <div className="art a2 art-r-sm w-[36px] h-[36px]" ></div>
          <span className="col grow gap-[1px] min-w-[0]" >
            <span className="row g6" ><span className="t-ll c1 trunc" >Static Bloom</span><span className="src src-cloud" title="Streaming from server"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span></span>
            <span className="t-ls c3 trunc" >Vela Nine</span></span>
          <span className="t-mono-s c3 none" >4:15</span>
          <button className="ib ib-28 none" aria-label="Remove"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag none" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
          <div className="art a6 art-r-sm w-[36px] h-[36px]" ></div>
          <span className="col grow gap-[1px] min-w-[0]" >
            <span className="row g6" ><span className="t-ll c1 trunc" >Ferrous</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-ls c3 trunc" >Kite &amp; Anchor</span></span>
          <span className="t-mono-s c3 none" >3:18</span>
          <button className="ib ib-28 none" aria-label="Remove"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag none" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
          <div className="art a7 art-r-sm w-[36px] h-[36px]" ></div>
          <span className="col grow gap-[1px] min-w-[0]" >
            <span className="row g6" ><span className="t-ll c1 trunc" >Glass Houses</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-ls c3 trunc" >Anais Ferrow</span></span>
          <span className="t-mono-s c3 none" >3:55</span>
          <button className="ib ib-28 none" aria-label="Remove"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag none" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
          <div className="art a4 art-r-sm w-[36px] h-[36px]" ></div>
          <span className="col grow gap-[1px] min-w-[0]" >
            <span className="row g6" ><span className="t-ll c1 trunc" >Half-Light</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
            <span className="t-ls c3 trunc" >Mara Vel</span></span>
          <span className="t-mono-s c3 none" >4:02</span>
          <button className="ib ib-28 none" aria-label="Remove"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button>
        </div><div className="srow" style={{'padding': '6px 8px'}}>
          <span className="drag none" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
          <div className="art a5 art-r-sm w-[36px] h-[36px]" ></div>
          <span className="col grow gap-[1px] min-w-[0]" >
            <span className="row g6" ><span className="t-ll c1 trunc" >Low Orbit</span><span className="src src-cloud" title="Streaming from server"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span></span>
            <span className="t-ls c3 trunc" >Sundial Theory</span></span>
          <span className="t-mono-s c3 none" >6:02</span>
          <button className="ib ib-28 none" aria-label="Remove"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button>
        </div>
      </div>
    </div>
    <div className="row g8 none mt-[auto]" style={{'padding': '14px 16px', 'borderTop': '1px solid var(--ln)'}}>
      <button className="btn btn-sm btn-out grow" ><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 4.2v15.6M4.2 12h15.6"/></svg>Save as playlist</button>
      <button className="btn btn-sm btn-out none" aria-label="Queue options"><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </div>
    </div>
    </>
    </DesktopLayout>
    </>
  );
}