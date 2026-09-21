import React from 'react';

export default function Sidebar() {
  return (
<div className="side">
<div className="row g10" style={{'height': '64px', 'padding': '0 18px', 'flex': 'none', 'borderBottom': '1px solid var(--ln)'}}>
  <span className="row center none" style={{'width': '28px', 'height': '28px', 'borderRadius': '9px', 'background': 'var(--acc)', 'color': '#000'}}><img src="/assets/icon_bdac7729.svg" className="ic" alt="icon" /></span>
  <span className="col grow" style={{'gap': '0'}}>
    <span className="t-tl c1" style={{'letterSpacing': '-.3px'}}>Sonare</span>
  </span>
  <button className="ib ib-28 flex-none" aria-label="Collapse sidebar"><img src="/assets/icon_1203b66f.svg" className="ic" alt="icon" /></button>
</div>
<div className="col" style={{'padding': '12px 10px', 'gap': '2px', 'flex': 'none'}}>
  <a className="sitem on" href="D01-Home-Online.html"><img src="/assets/icon_95da718e.svg" className="ic" alt="icon" />Home</a><a className="sitem" href="D03-Search-Online.html"><img src="/assets/icon_15fd7a20.svg" className="ic" alt="icon" />Search</a><a className="sitem" href="D05-Library.html"><img src="/assets/icon_247b7863.svg" className="ic" alt="icon" />Your Library</a><a className="sitem" href="D08-Playlist.html"><img src="/assets/icon_bf1d122d.svg" className="ic" alt="icon" />Playlists</a>
</div>
<span className="hr" style={{'margin': '4px 16px'}}></span>
<div className="col" style={{'padding': '12px 10px 6px', 'gap': '2px', 'flex': 'none'}}>
  <span className="t-ov c3" style={{'padding': '0 12px 8px'}}>Library</span>
  <a className="sitem" href="D05-Library.html"><img src="/assets/icon_69dd7266.svg" className="ic" alt="icon" />Songs</a><a className="sitem" href="D05-Library.html"><img src="/assets/icon_cda81597.svg" className="ic" alt="icon" />Albums</a><a className="sitem" href="D05-Library.html"><img src="/assets/icon_c6d2a6d1.svg" className="ic" alt="icon" />Artists</a><a className="sitem" href="D05-Library.html"><img src="/assets/icon_7b1fd58c.svg" className="ic" alt="icon" />Genres</a><a className="sitem" href="D16-Folders.html"><img src="/assets/icon_a5aff021.svg" className="ic" alt="icon" />Folders</a>
</div>
<span className="hr" style={{'margin': '4px 16px'}}></span>
<div className="col grow" style={{'padding': '12px 10px', 'gap': '2px', 'overflow': 'hidden'}}>
  <div className="row between" style={{'padding': '0 12px 8px'}}>
    <span className="text-[11px] leading-[14px] font-semibold tracking-[0.9px] uppercase text-t3">Playlists</span>
    <button className="ib ib-28 flex-none" aria-label="New playlist"><img src="/assets/icon_f9c40856.svg" className="ic" alt="icon" /></button>
  </div>
  <a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a1 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Late Drive</span>
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Local · 42</span>
    </span>
    <span className="none" style={{'color': 'var(--gold)'}}><img src="/assets/icon_78a5e0d5.svg" className="ic" alt="icon" /></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a5 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Focus / Deep Work</span>
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Synced · 88</span>
    </span>
    <span className="none" style={{'color': 'var(--blue)'}}><img src="/assets/icon_a5bb4394.svg" className="ic" alt="icon" /></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a3 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Rainy Window</span>
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Local · 27</span>
    </span>
    <span className="none" style={{'color': 'var(--gold)'}}><img src="/assets/icon_78a5e0d5.svg" className="ic" alt="icon" /></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a6 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Downloaded ★</span>
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Local · 156</span>
    </span>
    <span className="none" style={{'color': 'var(--gold)'}}><img src="/assets/icon_78a5e0d5.svg" className="ic" alt="icon" /></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a2 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Weekend Warmup</span>
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Online · 35</span>
    </span>
    <span className="none" style={{'color': 'var(--acc)'}}><img src="/assets/icon_1eff1585.svg" className="ic" alt="icon" /></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a4 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="text-[13px] leading-[16px] font-medium text-t1 truncate">Liked Songs</span>
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3 truncate">Local · 214</span>
    </span>
    <span className="none" style={{'color': 'var(--gold)'}}><img src="/assets/icon_78a5e0d5.svg" className="ic" alt="icon" /></span>
  </a>
</div>
<div className="col none" style={{'padding': '12px', 'borderTop': '1px solid var(--ln)'}}>
  <div className="onstrip" style={{'padding': '10px 12px'}}><span className="dot dot-acc"></span>
         <span className="col grow" style={{'gap': '1px'}}><span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-acc">ONLINE · SYNCED</span>
         <span className="text-[11px] leading-[14px] font-medium tracking-[0.4px] text-t3">Last sync 3 min ago</span></span></div>
</div>
</div>
  );
}
