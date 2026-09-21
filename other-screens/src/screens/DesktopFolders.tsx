import React from 'react';
import DesktopLayout from '../components/DesktopLayout';

export default function DesktopFolders() {
  return (
    <>
<DesktopLayout>
<div className="col gap-[28px]" style={{'padding': '26px 32px 0'}}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-[4px]"><span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Local music &amp; folders</span>
        <span className="text-[14px] leading-[20px] font-normal text-t2">Choose which folders Sonare scans. Excluded folders never appear in your library or search.</span></div>
        <div className="flex flex-row items-center gap-[10px]">
          <button className="btn btn-out"><img src="/assets/icon_a97714d8.svg" className="ic" alt="icon" />Add folder</button>
          <button className="btn btn-gold"><img src="/assets/icon_bde1bdda.svg" className="ic" alt="icon" />Scan now</button>
        </div>
      </div>

      <div className="flex flex-row items-center gap-[16px]">
        <div className="bg-s1 border border-ln rounded-lg flex flex-col flex-grow min-w-0 p-[20px] gap-[14px]">
          <div className="flex flex-row items-center justify-between">
            <span className="flex flex-col gap-[3px]"><span className="text-[15px] leading-[22px] font-medium text-t1">Device storage</span>
            <span className="text-[13px] leading-[18px] font-normal text-t3">16.7 GB of music across 5 folders · 2,184 songs indexed</span></span>
            <span className="t-mono text-t2">59.3 GB free of 128 GB</span>
          </div>
          <span className="track track-gold h-[10px] rounded-[5px]"><i className="w-[28%]"></i></span>
          <div className="flex flex-row items-center gap-[24px]">
            <span className="flex flex-row items-center gap-[8px]"><i className="dot" style={{'background': 'var(--gold)'}}></i>
              <span className="text-[13px] leading-[18px] font-normal text-t2">Albums</span><span className="text-[13px] leading-[18px] font-normal text-t3">6.1 GB</span></span><span className="flex flex-row items-center gap-[8px]"><i className="dot" style={{'background': 'var(--blue)'}}></i>
              <span className="text-[13px] leading-[18px] font-normal text-t2">SD card</span><span className="text-[13px] leading-[18px] font-normal text-t3">8.7 GB</span></span><span className="flex flex-row items-center gap-[8px]"><i className="dot" style={{'background': 'var(--acc)'}}></i>
              <span className="text-[13px] leading-[18px] font-normal text-t2">Downloads</span><span className="text-[13px] leading-[18px] font-normal text-t3">1.4 GB</span></span><span className="flex flex-row items-center gap-[8px]"><i className="dot" style={{'background': 'var(--t4)'}}></i>
              <span className="text-[13px] leading-[18px] font-normal text-t2">Other</span><span className="text-[13px] leading-[18px] font-normal text-t3">0.5 GB</span></span>
          </div>
        </div>
        <div className="flex flex-col flex-none w-[330px] gap-[10px]">
          <div className="empty" style={{'padding': '22px 18px', 'borderColor': 'rgba(255,194,77,.35)', 'background': 'var(--goldbg)'}}>
            <span className="empty-ic w-[44px] h-[44px] mb-[2px]" style={{'background': 'rgba(255,194,77,.16)', 'color': 'var(--gold)'}}><img src="/assets/icon_5ff67f9f.svg" className="ic" alt="icon" /></span>
            <span className="text-[15px] leading-[22px] font-medium text-gold">Drop music files here</span>
            <span className="text-[13px] leading-[18px] font-normal text-t2">MP3, FLAC, M4A, OGG, WAV, OPUS</span>
          </div>
          <div className="flex flex-row items-center gap-[8px] text-[13px] leading-[18px] font-normal text-t3"><span className="dot dot-gold"></span>Last scan 12 min ago · 6 new songs found</div>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <div className="shead"><span className="text-[20px] leading-[26px] font-semibold tracking-[-0.1px] text-t1">Scanned folders</span>
          <span className="flex flex-row items-center gap-[8px]"><button className="chip chip-sm"><img src="/assets/icon_7501d6dc.svg" className="ic" alt="icon" />Most songs<img src="/assets/icon_af776a80.svg" className="ic" alt="icon" /></button>
          <button className="chip chip-sm"><img src="/assets/icon_9b32a01b.svg" className="ic" alt="icon" />Show excluded</button></span></div>
        <div className="surf col" style={{'padding': '4px 0'}}>
          <div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '10px 20px', 'borderBottom': '1px solid var(--ln)'}}>
            <span></span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">FOLDER</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">PATH</span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">SONGS</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">SIZE</span>
            <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">LAST SCAN</span><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 text-right">INCLUDE</span>
          </div>
          <div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px'}}>
            <span className="icobox icobox-gold"><img src="/assets/icon_752feee6.svg" className="ic" alt="icon" /></span>
            <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Music/Albums</span>
            <span className="t-mono-s text-t3 truncate">/storage/emulated/0/Music/Albums</span>
            <span className="t-mono-s text-t2 text-right">842</span>
            <span className="t-mono-s text-t2 text-right">6.1 GB</span>
            <span className="text-[13px] leading-[18px] font-normal text-t3">12 min ago</span>
            <span className="flex flex-row items-center justify-end"><button className="sw gold on" aria-label="Include Music/Albums"><i></i></button></span>
          </div><div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px', 'borderTop': '1px solid var(--ln)'}}>
            <span className="icobox icobox-gold"><img src="/assets/icon_752feee6.svg" className="ic" alt="icon" /></span>
            <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">Music/Downloads</span>
            <span className="t-mono-s text-t3 truncate">/storage/emulated/0/Music/Downloads</span>
            <span className="t-mono-s text-t2 text-right">204</span>
            <span className="t-mono-s text-t2 text-right">1.4 GB</span>
            <span className="text-[13px] leading-[18px] font-normal text-t3">12 min ago</span>
            <span className="flex flex-row items-center justify-end"><button className="sw gold on" aria-label="Include Music/Downloads"><i></i></button></span>
          </div><div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px', 'borderTop': '1px solid var(--ln)'}}>
            <span className="icobox icobox-gold"><img src="/assets/icon_bd0b5b4c.svg" className="ic" alt="icon" /></span>
            <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">SD Card/Music</span>
            <span className="t-mono-s text-t3 truncate">/storage/sdcard1/Music</span>
            <span className="t-mono-s text-t2 text-right">1130</span>
            <span className="t-mono-s text-t2 text-right">8.7 GB</span>
            <span className="text-[13px] leading-[18px] font-normal text-t3">12 min ago</span>
            <span className="flex flex-row items-center justify-end"><button className="sw gold on" aria-label="Include SD Card/Music"><i></i></button></span>
          </div><div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px', 'borderTop': '1px solid var(--ln)'}}>
            <span className="icobox"><img src="/assets/icon_752feee6.svg" className="ic" alt="icon" /></span>
            <span className="text-[15px] leading-[22px] font-medium text-t3 truncate">Recordings</span>
            <span className="t-mono-s text-t3 truncate">/storage/emulated/0/Recordings</span>
            <span className="t-mono-s text-t4 text-right">18</span>
            <span className="t-mono-s text-t4 text-right">240 MB</span>
            <span className="text-[13px] leading-[18px] font-normal text-t3">Excluded</span>
            <span className="flex flex-row items-center justify-end"><button className="sw" aria-label="Include Recordings"><i></i></button></span>
          </div><div className="grid gap-[18px] items-center" style={{'gridTemplateColumns': '44px minmax(0,2fr) minmax(0,2.4fr) 110px 100px 120px 56px', 'padding': '12px 20px', 'borderTop': '1px solid var(--ln)'}}>
            <span className="icobox"><img src="/assets/icon_752feee6.svg" className="ic" alt="icon" /></span>
            <span className="text-[15px] leading-[22px] font-medium text-t3 truncate">WhatsApp Audio</span>
            <span className="t-mono-s text-t3 truncate">/storage/emulated/0/WhatsApp/Media</span>
            <span className="t-mono-s text-t4 text-right">63</span>
            <span className="t-mono-s text-t4 text-right">310 MB</span>
            <span className="text-[13px] leading-[18px] font-normal text-t3">Excluded</span>
            <span className="flex flex-row items-center justify-end"><button className="sw" aria-label="Include WhatsApp Audio"><i></i></button></span>
          </div>
        </div>
      </div>
    </div></DesktopLayout>
    </>
  );
}