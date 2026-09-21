import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopSettings() {
  return (
    <>
<DesktopLayout>
<div className="row grow overflow-hidden" >
      <div className="col none w-[248px] gap-[2px]" style={{'borderRight': '1px solid var(--ln)', 'padding': '24px 12px'}}>
        <span className="t-ov c3" style={{'padding': '0 12px 12px'}}>Settings</span>
        <a className="sitem" href="#"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="12" cy="8.4" r="3.8"/><path className="" d="M4.6 20.2a7.4 7.4 0 0 1 14.8 0"/></svg>Account</a><a className="sitem" href="#"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M9 18.2V5.6l11-2v12.2"/><ellipse className="" cx="6.2" cy="18.2" rx="3" ry="2.6"/><ellipse className="" cx="17.2" cy="15.8" rx="2.8" ry="2.5"/></svg>Playback</a><a className="sitem" href="#"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M6 3v6.2M6 13.4V21M12 3v9.6M12 16.8V21M18 3v2.4M18 9.6V21"/><circle className="" cx="6" cy="11.3" r="2.1"/><circle className="" cx="12" cy="14.7" r="2.1"/><circle className="" cx="18" cy="7.5" r="2.1"/></svg>Audio & effects</a><a className="sitem" href="#"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="3" y="4" width="3.6" height="16" rx="1.2"/><rect className="" x="8.6" y="4" width="3.6" height="16" rx="1.2"/><path className="" d="M15.6 5.4 19 6.6a1.2 1.2 0 0 1 .8 1.5l-3.4 11.5"/></svg>Library & scanning</a><a className="sitem" href="#"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 3.2v11.2"/><path className="" d="m7.9 10.6 4.1 4.1 4.1-4.1"/><path className="" d="M4.2 17.6v2.2h15.6v-2.2"/></svg>Downloads & data</a><a className="sitem" href="#"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="3.4" y="3.4" width="7.2" height="7.2" rx="1.6"/><rect className="" x="13.4" y="3.4" width="7.2" height="7.2" rx="1.6"/><rect className="" x="3.4" y="13.4" width="7.2" height="7.2" rx="1.6"/><rect className="" x="13.4" y="13.4" width="7.2" height="7.2" rx="1.6"/></svg>Appearance</a><a className="sitem on" href="#"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>Connection mode</a><a className="sitem" href="#"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="12" cy="12" r="8.4"/><path className="" d="M12 11v5.6"/><circle className="" cx="12" cy="7.8" r="1"/></svg>About</a>
      </div>
      <div className="col grow overflow-hidden min-w-[0]" ><div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
        <div className="col gap-[6px]" >
          <span className="t-dis2 c1" >Connection mode</span>
          <span className="t-bm c2" >Controls what the entire application shows and where playback sources come from.</span>
        </div>

        <div className="surf col p-[24px] gap-[18px]" >
          <div className="row between" >
            <div className="col gap-[4px]" ><span className="t-tl c1" >Current mode</span>
            <span className="t-bs c3" >Offline since 18:42 · nothing fetched from the server since</span></div>
            <span className="seg seg-lg" >
      <a className="seg-i" href="D01-Home-Online.html" aria-current="false"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Online</a>
      <a className="seg-i seg-on-dev" href="D02-Home-Offline.html" aria-current="true"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>Offline</a>
    </span>
          </div>
          <span className="hr" ></span>
          <div className="row g24" >
            <div className="col grow gap-[6px]" >
                <span className="row g8 c3" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg><span className="t-ls" >SONGS ON DEVICE</span></span>
                <span className="t-h1 cgold" >2,184</span></div><div className="col grow gap-[6px]" >
                <span className="row g8 c3" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><span className="t-ls" >SCANNED FOLDERS</span></span>
                <span className="t-h1 cgold" >5</span></div><div className="col grow gap-[6px]" >
                <span className="row g8 c3" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 3.2v11.2"/><path className="" d="m7.9 10.6 4.1 4.1 4.1-4.1"/><path className="" d="M4.2 17.6v2.2h15.6v-2.2"/></svg><span className="t-ls" >LOCAL STORAGE USED</span></span>
                <span className="t-h1 cgold" >16.7 GB</span></div><div className="col grow gap-[6px]" >
                <span className="row g8 c3" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg><span className="t-ls" >SERVER REQUESTS TODAY</span></span>
                <span className="t-h1 c3" >0</span></div>
          </div>
        </div>

        <div className="surf col" style={{'padding': '4px 0'}}>
          <div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m2.4 3.6 19.2 16.8"/><path className="" d="M5.4 12.4a10.6 10.6 0 0 1 3.4-2.2"/><path className="" d="M2 8.6a15.6 15.6 0 0 1 4.6-2.9"/><path className="" d="M12 20.2l2.2-2.6a3.4 3.4 0 0 0-4.4 0z"/><path className="" d="M18.8 12.4a10.6 10.6 0 0 0-3.6-2.3"/><path className="" d="M22 8.6a15.6 15.6 0 0 0-5.6-3.2"/></svg></span>
              <span className="col grow gap-[2px]" ><span className="t-tm c1" >Stay offline until I switch back</span><span className="t-bs c3" >Ignore the network even when Wi-Fi returns</span></span>
              <button className="sw on none" aria-label="Stay offline until I switch back"><i></i></button></div><div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8"/><path className="" d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8"/><path className="" d="M18.2 3.2v3.4h-3.4"/><path className="" d="M5.8 20.8v-3.4h3.4"/></svg></span>
              <span className="col grow gap-[2px]" ><span className="t-tm c1" >Sync playlists when back online</span><span className="t-bs c3" >Queue changes and push them on reconnect</span></span>
              <button className="sw on none" aria-label="Sync playlists when back online"><i></i></button></div><div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 3.2v11.2"/><path className="" d="m7.9 10.6 4.1 4.1 4.1-4.1"/><path className="" d="M4.2 17.6v2.2h15.6v-2.2"/></svg></span>
              <span className="col grow gap-[2px]" ><span className="t-tm c1" >Auto-download favourites</span><span className="t-bs c3" >Keep liked songs available offline</span></span>
              <button className="sw on none" aria-label="Auto-download favourites"><i></i></button></div><div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span>
              <span className="col grow gap-[2px]" ><span className="t-tm c1" >Stream over mobile data</span><span className="t-bs c3" >Only applies in Online Mode</span></span>
              <button className="sw none" aria-label="Stream over mobile data"><i></i></button></div><div className="lrow" style={{'padding': '16px 20px'}}><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 3l18 18"/><path className="" d="M10.6 6.3A9 9 0 0 1 12 6.2c5 0 9 5.8 9 5.8a16 16 0 0 1-3 3.4"/><path className="" d="M6.6 8.2A15.6 15.6 0 0 0 3 12s4 5.8 9 5.8a8.6 8.6 0 0 0 3.4-.7"/><path className="" d="M10.2 10.4a2.4 2.4 0 0 0 3.4 3.4"/></svg></span>
              <span className="col grow gap-[2px]" ><span className="t-tm c1" >Hide online-only content while offline</span><span className="t-bs c3" >Rather than showing it greyed out</span></span>
              <button className="sw on none" aria-label="Hide online-only content while offline"><i></i></button></div>
        </div>

        <div className="row g10" >
          <a className="btn btn-out" href="D16-Folders.html"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Manage music folders</a>
          <button className="btn btn-out" ><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 7h16"/><path className="" d="M9.6 7V4.6h4.8V7"/><path className="" d="m6.2 7 1 13.4h9.6L17.8 7"/><path className="" d="M10.2 10.8v6M13.8 10.8v6"/></svg>Clear cached artwork (1.2 GB)</button>
        </div>
      </div></div>
    </div></DesktopLayout>
    </>
  );
}