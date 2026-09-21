import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopHomeOnline() {
  return (
    <>
      <DesktopLayout>
        <div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
          <div className="row between" >
            <div className="col gap-[4px]" >
              <span className="t-bs c3" >Thursday evening &middot; 2 new releases from artists you follow</span>
              <span className="t-dis2 c1" >Welcome back, Rajan</span>
            </div>
            <div className="row g10" >
              <button className="btn btn-out" ><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8"/><path className="" d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8"/><path className="" d="M18.2 3.2v3.4h-3.4"/><path className="" d="M5.8 20.8v-3.4h3.4"/></svg>Sync now</button>
              <a className="btn btn-acc" href="D09-Now-Playing-Online.html"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg>Resume</a>
            </div>
          </div>

          <div className="grid gap-[12px]" style={{'gridTemplateColumns': 'repeat(3,minmax(0,1fr))'}}>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
              <div className="art a1 art-r-sm art-rings w-[44px] h-[44px]" ></div>
              <span className="col grow gap-[2px] min-w-[0]" >
                <span className="row g6" ><span className="t-tm c1 trunc" >Paper Lanterns</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
                <span className="t-bs c3 trunc" >Hollow Coast</span>
              </span>
              <span className="playbtn-fab none w-[34px] h-[34px]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
              <div className="art a2 art-r-sm art-rings w-[44px] h-[44px]" ></div>
              <span className="col grow gap-[2px] min-w-[0]" >
                <span className="row g6" ><span className="t-tm c1 trunc" >Static Bloom</span><span className="src src-cloud" title="Streaming from server"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span></span>
                <span className="t-bs c3 trunc" >Vela Nine</span>
              </span>
              <span className="playbtn-fab none w-[34px] h-[34px]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
              <div className="art a3 art-r-sm art-rings w-[44px] h-[44px]" ></div>
              <span className="col grow gap-[2px] min-w-[0]" >
                <span className="row g6" ><span className="t-tm c1 trunc" >Winter Arithmetic</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
                <span className="t-bs c3 trunc" >The Orchard Machine</span>
              </span>
              <span className="playbtn-fab none w-[34px] h-[34px]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
              <div className="art a4 art-r-sm art-rings w-[44px] h-[44px]" ></div>
              <span className="col grow gap-[2px] min-w-[0]" >
                <span className="row g6" ><span className="t-tm c1 trunc" >Undertow</span><span className="src src-cloud" title="Streaming from server"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span></span>
                <span className="t-bs c3 trunc" >Mara Vel</span>
              </span>
              <span className="playbtn-fab none w-[34px] h-[34px]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
              <div className="art a7 art-r-sm art-rings w-[44px] h-[44px]" ></div>
              <span className="col grow gap-[2px] min-w-[0]" >
                <span className="row g6" ><span className="t-tm c1 trunc" >Glass Houses</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
                <span className="t-bs c3 trunc" >Anais Ferrow</span>
              </span>
              <span className="playbtn-fab none w-[34px] h-[34px]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html" >
              <div className="art a5 art-r-sm art-rings w-[44px] h-[44px]" ></div>
              <span className="col grow gap-[2px] min-w-[0]" >
                <span className="row g6" ><span className="t-tm c1 trunc" >Low Orbit</span><span className="src src-cloud" title="Streaming from server"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span></span>
                <span className="t-bs c3 trunc" >Sundial Theory</span>
              </span>
              <span className="playbtn-fab none w-[34px] h-[34px]" ><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 4.6v14.8L20 12z"/></svg></span>
            </a>
          </div>

          <div className="col gap-[14px]" >
            <div className="shead" ><span className="t-h2 c1" >Made for you</span><a className="row g2 t-ll c2 none no-underline" href="D05-Library.html" >See all<svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></a></div>
            <div className="row g20" >
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a2 art-r-md art-rings w-[176px] h-[176px]" ></div>
                <span className="col gap-[2px]" >
                  <span className="t-tm c1 trunc w-[176px]" >Neon Arboretum</span>
                  <span className="t-bs c2 trunc w-[176px]" >Vela Nine</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a5 art-r-md art-rings w-[176px] h-[176px]" ></div>
                <span className="col gap-[2px]" >
                  <span className="t-tm c1 trunc w-[176px]" >Parallax</span>
                  <span className="t-bs c2 trunc w-[176px]" >Sundial Theory</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a10 art-r-md art-rings w-[176px] h-[176px]" ></div>
                <span className="col gap-[2px]" >
                  <span className="t-tm c1 trunc w-[176px]" >Velvet Static</span>
                  <span className="t-bs c2 trunc w-[176px]" >Mira Sound</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a9 art-r-md art-rings w-[176px] h-[176px]" ></div>
                <span className="col gap-[2px]" >
                  <span className="t-tm c1 trunc w-[176px]" >Fathom Line</span>
                  <span className="t-bs c2 trunc w-[176px]" >Ocean Bureau</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a11 art-r-md art-rings w-[176px] h-[176px]" ></div>
                <span className="col gap-[2px]" >
                  <span className="t-tm c1 trunc w-[176px]" >Blue Hour Tapes</span>
                  <span className="t-bs c2 trunc w-[176px]" >Dell &amp; Ray</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a12 art-r-md art-rings w-[176px] h-[176px]" ></div>
                <span className="col gap-[2px]" >
                  <span className="t-tm c1 trunc w-[176px]" >Brasswork</span>
                  <span className="t-bs c2 trunc w-[176px]" >The Foundry Set</span>
                </span>
              </a>
            </div>
          </div>

          <div className="col gap-[14px]" >
            <div className="shead" ><span className="t-h2 c1" >Trending on Sonare</span><a className="row g2 t-ll c2 none no-underline" href="D03-Search-Online.html" >See all<svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></a></div>
            <div className="col g2" >
              <div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
                <span className="t-ls c3 text-right" >#</span><span></span>
                <span className="t-ls c3" >TITLE</span><span className="t-ls c3" >ALBUM</span>
                <span className="t-ls c3" >SOURCE</span><span className="t-ls c3 text-right" >PLAYS</span>
                <span className="t-ls c3 text-right" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="12" cy="12" r="8.4"/><path className="" d="M12 7v5.3l3.4 2"/></svg></span><span></span></div>
              <div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
                <span className="srow-idx w-[auto]" >1</span>
                <div className="art a2 art-r-sm art-rings w-[40px] h-[40px]" ></div>
                <span className="col gap-[2px] min-w-[0]" >
                  <span className="t-tm c1 trunc" >Static Bloom</span>
                  <span className="t-bs c2 trunc" >Vela Nine</span>
                </span>
                <span className="t-bm c2 trunc" >Neon Arboretum</span>
                <span className="badge bg-cloud" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Server</span>
                <span className="t-mono-s c3 text-right" >38</span>
                <span className="t-mono-s c3 text-right" >4:15</span>
                <span className="row g2 justify-end" >
                  <button className="ib ib-28" aria-label="Favourite Static Bloom"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
                  <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
                </span>
              </div>
              <div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
                <span className="srow-idx w-[auto]" >2</span>
                <div className="art a5 art-r-sm art-rings w-[40px] h-[40px]" ></div>
                <span className="col gap-[2px] min-w-[0]" >
                  <span className="t-tm c1 trunc" >Low Orbit</span>
                  <span className="t-bs c2 trunc" >Sundial Theory</span>
                </span>
                <span className="t-bm c2 trunc" >Parallax</span>
                <span className="badge bg-cloud" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Server</span>
                <span className="t-mono-s c3 text-right" >17</span>
                <span className="t-mono-s c3 text-right" >6:02</span>
                <span className="row g2 justify-end" >
                  <button className="ib ib-28" aria-label="Favourite Low Orbit"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
                  <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
                </span>
              </div>
              <div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
                <span className="srow-idx w-[auto]" >3</span>
                <div className="art a10 art-r-sm art-rings w-[40px] h-[40px]" ></div>
                <span className="col gap-[2px] min-w-[0]" >
                  <span className="t-tm c1 trunc" >Velvet Static</span>
                  <span className="t-bs c2 trunc" >Mira Sound</span>
                </span>
                <span className="t-bm c2 trunc" >Velvet Static</span>
                <span className="badge bg-cloud" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Server</span>
                <span className="t-mono-s c3 text-right" >9</span>
                <span className="t-mono-s c3 text-right" >3:51</span>
                <span className="row g2 justify-end" >
                  <button className="ib ib-28" aria-label="Favourite Velvet Static"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 20.2S4.2 15.4 4.2 10.3A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.6c0 5.1-7.8 9.9-7.8 9.9z"/></svg></button>
                  <button className="ib ib-28" aria-label="More options"><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </DesktopLayout>
    </>
  );
}
