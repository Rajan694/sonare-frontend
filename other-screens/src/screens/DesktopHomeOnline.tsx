import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopHomeOnline() {
  return (
    <>
      <DesktopLayout>
        <div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <span className="text-[13px] leading-[18px] font-normal text-t3">Thursday evening &middot; 2 new releases from artists you follow</span>
              <span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Welcome back, Rajan</span>
            </div>
            <div className="flex flex-row items-center gap-[10px]">
              <button className="btn btn-out"><img src="/assets/sync_2.svg" className="ic" alt="icon" />Sync now</button>
              <a className="btn btn-acc" href="D09-Now-Playing-Online.html"><img src="/assets/play_4.svg" className="ic" alt="icon" />Resume</a>
            </div>
          </div>

          <div className="grid gap-[12px]" style={{'gridTemplateColumns': 'repeat(3,minmax(0,1fr))'}}>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
              <div className="art a1 art-r-sm art-rings w-[44px] h-[44px]"></div>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
                <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Paper Lanterns</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
                <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Hollow Coast</span>
              </span>
              <span className="playbtn-fab flex-none w-[34px] h-[34px]"><img src="/assets/play.svg" className="ic" alt="icon" /></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
              <div className="art a2 art-r-sm art-rings w-[44px] h-[44px]"></div>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
                <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Static Bloom</span><span className="src src-cloud" title="Streaming from server"><img src="/assets/cloud_2.svg" className="ic" alt="icon" /></span></span>
                <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Vela Nine</span>
              </span>
              <span className="playbtn-fab flex-none w-[34px] h-[34px]"><img src="/assets/play.svg" className="ic" alt="icon" /></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
              <div className="art a3 art-r-sm art-rings w-[44px] h-[44px]"></div>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
                <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Winter Arithmetic</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
                <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">The Orchard Machine</span>
              </span>
              <span className="playbtn-fab flex-none w-[34px] h-[34px]"><img src="/assets/play.svg" className="ic" alt="icon" /></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
              <div className="art a4 art-r-sm art-rings w-[44px] h-[44px]"></div>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
                <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Undertow</span><span className="src src-cloud" title="Streaming from server"><img src="/assets/cloud_2.svg" className="ic" alt="icon" /></span></span>
                <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Mara Vel</span>
              </span>
              <span className="playbtn-fab flex-none w-[34px] h-[34px]"><img src="/assets/play.svg" className="ic" alt="icon" /></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
              <div className="art a7 art-r-sm art-rings w-[44px] h-[44px]"></div>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
                <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Glass Houses</span><span className="src src-local" title="On this device"><img src="/assets/smartphone_3.svg" className="ic" alt="icon" /></span></span>
                <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Anais Ferrow</span>
              </span>
              <span className="playbtn-fab flex-none w-[34px] h-[34px]"><img src="/assets/play.svg" className="ic" alt="icon" /></span>
            </a>
            <a className="tile h-[64px] p-[10px] pr-[16px]" href="D06-Album.html">
              <div className="art a5 art-r-sm art-rings w-[44px] h-[44px]"></div>
              <span className="flex flex-col flex-grow min-w-0 gap-[2px] min-w-[0]">
                <span className="flex flex-row items-center gap-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Low Orbit</span><span className="src src-cloud" title="Streaming from server"><img src="/assets/cloud_2.svg" className="ic" alt="icon" /></span></span>
                <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">Sundial Theory</span>
              </span>
              <span className="playbtn-fab flex-none w-[34px] h-[34px]"><img src="/assets/play.svg" className="ic" alt="icon" /></span>
            </a>
          </div>

          <div className="flex flex-col gap-[14px]">
            <div className="shead"><span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Made for you</span><a className="flex flex-row items-center gap-[2px] text-[13px] leading-[16px] font-medium text-t2 flex-none no-underline" href="D05-Library.html">See all<img src="/assets/chevron_right.svg" className="ic" alt="icon" /></a></div>
            <div className="flex flex-row items-center gap-[20px]">
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a2 art-r-md art-rings w-[176px] h-[176px]"></div>
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Neon Arboretum</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Vela Nine</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a5 art-r-md art-rings w-[176px] h-[176px]"></div>
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Parallax</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Sundial Theory</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a10 art-r-md art-rings w-[176px] h-[176px]"></div>
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Velvet Static</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Mira Sound</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a9 art-r-md art-rings w-[176px] h-[176px]"></div>
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Fathom Line</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Ocean Bureau</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a11 art-r-md art-rings w-[176px] h-[176px]"></div>
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Blue Hour Tapes</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">Dell &amp; Ray</span>
                </span>
              </a>
              <a className="acard w-[176px]" href="D06-Album.html">
                <div className="art a12 art-r-md art-rings w-[176px] h-[176px]"></div>
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate w-[176px]">Brasswork</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate w-[176px]">The Foundry Set</span>
                </span>
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-[14px]">
            <div className="shead"><span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Trending on Sonare</span><a className="flex flex-row items-center gap-[2px] text-[13px] leading-[16px] font-medium text-t2 flex-none no-underline" href="D03-Search-Online.html">See all<img src="/assets/chevron_right.svg" className="ic" alt="icon" /></a></div>
            <div className="flex flex-col gap-[2px]">
              <div className="grid gap-[16px] items-center" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '0 12px 10px', 'borderBottom': '1px solid var(--ln)'}}>
                <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">#</span><span></span>
                <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">TITLE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">ALBUM</span>
                <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">SOURCE</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">PLAYS</span>
                <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right"><img src="/assets/icon_3.svg" className="ic" alt="icon" /></span><span></span></div>
              <div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
                <span className="srow-idx w-[auto]">1</span>
                <div className="art a2 art-r-sm art-rings w-[40px] h-[40px]"></div>
                <span className="flex flex-col gap-[2px] min-w-[0]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Static Bloom</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Vela Nine</span>
                </span>
                <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Neon Arboretum</span>
                <span className="badge bg-cloud"><img src="/assets/cloud_6.svg" className="ic" alt="icon" />Server</span>
                <span className="t-mono-s text-t3 text-right">38</span>
                <span className="t-mono-s text-t3 text-right">4:15</span>
                <span className="flex flex-row items-center gap-[2px] justify-end">
                  <button className="ib ib-28" aria-label="Favourite Static Bloom"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
                  <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
                </span>
              </div>
              <div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
                <span className="srow-idx w-[auto]">2</span>
                <div className="art a5 art-r-sm art-rings w-[40px] h-[40px]"></div>
                <span className="flex flex-col gap-[2px] min-w-[0]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Low Orbit</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Sundial Theory</span>
                </span>
                <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Parallax</span>
                <span className="badge bg-cloud"><img src="/assets/cloud_6.svg" className="ic" alt="icon" />Server</span>
                <span className="t-mono-s text-t3 text-right">17</span>
                <span className="t-mono-s text-t3 text-right">6:02</span>
                <span className="flex flex-row items-center gap-[2px] justify-end">
                  <button className="ib ib-28" aria-label="Favourite Low Orbit"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
                  <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
                </span>
              </div>
              <div className="grid gap-[16px] items-center rounded-[10px]" style={{'gridTemplateColumns': '30px 44px minmax(0,2.4fr) minmax(0,1.7fr) 116px 64px 58px 78px', 'padding': '7px 12px'}}>
                <span className="srow-idx w-[auto]">3</span>
                <div className="art a10 art-r-sm art-rings w-[40px] h-[40px]"></div>
                <span className="flex flex-col gap-[2px] min-w-[0]">
                  <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Velvet Static</span>
                  <span className="text-[13px] leading-[18px] font-normal text-t2 truncate">Mira Sound</span>
                </span>
                <span className="text-[14px] leading-[20px] font-normal text-t2 truncate">Velvet Static</span>
                <span className="badge bg-cloud"><img src="/assets/cloud_6.svg" className="ic" alt="icon" />Server</span>
                <span className="t-mono-s text-t3 text-right">9</span>
                <span className="t-mono-s text-t3 text-right">3:51</span>
                <span className="flex flex-row items-center gap-[2px] justify-end">
                  <button className="ib ib-28" aria-label="Favourite Velvet Static"><img src="/assets/icon_94.svg" className="ic" alt="icon" /></button>
                  <button className="ib ib-28" aria-label="More options"><img src="/assets/icon_55.svg" className="ic" alt="icon" /></button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </DesktopLayout>
    </>
  );
}
