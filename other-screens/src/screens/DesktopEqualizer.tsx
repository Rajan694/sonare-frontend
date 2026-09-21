import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopEqualizer() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="row between" >
        <div className="col gap-[4px]" ><span className="t-dis2 c1" >Audio</span>
        <span className="t-bm c2" >Equalizer, effects and output — applied to local and streamed playback</span></div>
        <div className="row g10" >
          <button className="btn btn-out" ><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8"/><path className="" d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8"/><path className="" d="M18.2 3.2v3.4h-3.4"/><path className="" d="M5.8 20.8v-3.4h3.4"/></svg>Reset</button>
          <button className="btn btn-out" ><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 4.2v15.6M4.2 12h15.6"/></svg>Save preset</button>
          <span className="row g10 none ml-[6px]" ><span className="t-tm c2" >Equalizer</span>
          <button className="sw on" aria-label="Equalizer enabled"><i></i></button></span>
        </div>
      </div>

      <div className="row g8" ><button className="chip" >Flat</button><button className="chip chip-on" >Sonare</button><button className="chip" >Bass</button><button className="chip" >Vocal</button><button className="chip" >Acoustic</button><button className="chip" >Late night</button><button className="chip" >Custom</button></div>

      <div className="row g24 items-start" >
        <div className="surf col grow gap-[18px] min-w-[0]" style={{'padding': '24px 24px 18px'}}>
          <div className="row between" >
            <span className="t-tm c1" >9-band graphic equalizer</span>
            <span className="t-mono-s c3" >Range ±12 dB · 44.1 kHz</span>
          </div>
          <div className="row between items-end" style={{'padding': '0 8px'}}>
            <span className="vs w-[52px]" >
              <span className="t-mono-s c2" >+1</span>
              <span className="vs-rail h-[200px]" ><i className="h-[55%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '55%'}}></b></span>
              <span className="t-ls c3" >32</span></span><span className="vs w-[52px]" >
              <span className="t-mono-s c2" >+4</span>
              <span className="vs-rail h-[200px]" ><i className="h-[68%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '68%'}}></b></span>
              <span className="t-ls c3" >64</span></span><span className="vs w-[52px]" >
              <span className="t-mono-s c2" >0</span>
              <span className="vs-rail h-[200px]" ><i className="h-[52%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '52%'}}></b></span>
              <span className="t-ls c3" >150</span></span><span className="vs w-[52px]" >
              <span className="t-mono-s c2" >-1</span>
              <span className="vs-rail h-[200px]" ><i className="h-[44%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '44%'}}></b></span>
              <span className="t-ls c3" >400</span></span><span className="vs w-[52px]" >
              <span className="t-mono-s c2" >+2</span>
              <span className="vs-rail h-[200px]" ><i className="h-[58%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '58%'}}></b></span>
              <span className="t-ls c3" >1k</span></span><span className="vs w-[52px]" >
              <span className="t-mono-s c2" >+5</span>
              <span className="vs-rail h-[200px]" ><i className="h-[72%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '72%'}}></b></span>
              <span className="t-ls c3" >2.4k</span></span><span className="vs w-[52px]" >
              <span className="t-mono-s c2" >+3</span>
              <span className="vs-rail h-[200px]" ><i className="h-[61%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '61%'}}></b></span>
              <span className="t-ls c3" >6k</span></span><span className="vs w-[52px]" >
              <span className="t-mono-s c2" >0</span>
              <span className="vs-rail h-[200px]" ><i className="h-[50%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '50%'}}></b></span>
              <span className="t-ls c3" >14k</span></span><span className="vs w-[52px]" >
              <span className="t-mono-s c2" >-1</span>
              <span className="vs-rail h-[200px]" ><i className="h-[47%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '47%'}}></b></span>
              <span className="t-ls c3" >20k</span></span>
          </div>
          <span className="hr" ></span>
          <div className="row g32" >
            <span className="col grow gap-[8px]" ><span className="row between" ><span className="t-ll c2" >Bass boost</span><span className="t-mono-s c1" >42%</span></span><span className="track" style={{}}><i className="w-[42%]" ></i><b className="" style={{'left': '42%'}}></b></span></span>
            <span className="col grow gap-[8px]" ><span className="row between" ><span className="t-ll c2" >Virtualizer</span><span className="t-mono-s c1" >26%</span></span><span className="track" style={{}}><i className="w-[26%]" ></i><b className="" style={{'left': '26%'}}></b></span></span>
            <span className="col grow gap-[8px]" ><span className="row between" ><span className="t-ll c2" >Loudness</span><span className="t-mono-s c1" >15%</span></span><span className="track" style={{}}><i className="w-[15%]" ></i><b className="" style={{'left': '15%'}}></b></span></span>
          </div>
        </div>

        <div className="col w-[380px] flex-none gap-[16px]" >
          <div className="surf col" style={{'padding': '4px 0'}}>
            <div className="lrow" ><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8"/><path className="" d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8"/><path className="" d="M18.2 3.2v3.4h-3.4"/><path className="" d="M5.8 20.8v-3.4h3.4"/></svg></span>
                <span className="col grow gap-[2px]" ><span className="t-tm c1" >Crossfade</span><span className="t-bs c3" >6 seconds</span></span>
                <button className="sw on none" aria-label="Crossfade"><i></i></button></div><div className="lrow" ><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M9 18.2V5.6l11-2v12.2"/><ellipse className="" cx="6.2" cy="18.2" rx="3" ry="2.6"/><ellipse className="" cx="17.2" cy="15.8" rx="2.8" ry="2.5"/></svg></span>
                <span className="col grow gap-[2px]" ><span className="t-tm c1" >Gapless playback</span><span className="t-bs c3" >Album transitions</span></span>
                <button className="sw on none" aria-label="Gapless playback"><i></i></button></div><div className="lrow" ><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 9.4h3.6L12 5.4v13.2L7.6 14.6H4z"/><path className="" d="M15.6 9.6a4.2 4.2 0 0 1 0 4.8"/><path className="" d="M18.4 7a8 8 0 0 1 0 10"/></svg></span>
                <span className="col grow gap-[2px]" ><span className="t-tm c1" >Volume normalization</span><span className="t-bs c3" >Even loudness</span></span>
                <button className="sw none" aria-label="Volume normalization"><i></i></button></div><div className="lrow" ><span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3.6 17.4a9 9 0 1 1 16.8 0"/><path className="" d="m12 13.4 4.2-4.6"/><circle className="" cx="12" cy="14.6" r="1.6"/></svg></span>
                <span className="col grow gap-[2px]" ><span className="t-tm c1" >Playback speed</span><span className="t-bs c3" >1.0× · pitch preserved</span></span>
                <svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m9.2 5 7 7-7 7"/></svg></div>
          </div>
          <div className="surf col p-[18px] gap-[14px]" >
            <span className="t-ov c3" >Audio output</span>
            <div className="row g12" >
                <span className="icobox icobox-gold" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 15.4v-3.2a8 8 0 0 1 16 0v3.2"/><rect className="" x="2.4" y="13.8" width="4.6" height="6.8" rx="2.3"/><rect className="" x="17" y="13.8" width="4.6" height="6.8" rx="2.3"/></svg></span>
                <span className="col grow gap-[2px]" ><span className="t-tm c1" >Wired headphones</span><span className="t-bs c3" >Active · EQ applied</span></span>
                <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{'color': 'var(--gold)'}}><path className="" d="m4.8 12.4 4.8 4.8L19.4 6.6"/></svg></div><div className="row g12" >
                <span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m8.4 7.4 7.2 9.2-3.6 3V4.4l3.6 3-7.2 9.2"/></svg></span>
                <span className="col grow gap-[2px]" ><span className="t-tm c2" >SoundCore Q30</span><span className="t-bs c3" >Paired, not connected</span></span>
                </div><div className="row g12" >
                <span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="3" y="5.4" width="10.6" height="13.2" rx="2.2"/><path className="" d="M8.3 9.6v4.8"/><path className="" d="M17 9.2a4.4 4.4 0 0 1 0 5.6"/><path className="" d="M19.9 6.6a8.4 8.4 0 0 1 0 10.8"/></svg></span>
                <span className="col grow gap-[2px]" ><span className="t-tm c2" >Living Room Speaker</span><span className="t-bs c3" >Requires Online Mode</span></span>
                </div>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}