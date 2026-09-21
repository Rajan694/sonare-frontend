import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopAlbum() {
  return (
    <>
<DesktopLayout>
<div className="col relative overflow-hidden" >
      <div className="ambient h-[420px]" >
        <i className="w-[520px] h-[520px]" style={{'left': '-120px', 'top': '-240px', 'background': '#2A5AA8'}}></i>
        <i className="w-[420px] h-[420px]" style={{'left': '420px', 'top': '-200px', 'background': '#6B3FA0'}}></i>
      </div>
      <div className="col relative gap-[26px]" style={{'padding': '32px 32px 0'}}>
        <div className="row g28 items-end" >
          <div className="art a1 art-r-lg art-rings w-[232px] h-[232px]" style={{'boxShadow': 'var(--e4)'}}></div>
          <div className="col grow gap-[12px] min-w-[0]" >
            <span className="t-ov c3" >Album · on this device</span>
            <span className="t-dis c1" >Midnight Cartography</span>
            <div className="row g10" >
              <a className="row g8 no-underline" href="D07-Artist.html" style={{'color': 'inherit'}}>
                <div className="art a1 art-circ w-[24px] h-[24px]" ></div><span className="t-tm c1" >Hollow Coast</span></a>
              <span className="t-bm c3" >· 2024 · 11 songs · 48 min</span>
            </div>
            <div className="row g8" ><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span><span className="badge bg-neutral" >FLAC · 1411 KBPS</span><span className="badge bg-neutral" >Post-Rock</span></div>
            <div className="row g12 mt-[6px]" >
              <button className="playbtn playbtn-56" aria-label="Play album"><svg className="ic" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></button>
              <button className="btn btn-out btn-lg" ><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M16.6 3.6 20 7l-3.4 3.4"/><path className="" d="M16.6 13.6 20 17l-3.4 3.4"/><path className="" d="M3.8 7h3.4c1.7 0 2.7 1 3.7 2.4l2.7 3.9c1 1.4 2 2.4 3.7 2.4H20"/><path className="" d="M3.8 17h3.4c1.5 0 2.5-.8 3.4-2"/><path className="" d="M15.2 9c.9-1.2 1.9-2 3.4-2H20"/></svg>Shuffle</button>
              <button className="ib ib-44 ib-bord" aria-label="Favourite album"><svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-44 ib-bord" aria-label="Downloaded"><svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{'color': 'var(--gold)'}}><path className="" d="m4.8 12.4 4.8 4.8L19.4 6.6"/></svg></button>
              <button className="ib ib-44 ib-bord" aria-label="More options"><svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
            </div>
          </div>
        </div>
        <div className="col g2" >
          <div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
    <span className="t-ls c3 text-right" >#</span><span></span>
    <span className="t-ls c3" >TITLE</span><span className="t-ls c3" >ALBUM</span>
    <span className="t-ls c3" >SOURCE</span><span className="t-ls c3 text-right" >PLAYS</span>
    <span className="t-ls c3 text-right" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="12" cy="12" r="8.4"/><path className="" d="M12 7v5.3l3.4 2"/></svg></span><span></span></div>
          <div className="grid srow-on gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
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
    <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Cartographer</span>
      <span className="t-bs c2 trunc" >Hollow Coast</span>
    </span>
    <span className="t-bm c2 trunc" >Midnight Cartography</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >61</span>
    <span className="t-mono-s c3 text-right" >5:16</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Cartographer"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div>
          <div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx w-[auto]" >4</span><div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Tin Roof Morning</span>
            <span className="t-bs c2 trunc" >Hollow Coast</span></span>
            <span className="t-bm c2 trunc" >Midnight Cartography</span><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
            <span className="t-mono-s c3 text-right" >54</span>
            <span className="t-mono-s c3 text-right" >4:02</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx w-[auto]" >5</span><div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >North Field</span>
            <span className="t-bs c2 trunc" >Hollow Coast</span></span>
            <span className="t-bm c2 trunc" >Midnight Cartography</span><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
            <span className="t-mono-s c3 text-right" >41</span>
            <span className="t-mono-s c3 text-right" >3:29</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx w-[auto]" >6</span><div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Signal Hill</span>
            <span className="t-bs c2 trunc" >Hollow Coast</span></span>
            <span className="t-bm c2 trunc" >Midnight Cartography</span><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
            <span className="t-mono-s c3 text-right" >33</span>
            <span className="t-mono-s c3 text-right" >5:11</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx w-[auto]" >7</span><div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Harbour Lights</span>
            <span className="t-bs c2 trunc" >Hollow Coast</span></span>
            <span className="t-bm c2 trunc" >Midnight Cartography</span><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
            <span className="t-mono-s c3 text-right" >28</span>
            <span className="t-mono-s c3 text-right" >4:20</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button></span>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}