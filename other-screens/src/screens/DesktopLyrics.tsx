import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopLyrics() {
  return (
    <>
<DesktopLayout>
<div className="col relative overflow-hidden" >
      <div className="ambient h-[500px]" >
        <i className="w-[620px] h-[620px]" style={{'left': '-180px', 'top': '-300px', 'background': '#2A5AA8'}}></i>
        <i className="w-[460px] h-[460px]" style={{'right': '-120px', 'top': '-120px', 'background': '#6B3FA0'}}></i>
      </div>
      <div className="row grow g40 relative overflow-hidden" style={{'padding': '32px 40px 0'}}>
        <div className="col none w-[340px] gap-[20px]" >
          <div className="art a1 art-r-lg art-rings w-[340px] h-[340px]" style={{'boxShadow': 'var(--e4)'}}></div>
          <div className="col gap-[6px]" >
            <span className="t-h2 c1" >Paper Lanterns</span>
            <span className="t-bm c2" >Hollow Coast · Midnight Cartography</span>
          </div>
          <div className="row g8" >
            <span className="badge bg-local" ><svg className="ic" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg>Paper Lanterns.lrc</span>
            <span className="badge bg-neutral" >Synced</span>
          </div>
          <div className="col g8" >
            <button className="btn btn-out btn-sm" ><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M15.6 4.4 19.6 8.4 8.6 19.4l-4.6 1 1-4.6z"/><path className="" d="m13.4 6.6 4 4"/></svg>Edit lyrics</button>
            <button className="btn btn-out btn-sm" ><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 3.2v11.2"/><path className="" d="m7.9 10.6 4.1 4.1 4.1-4.1"/><path className="" d="M4.2 17.6v2.2h15.6v-2.2"/></svg>Import .lrc file</button>
            <button className="btn btn-out btn-sm" ><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3.6 17.4a9 9 0 1 1 16.8 0"/><path className="" d="m12 13.4 4.2-4.6"/><circle className="" cx="12" cy="14.6" r="1.6"/></svg>Adjust sync offset (−0.3s)</button>
          </div>
        </div>
        <div className="col grow gap-[20px] overflow-hidden min-w-[0]" >
          <div className="row between none" >
            <div className="row g8" >
              <button className="chip chip-sm chip-on" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8"/><path className="" d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8"/><path className="" d="M18.2 3.2v3.4h-3.4"/><path className="" d="M5.8 20.8v-3.4h3.4"/></svg>Synced</button>
              <button className="chip chip-sm" >Plain text</button>
              <button className="chip chip-sm" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="11" cy="11" r="6.8"/><path className="" d="m16 16 5 5"/></svg>Find in lyrics</button>
            </div>
            <div className="row g8" >
              <button className="chip chip-sm" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M9.2 4H4v5.2M14.8 4H20v5.2M14.8 20H20v-5.2M9.2 20H4v-5.2"/></svg>Full screen</button>
              <button className="ib ib-32" aria-label="Lyrics options"><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle className="" cx="5" cy="12" r="1.7"/><circle className="" cx="12" cy="12" r="1.7"/><circle className="" cx="19" cy="12" r="1.7"/></svg></button>
            </div>
          </div>
          <div className="col gap-[22px] pr-[20px] overflow-hidden" >
            <div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>0:44</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>The tide came in and took the pier</span>
            </div><div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>0:51</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>We did not stop to watch it go</span>
            </div><div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>0:58</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>We drew the harbour out of memory</span>
            </div><div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:04</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>Ink still wet across the bay</span>
            </div><div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--acc)'}}>1:11</span>
              <span className="t-dis2 c1" style={{'textShadow': '0 0 30px rgba(0,226,138,.35)'}}>Paper lanterns on the water line</span>
            </div><div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:19</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>Burning slow, refusing to stay</span>
            </div><div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:26</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>And every street we never walked</span>
            </div><div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:33</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>Is drawn in here somewhere</span>
            </div><div className="rowt g16" >
              <span className="t-mono none pt-[8px] w-[38px]" style={{'color': 'var(--t4)'}}>1:41</span>
              <span className="t-dis2 c3" style={{'opacity': '.42'}}>Fold the map along the coast</span>
            </div><div className="rowt g16" >
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