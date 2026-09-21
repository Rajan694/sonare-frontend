import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopPlaylist() {
  return (
    <>
<DesktopLayout>
<div className="col relative overflow-hidden" >
      <div className="ambient h-[380px]" >
        <i className="w-[500px] h-[500px]" style={{'left': '-120px', 'top': '-240px', 'background': '#2A5AA8'}}></i>
        <i className="w-[400px] h-[400px]" style={{'left': '380px', 'top': '-210px', 'background': '#A8365A'}}></i>
      </div>
      <div className="col relative gap-[24px]" style={{'padding': '32px 32px 0'}}>
        <div className="row g28 items-end" >
          <div className="art a1 art-r-lg art-rings w-[210px] h-[210px]" style={{'boxShadow': 'var(--e4)'}}></div>
          <div className="col grow gap-[12px]" >
            <span className="t-ov c3" >Playlist</span>
            <span className="t-dis c1" >Late Drive</span>
            <span className="t-bm c2" >Made by you · 42 songs · 2 hr 51 min · updated 2 days ago</span>
            <div className="row g8" ><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span><span className="badge bg-dl" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8"/><path className="" d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8"/><path className="" d="M18.2 3.2v3.4h-3.4"/><path className="" d="M5.8 20.8v-3.4h3.4"/></svg>Synced to account</span><span className="badge bg-neutral" >38 of 42 downloaded</span></div>
            <div className="row g12 mt-[6px]" >
              <button className="playbtn playbtn-56" aria-label="Play playlist"><svg className="ic" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></button>
              <button className="btn btn-out btn-lg" ><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M16.6 3.6 20 7l-3.4 3.4"/><path className="" d="M16.6 13.6 20 17l-3.4 3.4"/><path className="" d="M3.8 7h3.4c1.7 0 2.7 1 3.7 2.4l2.7 3.9c1 1.4 2 2.4 3.7 2.4H20"/><path className="" d="M3.8 17h3.4c1.5 0 2.5-.8 3.4-2"/><path className="" d="M15.2 9c.9-1.2 1.9-2 3.4-2H20"/></svg>Shuffle</button>
              <button className="ib ib-44 ib-bord" aria-label="Favourite"><svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{'color': 'var(--acc)'}}><path className="" d="M12 20.4S4 15.5 4 10.3A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8 2.7c0 5.2-8 10.1-8 10.1z"/></svg></button>
              <button className="ib ib-44 ib-bord" aria-label="Download all"><svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 3.2v11.2"/><path className="" d="m7.9 10.6 4.1 4.1 4.1-4.1"/><path className="" d="M4.2 17.6v2.2h15.6v-2.2"/></svg></button>
              <button className="ib ib-44 ib-bord" aria-label="Edit playlist"><svg className="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M15.6 4.4 19.6 8.4 8.6 19.4l-4.6 1 1-4.6z"/><path className="" d="m13.4 6.6 4 4"/></svg></button>
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
            <span className="srow-idx drag w-[auto]" ><span className="eqbars" ><i className="h-[9px]" ></i><i className="h-[14px]" ></i><i className="h-[6px]" ></i><i className="h-[11px]" ></i></span></span>
            <div className="art a1 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm cacc trunc" >Paper Lanterns</span>
            <span className="t-bs c2 trunc" >Hollow Coast</span></span>
            <span className="t-bm c2 trunc" >Midnight Cartography</span><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
            <span className="t-mono-s c3 text-right" >142</span>
            <span className="t-mono-s c3 text-right" >3:42</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
            <div className="art a2 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Static Bloom</span>
            <span className="t-bs c2 trunc" >Vela Nine</span></span>
            <span className="t-bm c2 trunc" >Neon Arboretum</span><span className="badge bg-cloud" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Server</span>
            <span className="t-mono-s c3 text-right" >38</span>
            <span className="t-mono-s c3 text-right" >4:15</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
            <div className="art a3 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Winter Arithmetic</span>
            <span className="t-bs c2 trunc" >The Orchard Machine</span></span>
            <span className="t-bm c2 trunc" >Slow Frequencies</span><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
            <span className="t-mono-s c3 text-right" >88</span>
            <span className="t-mono-s c3 text-right" >5:08</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px', 'outline': '1px dashed var(--ln3)', 'opacity': '.7'}}>
            <span className="srow-idx drag w-[auto]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
            <div className="art a4 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Undertow</span>
            <span className="t-bs c2 trunc" >Mara Vel</span></span>
            <span className="t-bm c2 trunc" >Salt &amp; Signal</span><span className="badge bg-cloud" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Server</span>
            <span className="t-mono-s c3 text-right" >44</span>
            <span className="t-mono-s c3 text-right" >3:27</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
            <div className="art a6 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Ferrous</span>
            <span className="t-bs c2 trunc" >Kite &amp; Anchor</span></span>
            <span className="t-bm c2 trunc" >Tidal Drift</span><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
            <span className="t-mono-s c3 text-right" >76</span>
            <span className="t-mono-s c3 text-right" >3:18</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button></span>
          </div><div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
            <span className="srow-idx drag w-[auto]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="9.2" cy="6" r="1.4"/><circle className="" cx="14.8" cy="6" r="1.4"/><circle className="" cx="9.2" cy="12" r="1.4"/><circle className="" cx="14.8" cy="12" r="1.4"/><circle className="" cx="9.2" cy="18" r="1.4"/><circle className="" cx="14.8" cy="18" r="1.4"/></svg></span>
            <div className="art a7 art-r-sm art-rings w-[40px] h-[40px]" ></div>
            <span className="col gap-[2px] min-w-[0]" ><span className="t-tm c1 trunc" >Glass Houses</span>
            <span className="t-bs c2 trunc" >Anais Ferrow</span></span>
            <span className="t-bm c2 trunc" >Quiet Riot Act</span><span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>On device</span>
            <span className="t-mono-s c3 text-right" >103</span>
            <span className="t-mono-s c3 text-right" >3:55</span>
            <span className="row g2 justify-end" >
              <button className="ib ib-28" aria-label="Favourite"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
              <button className="ib ib-28" aria-label="Remove from playlist"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button></span>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}