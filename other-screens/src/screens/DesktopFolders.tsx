import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopFolders() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="row between" >
        <div className="col gap-[4px]" ><span className="t-dis2 c1" >Local music &amp; folders</span>
        <span className="t-bm c2" >Choose which folders Sonare scans. Excluded folders never appear in your library or search.</span></div>
        <div className="row g10" >
          <button className="btn btn-out" ><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 4.2v15.6M4.2 12h15.6"/></svg>Add folder</button>
          <button className="btn btn-gold" ><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 8.4V5.6A1.6 1.6 0 0 1 5.6 4h2.8M15.6 4h2.8A1.6 1.6 0 0 1 20 5.6v2.8M20 15.6v2.8a1.6 1.6 0 0 1-1.6 1.6h-2.8M8.4 20H5.6A1.6 1.6 0 0 1 4 18.4v-2.8"/><path className="" d="M4 12h16"/></svg>Scan now</button>
        </div>
      </div>

      <div className="row g16" >
        <div className="surf col grow p-[20px] gap-[14px]" >
          <div className="row between" >
            <span className="col gap-[3px]" ><span className="t-tm c1" >Device storage</span>
            <span className="t-bs c3" >16.7 GB of music across 5 folders · 2,184 songs indexed</span></span>
            <span className="t-mono c2" >59.3 GB free of 128 GB</span>
          </div>
          <span className="track track-gold h-[10px] rounded-[5px]" ><i className="w-[28%]" ></i></span>
          <div className="row g24" >
            <span className="row g8" ><i className="dot" style={{'background': 'var(--gold)'}}></i>
              <span className="t-bs c2" >Albums</span><span className="t-bs c3" >6.1 GB</span></span><span className="row g8" ><i className="dot" style={{'background': 'var(--blue)'}}></i>
              <span className="t-bs c2" >SD card</span><span className="t-bs c3" >8.7 GB</span></span><span className="row g8" ><i className="dot" style={{'background': 'var(--acc)'}}></i>
              <span className="t-bs c2" >Downloads</span><span className="t-bs c3" >1.4 GB</span></span><span className="row g8" ><i className="dot" style={{'background': 'var(--t4)'}}></i>
              <span className="t-bs c2" >Other</span><span className="t-bs c3" >0.5 GB</span></span>
          </div>
        </div>
        <div className="col none w-[330px] gap-[10px]" >
          <div className="empty" style={{'padding': '22px 18px', 'borderColor': 'rgba(255,194,77,.35)', 'background': 'var(--goldbg)'}}>
            <span className="empty-ic w-[44px] h-[44px] mb-[2px]" style={{'background': 'rgba(255,194,77,.16)', 'color': 'var(--gold)'}}><svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M12 4v15.6M6 13.6l6 6 6-6"/></svg></span>
            <span className="t-tm cgold" >Drop music files here</span>
            <span className="t-bs c2" >MP3, FLAC, M4A, OGG, WAV, OPUS</span>
          </div>
          <div className="row g8 t-bs c3" ><span className="dot dot-gold" ></span>Last scan 12 min ago · 6 new songs found</div>
        </div>
      </div>

      <div className="col gap-[12px]" >
        <div className="shead" ><span className="t-h2 c1" >Scanned folders</span>
          <span className="row g8" ><button className="chip chip-sm" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7 3.6v16.8M7 20.4l-3.2-3.2M7 20.4l3.2-3.2"/><path className="" d="M17 20.4V3.6M17 3.6l-3.2 3.2M17 3.6l3.2 3.2"/></svg>Most songs<svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5 9.2 7 7 7-7"/></svg></button>
          <button className="chip chip-sm" ><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 3l18 18"/><path className="" d="M10.6 6.3A9 9 0 0 1 12 6.2c5 0 9 5.8 9 5.8a16 16 0 0 1-3 3.4"/><path className="" d="M6.6 8.2A15.6 15.6 0 0 0 3 12s4 5.8 9 5.8a8.6 8.6 0 0 0 3.4-.7"/><path className="" d="M10.2 10.4a2.4 2.4 0 0 0 3.4 3.4"/></svg>Show excluded</button></span></div>
        <div className="surf col" style={{'padding': '4px 0'}}>
          <div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '10px 20px', 'borderBottom': '1px solid var(--ln)'}}>
            <span></span><span className="t-ls c3" >FOLDER</span><span className="t-ls c3" >PATH</span>
            <span className="t-ls c3 text-right" >SONGS</span><span className="t-ls c3 text-right" >SIZE</span>
            <span className="t-ls c3" >LAST SCAN</span><span className="t-ls c3 text-right" >INCLUDE</span>
          </div>
          <div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px'}}>
            <span className="icobox icobox-gold" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span>
            <span className="t-tm c1 trunc" >Music/Albums</span>
            <span className="t-mono-s c3 trunc" >/storage/emulated/0/Music/Albums</span>
            <span className="t-mono-s c2 text-right" >842</span>
            <span className="t-mono-s c2 text-right" >6.1 GB</span>
            <span className="t-bs c3" >12 min ago</span>
            <span className="row justify-end" ><button className="sw gold on" aria-label="Include Music/Albums"><i></i></button></span>
          </div><div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px', 'borderTop': '1px solid var(--ln)'}}>
            <span className="icobox icobox-gold" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span>
            <span className="t-tm c1 trunc" >Music/Downloads</span>
            <span className="t-mono-s c3 trunc" >/storage/emulated/0/Music/Downloads</span>
            <span className="t-mono-s c2 text-right" >204</span>
            <span className="t-mono-s c2 text-right" >1.4 GB</span>
            <span className="t-bs c3" >12 min ago</span>
            <span className="row justify-end" ><button className="sw gold on" aria-label="Include Music/Downloads"><i></i></button></span>
          </div><div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px', 'borderTop': '1px solid var(--ln)'}}>
            <span className="icobox icobox-gold" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M6.4 3.6h7L18 8.2v12.2H6.4z"/><path className="" d="M9.6 6.4v3M12.2 6.4v3M14.8 7.6v1.8"/></svg></span>
            <span className="t-tm c1 trunc" >SD Card/Music</span>
            <span className="t-mono-s c3 trunc" >/storage/sdcard1/Music</span>
            <span className="t-mono-s c2 text-right" >1130</span>
            <span className="t-mono-s c2 text-right" >8.7 GB</span>
            <span className="t-bs c3" >12 min ago</span>
            <span className="row justify-end" ><button className="sw gold on" aria-label="Include SD Card/Music"><i></i></button></span>
          </div><div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px', 'borderTop': '1px solid var(--ln)'}}>
            <span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span>
            <span className="t-tm c3 trunc" >Recordings</span>
            <span className="t-mono-s c3 trunc" >/storage/emulated/0/Recordings</span>
            <span className="t-mono-s c4 text-right" >18</span>
            <span className="t-mono-s c4 text-right" >240 MB</span>
            <span className="t-bs c3" >Excluded</span>
            <span className="row justify-end" ><button className="sw" aria-label="Include Recordings"><i></i></button></span>
          </div><div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px', 'borderTop': '1px solid var(--ln)'}}>
            <span className="icobox" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span>
            <span className="t-tm c3 trunc" >WhatsApp Audio</span>
            <span className="t-mono-s c3 trunc" >/storage/emulated/0/WhatsApp/Media</span>
            <span className="t-mono-s c4 text-right" >63</span>
            <span className="t-mono-s c4 text-right" >310 MB</span>
            <span className="t-bs c3" >Excluded</span>
            <span className="row justify-end" ><button className="sw" aria-label="Include WhatsApp Audio"><i></i></button></span>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}