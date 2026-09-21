import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopArtist() {
  return (
    <>
<DesktopLayout>
<div className="col relative overflow-hidden" >
      <div className="ambient h-[400px]" >
        <i className="w-[620px] h-[620px]" style={{'left': '-100px', 'top': '-330px', 'background': '#2A5AA8'}}></i>
        <i className="w-[400px] h-[400px]" style={{'left': '520px', 'top': '-180px', 'background': '#0F7A5E'}}></i>
      </div>
      <div className="col relative gap-[26px]" style={{'padding': '32px 32px 0'}}>
        <div className="row g28 items-end" >
          <div className="art a1 art-circ art-rings w-[200px] h-[200px]" style={{'boxShadow': 'var(--e4)'}}></div>
          <div className="col grow gap-[12px]" >
            <span className="row g8" ><span className="t-ov c3" >Artist</span><span className="badge bg-cloud" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m4.8 12.4 4.8 4.8L19.4 6.6"/></svg>Verified</span></span>
            <span className="t-dis c1" >Hollow Coast</span>
            <span className="t-bm c2" >14,208 plays · 3 albums on device · 1 streaming only</span>
            <div className="row g12 mt-[6px]" >
              <button className="playbtn playbtn-56" aria-label="Play artist"><svg className="ic" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></button>
              <button className="btn btn-out btn-lg" ><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M16.6 3.6 20 7l-3.4 3.4"/><path className="" d="M16.6 13.6 20 17l-3.4 3.4"/><path className="" d="M3.8 7h3.4c1.7 0 2.7 1 3.7 2.4l2.7 3.9c1 1.4 2 2.4 3.7 2.4H20"/><path className="" d="M3.8 17h3.4c1.5 0 2.5-.8 3.4-2"/><path className="" d="M15.2 9c.9-1.2 1.9-2 3.4-2H20"/></svg>Shuffle</button>
              <button className="btn btn-out btn-lg" ><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{'color': 'var(--acc)'}}><path className="" d="m4.8 12.4 4.8 4.8L19.4 6.6"/></svg>Following</button>
              <button className="ib ib-44 ib-bord" aria-label="More options"><svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
            </div>
          </div>
        </div>
        <div className="row g32 items-start" >
          <div className="col grow gap-[14px] min-w-[0]" >
            <span className="t-h2 c1" >Popular</span>
            <div className="col g2" ><div className="grid srow-on gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
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
  </div></div>
          </div>
          <div className="col w-[300px] flex-none gap-[14px]" >
            <span className="t-h2 c1" >About</span>
            <div className="surf col p-[18px] gap-[10px]" >
              <span className="t-bm c2" >Coastal post-rock quartet formed in 2016. Known for tape-saturated guitars and field recordings from harbour towns.</span>
              <span className="hr" ></span>
              <div className="row between" ><span className="t-bs c3" >Monthly listeners</span><span className="t-mono c1" >412,905</span></div>
              <div className="row between" ><span className="t-bs c3" >On this device</span><span className="t-mono cgold" >31 songs</span></div>
            </div>
          </div>
        </div>
        <div className="col gap-[14px]" >
          <div className="shead" ><span className="t-h2 c1" >Albums</span><a className="row g2 t-ll c2 none no-underline" href="#" >See all<svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></a></div>
          <div className="row g20" ><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a1 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Midnight Cartography</span>
        <span className="t-bs c2 trunc w-[176px]" >Hollow Coast</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a5 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Parallax</span>
        <span className="t-bs c2 trunc w-[176px]" >Sundial Theory</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a9 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Fathom Line</span>
        <span className="t-bs c2 trunc w-[176px]" >Ocean Bureau</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a10 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Velvet Static</span>
        <span className="t-bs c2 trunc w-[176px]" >Mira Sound</span>
      </span>
    </a><a className="acard w-[176px]" href="D06-Album.html">
      <div className="art a11 art-r-md art-rings w-[176px] h-[176px]" ></div>
      <span className="col gap-[2px]" >
        <span className="t-tm c1 trunc w-[176px]" >Blue Hour Tapes</span>
        <span className="t-bs c2 trunc w-[176px]" >Dell &amp; Ray</span>
      </span>
    </a></div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}