import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopLyrics() {
  return (
    <>
<DesktopLayout>
<div className="flex flex-col relative overflow-hidden">
      <div className="ambient h-[500px]">
        <i className="w-[620px] h-[620px]" style={{'left': '-180px', 'top': '-300px', 'background': '#2A5AA8'}}></i>
        <i className="w-[460px] h-[460px]" style={{'right': '-120px', 'top': '-120px', 'background': '#6B3FA0'}}></i>
      </div>
      <div className="row grow g40 relative overflow-hidden" style={{'padding': '32px 40px 0'}}>
        <div className="flex flex-col flex-none w-[340px] gap-[20px]">
          <div className="art a1 art-r-lg art-rings w-[340px] h-[340px]" style={{'boxShadow': 'var(--e4)'}}></div>
          <div className="flex flex-col gap-[6px]">
            <span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Paper Lanterns</span>
            <span className="text-[14px] leading-[20px] font-normal text-t2">Hollow Coast · Midnight Cartography</span>
          </div>
          <div className="flex flex-row items-center gap-[8px]">
            <span className="badge bg-local"><img src="/assets/smartphone_5.svg" className="ic" alt="icon" />Paper Lanterns.lrc</span>
            <span className="badge bg-neutral">Synced</span>
          </div>
          <div className="flex flex-col gap-[8px]">
            <button className="btn btn-out btn-sm"><img src="/assets/icon_95.svg" className="ic" alt="icon" />Edit lyrics</button>
            <button className="btn btn-out btn-sm"><img src="/assets/download.svg" className="ic" alt="icon" />Import .lrc file</button>
            <button className="btn btn-out btn-sm"><img src="/assets/clock.svg" className="ic" alt="icon" />Adjust sync offset (−0.3s)</button>
          </div>
        </div>
        <div className="flex flex-col flex-grow min-w-0 gap-[20px] overflow-hidden min-w-[0]">
          <div className="flex flex-row items-center justify-between flex-none">
            <div className="flex flex-row items-center gap-[8px]">
              <button className="chip chip-sm chip-on"><img src="/assets/sync.svg" className="ic" alt="icon" />Synced</button>
              <button className="chip chip-sm">Plain text</button>
              <button className="chip chip-sm"><img src="/assets/icon_100.svg" className="ic" alt="icon" />Find in lyrics</button>
            </div>
            <div className="flex flex-row items-center gap-[8px]">
              <button className="chip chip-sm"><img src="/assets/minimize_2.svg" className="ic" alt="icon" />Full screen</button>
              <button className="ib ib-32" aria-label="Lyrics options"><img src="/assets/icon_74.svg" className="ic" alt="icon" /></button>
            </div>
          </div>
          <div className="flex flex-col gap-[22px] pr-[20px] overflow-hidden">
            <div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>0:44</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>The tide came in and took the pier</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>0:51</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>We did not stop to watch it go</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>0:58</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>We drew the harbour out of memory</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:04</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>Ink still wet across the bay</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--acc)'}}>1:11</span>
              <span className="t-dis2 c1" style={{'textShadow': '0 0 30px rgba(0,226,138,.35)'}}>Paper lanterns on the water line</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:19</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>Burning slow, refusing to stay</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:26</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>And every street we never walked</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:33</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>Is drawn in here somewhere</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:41</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>Fold the map along the coast</span>
            </div><div className="flex flex-row items-start gap-[16px]">
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:48</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>And leave the rest to weather</span>
            </div>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}