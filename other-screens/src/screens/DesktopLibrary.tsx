import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopLibrary() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="row between" >
        <div className="col gap-[4px]" >
          <span className="t-dis2 c1" >Your Library</span>
          <span className="t-bm c2" >2,184 songs · sorted by recently added</span>
        </div>
        <div className="row g10" >
          <a className="btn btn-out" href="D16-Folders.html"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Manage folders</a>
          <button className="btn btn-out" ><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M16.6 3.6 20 7l-3.4 3.4"/><path className="" d="M16.6 13.6 20 17l-3.4 3.4"/><path className="" d="M3.8 7h3.4c1.7 0 2.7 1 3.7 2.4l2.7 3.9c1 1.4 2 2.4 3.7 2.4H20"/><path className="" d="M3.8 17h3.4c1.5 0 2.5-.8 3.4-2"/><path className="" d="M15.2 9c.9-1.2 1.9-2 3.4-2H20"/></svg>Shuffle all</button>
          <a className="btn btn-gold" href="D10-Now-Playing-Offline.html"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg>Play all</a>
        </div>
      </div>
      <div className="col gap-[14px]" >
        <div className="tabs" >
          <a className="tab on" href="#">Songs</a><a className="tab" href="#">Albums</a><a className="tab" href="#">Artists</a><a className="tab" href="#">Genres</a><a className="tab" href="#">Folders</a><a className="tab" href="#">Favourites</a><a className="tab" href="#">Most played</a>
          <span className="grow" ></span>
          <button className="chip chip-sm" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7 3.6v16.8M7 20.4l-3.2-3.2M7 20.4l3.2-3.2"/><path className="" d="M17 20.4V3.6M17 3.6l-3.2 3.2M17 3.6l3.2 3.2"/></svg>Recently added<svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5 9.2 7 7 7-7"/></svg></button>
          <span className="row g2 ml-[8px]" >
            <button className="ib ib-28 ib-on" aria-label="List view"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 6.4h16M4 12h16M4 17.6h16"/></svg></button>
            <button className="ib ib-28" aria-label="Grid view"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="3.4" y="3.4" width="7.2" height="7.2" rx="1.6"/><rect className="" x="13.4" y="3.4" width="7.2" height="7.2" rx="1.6"/><rect className="" x="3.4" y="13.4" width="7.2" height="7.2" rx="1.6"/><rect className="" x="13.4" y="13.4" width="7.2" height="7.2" rx="1.6"/></svg></button>
          </span>
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
  </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
    <span className="srow-idx w-[auto]" >7</span>
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
    <span className="srow-idx w-[auto]" >8</span>
    <div className="art a7 art-r-sm art-rings w-[40px] h-[40px]" ></div>
    <span className="col gap-[2px] min-w-[0]" >
      <span className="t-tm c1 trunc" >Sodium Lamps</span>
      <span className="t-bs c2 trunc" >Anais Ferrow</span>
    </span>
    <span className="t-bm c2 trunc" >Quiet Riot Act</span>
    <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
    <span className="t-mono-s c3 text-right" >58</span>
    <span className="t-mono-s c3 text-right" >4:11</span>
    <span className="row g2 justify-end" >
      <button className="ib ib-28" aria-label="Favourite Sodium Lamps"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
      <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
    </span>
  </div></div>
      </div>
    </div>
    <div className="menu col absolute" style={{'left': '640px', 'top': '472px'}}>
      <span className="mi" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg>Play<span className="grow" ></span><span className="kbd" >Enter</span></span>
      <span className="mi" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 6.5h13M3 11.5h13M3 16.5h8"/><path className="" d="M18.5 12.5v8M14.5 16.5h8"/></svg>Play next<span className="grow" ></span><span className="kbd" >Ctrl ↵</span></span>
      <span className="mi" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 6.5h18M3 11.5h18M3 16.5h10"/><path className="" d="m16.4 15.6 5 2.9-5 2.9z"/></svg>Add to queue</span>
      <span className="mi" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 4.2v15.6M4.2 12h15.6"/></svg>Add to playlist<svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></span>
      <span className="hr" style={{'margin': '5px 8px'}}></span>
      <span className="mi" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg>Add to favourites<span className="grow" ></span><span className="kbd" >L</span></span>
      <span className="mi" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M15.6 4.4 19.6 8.4 8.6 19.4l-4.6 1 1-4.6z"/><path className="" d="m13.4 6.6 4 4"/></svg>Edit tags</span>
      <span className="mi" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Show in folder</span>
      <span className="hr" style={{'margin': '5px 8px'}}></span>
      <span className="mi dis" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Share link<span className="grow" ></span><span className="t-ls" >Offline</span></span>
      <span className="mi danger" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 7h16"/><path className="" d="M9.6 7V4.6h4.8V7"/><path className="" d="m6.2 7 1 13.4h9.6L17.8 7"/><path className="" d="M10.2 10.8v6M13.8 10.8v6"/></svg>Delete from device</span>
    </div></DesktopLayout>
    </>
  );
}