import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopSearchOffline() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="row g8" >
        <a className="chip chip-on" style={{'background': 'var(--goldbg2)', 'borderColor': 'rgba(255,194,77,.45)', 'color': 'var(--gold)'}} href="#">All</a><a className="chip" style={{}} href="#">Songs</a><a className="chip" style={{}} href="#">Albums</a><a className="chip" style={{}} href="#">Artists</a><a className="chip" style={{}} href="#">Playlists</a><a className="chip" style={{}} href="#">Folders</a>
        <span className="grow" ></span>
        <span className="row g8 t-bs cgold" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>Local results only · 3 matches on this device</span>
      </div>

      <div className="offstrip" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m2.4 3.6 19.2 16.8"/><path className="" d="M5.4 12.4a10.6 10.6 0 0 1 3.4-2.2"/><path className="" d="M2 8.6a15.6 15.6 0 0 1 4.6-2.9"/><path className="" d="M12 20.2l2.2-2.6a3.4 3.4 0 0 0-4.4 0z"/><path className="" d="M18.8 12.4a10.6 10.6 0 0 0-3.6-2.3"/><path className="" d="M22 8.6a15.6 15.6 0 0 0-5.6-3.2"/></svg>
        <span className="t-bm grow" style={{'color': 'var(--gold)'}}>Search is limited to this device while you're offline.</span>
        <a className="btn btn-sm btn-out none" href="D03-Search-Online.html"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Search online instead</a>
      </div>

      <div className="col gap-[14px]" >
    <div className="shead" ><span className="t-h2 c1" >Songs on device</span></div><div className="col g2" ><div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="t-ls c3 text-right" >#</span><span></span>
    <span className="t-ls c3" >TITLE</span><span className="t-ls c3" >ALBUM</span>
    <span className="t-ls c3" >SOURCE</span><span className="t-ls c3 text-right" >PLAYS</span>
    <span className="t-ls c3 text-right" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="12" cy="12" r="8.4"/><path className="" d="M12 7v5.3l3.4 2"/></svg></span><span></span></div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >1</span>
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
    <span className="srow-idx w-[auto]" >2</span>
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
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >3</span>
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
  </div></div></div>

      <div className="row g24 items-start" >
        <div className="col grow gap-[14px] min-w-[0]" >
          <span className="t-h2 c1" >Folders</span>
          <div className="col g2" >
            <a className="srow no-underline" href="D16-Folders.html" style={{'color': 'inherit'}}>
              <span className="icobox icobox-gold" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span>
              <span className="col grow gap-[2px]" ><span className="t-tm c1" >Music/Albums</span>
              <span className="t-mono-s c3" >/storage/emulated/0/Music/Albums</span></span>
              <span className="t-bs c3 none" >842 songs · 6.1 GB</span><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></a><a className="srow no-underline" href="D16-Folders.html" style={{'color': 'inherit'}}>
              <span className="icobox icobox-gold" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M6.4 3.6h7L18 8.2v12.2H6.4z"/><path className="" d="M9.6 6.4v3M12.2 6.4v3M14.8 7.6v1.8"/></svg></span>
              <span className="col grow gap-[2px]" ><span className="t-tm c1" >SD Card/Music</span>
              <span className="t-mono-s c3" >/storage/sdcard1/Music</span></span>
              <span className="t-bs c3 none" >1130 songs · 8.7 GB</span><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></a>
          </div>
        </div>
        <div className="col w-[420px] flex-none gap-[14px]" >
          <span className="t-h2 c1" >Not on this device</span>
          <div className="surf row g14 p-[18px]" style={{'opacity': '.7'}}>
            <span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span>
            <span className="col grow gap-[3px]" >
              <span className="t-tm c2" >11 more matches on the server</span>
              <span className="t-bs c3" >Switch to Online Mode to search and stream them.</span></span>
            <a className="btn btn-sm btn-out none" href="D03-Search-Online.html">Go online</a>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}