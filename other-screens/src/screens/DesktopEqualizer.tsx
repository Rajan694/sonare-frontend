import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopEqualizer() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-[4px]"><span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Audio</span>
        <span className="text-[14px] leading-[20px] font-normal text-t2">Equalizer, effects and output — applied to local and streamed playback</span></div>
        <div className="flex flex-row items-center gap-[10px]">
          <button className="btn btn-out"><img src="/assets/icon_3461dc73.svg" className="ic" alt="icon" />Reset</button>
          <button className="btn btn-out"><img src="/assets/icon_a97714d8.svg" className="ic" alt="icon" />Save preset</button>
          <span className="flex flex-row items-center gap-[10px] flex-none ml-[6px]"><span className="text-[15px] leading-[22px] font-medium text-t2">Equalizer</span>
          <button className="sw on" aria-label="Equalizer enabled"><i></i></button></span>
        </div>
      </div>

      <div className="flex flex-row items-center gap-[8px]"><button className="chip">Flat</button><button className="chip chip-on">Sonare</button><button className="chip">Bass</button><button className="chip">Vocal</button><button className="chip">Acoustic</button><button className="chip">Late night</button><button className="chip">Custom</button></div>

      <div className="flex flex-row items-center gap-[24px] items-start">
        <div className="surf col grow gap-[18px] min-w-[0]" style={{'padding': '24px 24px 18px'}}>
          <div className="flex flex-row items-center justify-between">
            <span className="text-[15px] leading-[22px] font-medium text-t1">9-band graphic equalizer</span>
            <span className="t-mono-s text-t3">Range ±12 dB · 44.1 kHz</span>
          </div>
          <div className="row between items-end" style={{'padding': '0 8px'}}>
            <span className="vs w-[52px]">
              <span className="t-mono-s text-t2">+1</span>
              <span className="vs-rail h-[200px]"><i className="h-[55%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '55%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">32</span></span><span className="vs w-[52px]">
              <span className="t-mono-s text-t2">+4</span>
              <span className="vs-rail h-[200px]"><i className="h-[68%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '68%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">64</span></span><span className="vs w-[52px]">
              <span className="t-mono-s text-t2">0</span>
              <span className="vs-rail h-[200px]"><i className="h-[52%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '52%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">150</span></span><span className="vs w-[52px]">
              <span className="t-mono-s text-t2">-1</span>
              <span className="vs-rail h-[200px]"><i className="h-[44%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '44%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">400</span></span><span className="vs w-[52px]">
              <span className="t-mono-s text-t2">+2</span>
              <span className="vs-rail h-[200px]"><i className="h-[58%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '58%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">1k</span></span><span className="vs w-[52px]">
              <span className="t-mono-s text-t2">+5</span>
              <span className="vs-rail h-[200px]"><i className="h-[72%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '72%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">2.4k</span></span><span className="vs w-[52px]">
              <span className="t-mono-s text-t2">+3</span>
              <span className="vs-rail h-[200px]"><i className="h-[61%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '61%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">6k</span></span><span className="vs w-[52px]">
              <span className="t-mono-s text-t2">0</span>
              <span className="vs-rail h-[200px]"><i className="h-[50%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '50%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">14k</span></span><span className="vs w-[52px]">
              <span className="t-mono-s text-t2">-1</span>
              <span className="vs-rail h-[200px]"><i className="h-[47%]" style={{'bottom': '0'}}></i><b className="" style={{'bottom': '47%'}}></b></span>
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">20k</span></span>
          </div>
          <span className="h-[1px] bg-ln border-0 m-0 block"></span>
          <div className="flex flex-row items-center gap-[32px]">
            <span className="flex flex-col flex-grow min-w-0 gap-[8px]"><span className="flex flex-row items-center justify-between"><span className="text-[13px] leading-[16px] font-medium text-t2">Bass boost</span><span className="t-mono-s text-t1">42%</span></span><span className="track" style={{}}><i className="w-[42%]"></i><b className="" style={{'left': '42%'}}></b></span></span>
            <span className="flex flex-col flex-grow min-w-0 gap-[8px]"><span className="flex flex-row items-center justify-between"><span className="text-[13px] leading-[16px] font-medium text-t2">Virtualizer</span><span className="t-mono-s text-t1">26%</span></span><span className="track" style={{}}><i className="w-[26%]"></i><b className="" style={{'left': '26%'}}></b></span></span>
            <span className="flex flex-col flex-grow min-w-0 gap-[8px]"><span className="flex flex-row items-center justify-between"><span className="text-[13px] leading-[16px] font-medium text-t2">Loudness</span><span className="t-mono-s text-t1">15%</span></span><span className="track" style={{}}><i className="w-[15%]"></i><b className="" style={{'left': '15%'}}></b></span></span>
          </div>
        </div>

        <div className="flex flex-col w-[380px] flex-none gap-[16px]">
          <div className="surf col" style={{'padding': '4px 0'}}>
            <div className="lrow"><span className="icobox"><img src="/assets/icon_098dee3c.svg" className="ic" alt="icon" /></span>
                <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Crossfade</span><span className="text-[13px] leading-[18px] font-normal text-t3">6 seconds</span></span>
                <button className="sw on flex-none" aria-label="Crossfade"><i></i></button></div><div className="lrow"><span className="icobox"><img src="/assets/icon_bef45ac6.svg" className="ic" alt="icon" /></span>
                <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Gapless playback</span><span className="text-[13px] leading-[18px] font-normal text-t3">Album transitions</span></span>
                <button className="sw on flex-none" aria-label="Gapless playback"><i></i></button></div><div className="lrow"><span className="icobox"><img src="/assets/icon_6689ee8d.svg" className="ic" alt="icon" /></span>
                <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Volume normalization</span><span className="text-[13px] leading-[18px] font-normal text-t3">Even loudness</span></span>
                <button className="sw flex-none" aria-label="Volume normalization"><i></i></button></div><div className="lrow"><span className="icobox"><img src="/assets/icon_dcee9c6d.svg" className="ic" alt="icon" /></span>
                <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Playback speed</span><span className="text-[13px] leading-[18px] font-normal text-t3">1.0× · pitch preserved</span></span>
                <img src="/assets/icon_8d91587c.svg" className="ic" alt="icon" /></div>
          </div>
          <div className="bg-s1 border border-ln rounded-lg flex flex-col p-[18px] gap-[14px]">
            <span className="text-[11px] leading-[14px] font-semibold tracking-[0.9px] uppercase text-t3">Audio output</span>
            <div className="flex flex-row items-center gap-[12px]">
                <span className="icobox icobox-gold"><img src="/assets/icon_863eacce.svg" className="ic" alt="icon" /></span>
                <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Wired headphones</span><span className="text-[13px] leading-[18px] font-normal text-t3">Active · EQ applied</span></span>
                <img src="/assets/icon_432bcbd4.svg" className="ic" alt="icon" /></div><div className="flex flex-row items-center gap-[12px]">
                <span className="icobox"><img src="/assets/icon_7025db2a.svg" className="ic" alt="icon" /></span>
                <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t2">SoundCore Q30</span><span className="text-[13px] leading-[18px] font-normal text-t3">Paired, not connected</span></span>
                </div><div className="flex flex-row items-center gap-[12px]">
                <span className="icobox"><img src="/assets/icon_da948d63.svg" className="ic" alt="icon" /></span>
                <span className="flex flex-col flex-grow min-w-0 gap-[2px]"><span className="text-[15px] leading-[22px] font-medium text-t2">Living Room Speaker</span><span className="text-[13px] leading-[18px] font-normal text-t3">Requires Online Mode</span></span>
                </div>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}