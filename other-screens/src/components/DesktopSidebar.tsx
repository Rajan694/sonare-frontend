import React from 'react';

export default function Sidebar() {
  return (
<div className="side">
<div className="row g10" style={{'height': '64px', 'padding': '0 18px', 'flex': 'none', 'borderBottom': '1px solid var(--ln)'}}>
  <span className="row center none" style={{'width': '28px', 'height': '28px', 'borderRadius': '9px', 'background': 'var(--acc)', 'color': '#000'}}><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18.2V5.6l11-2v12.2"/><ellipse cx="6.2" cy="18.2" rx="3" ry="2.6"/><ellipse cx="17.2" cy="15.8" rx="2.8" ry="2.5"/></svg></span>
  <span className="col grow" style={{'gap': '0'}}>
    <span className="t-tl c1" style={{'letterSpacing': '-.3px'}}>Sonare</span>
  </span>
  <button className="ib ib-28 none" aria-label="Collapse sidebar"><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.2h5.2V4M20 9.2h-5.2V4M20 14.8h-5.2V20M4 14.8h5.2V20"/></svg></button>
</div>
<div className="col" style={{'padding': '12px 10px', 'gap': '2px', 'flex': 'none'}}>
  <a className="sitem on" href="D01-Home-Online.html"><svg className="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10.6 12 3.2l9 7.4"/><path d="M5.6 9.4V20.4h12.8V9.4"/><path d="M9.8 20.4v-5.6h4.4v5.6"/></svg>Home</a><a className="sitem " href="D03-Search-Online.html"><svg className="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.8"/><path d="m16 16 5 5"/></svg>Search</a><a className="sitem " href="D05-Library.html"><svg className="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="3.6" height="16" rx="1.2"/><rect x="8.6" y="4" width="3.6" height="16" rx="1.2"/><path d="M15.6 5.4 19 6.6a1.2 1.2 0 0 1 .8 1.5l-3.4 11.5"/></svg>Your Library</a><a className="sitem " href="D08-Playlist.html"><svg className="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6.5h12M3 11.5h12M3 16.5h7"/><circle cx="17.4" cy="17.2" r="2.6"/><path d="M20 17.2V7.4l1.6.7"/></svg>Playlists</a>
</div>
<span className="hr" style={{'margin': '4px 16px'}}></span>
<div className="col" style={{'padding': '12px 10px 6px', 'gap': '2px', 'flex': 'none'}}>
  <span className="t-ov c3" style={{'padding': '0 12px 8px'}}>Library</span>
  <a className="sitem " href="D05-Library.html"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18.2V5.6l11-2v12.2"/><ellipse cx="6.2" cy="18.2" rx="3" ry="2.6"/><ellipse cx="17.2" cy="15.8" rx="2.8" ry="2.5"/></svg>Songs</a><a className="sitem " href="D05-Library.html"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="2.2"/></svg>Albums</a><a className="sitem " href="D05-Library.html"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2.6" width="6" height="11" rx="3"/><path d="M5.6 11.6a6.4 6.4 0 0 0 12.8 0"/><path d="M12 18v3.4"/></svg>Artists</a><a className="sitem " href="D05-Library.html"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.6"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.6"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.6"/><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="1.6"/></svg>Genres</a><a className="sitem " href="D16-Folders.html"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7.2a2 2 0 0 1 2-2h3.8L11 7.8h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Folders</a>
</div>
<span className="hr" style={{'margin': '4px 16px'}}></span>
<div className="col grow" style={{'padding': '12px 10px', 'gap': '2px', 'overflow': 'hidden'}}>
  <div className="row between" style={{'padding': '0 12px 8px'}}>
    <span className="t-ov c3">Playlists</span>
    <button className="ib ib-28 none" aria-label="New playlist"><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4.2v15.6M4.2 12h15.6"/></svg></button>
  </div>
  <a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a1 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="t-ll c1 trunc">Late Drive</span>
      <span className="t-ls c3 trunc">Local · 42</span>
    </span>
    <span className="none" style={{'color': 'var(--gold)'}}><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path d="M10.4 18.4h3.2"/></svg></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a5 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="t-ll c1 trunc">Focus / Deep Work</span>
      <span className="t-ls c3 trunc">Synced · 88</span>
    </span>
    <span className="none" style={{'color': 'var(--blue)'}}><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8"/><path d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8"/><path d="M18.2 3.2v3.4h-3.4"/><path d="M5.8 20.8v-3.4h3.4"/></svg></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a3 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="t-ll c1 trunc">Rainy Window</span>
      <span className="t-ls c3 trunc">Local · 27</span>
    </span>
    <span className="none" style={{'color': 'var(--gold)'}}><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path d="M10.4 18.4h3.2"/></svg></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a6 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="t-ll c1 trunc">Downloaded ★</span>
      <span className="t-ls c3 trunc">Local · 156</span>
    </span>
    <span className="none" style={{'color': 'var(--gold)'}}><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path d="M10.4 18.4h3.2"/></svg></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a2 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="t-ll c1 trunc">Weekend Warmup</span>
      <span className="t-ls c3 trunc">Online · 35</span>
    </span>
    <span className="none" style={{'color': 'var(--acc)'}}><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span>
  </a><a className="sitem " href="D08-Playlist.html" style={{'height': '44px'}}>
    <span className="art a4 art-r-xs" style={{'width': '30px', 'height': '30px', 'flex': 'none'}}></span>
    <span className="col grow" style={{'gap': '1px', 'minWidth': '0'}}>
      <span className="t-ll c1 trunc">Liked Songs</span>
      <span className="t-ls c3 trunc">Local · 214</span>
    </span>
    <span className="none" style={{'color': 'var(--gold)'}}><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path d="M10.4 18.4h3.2"/></svg></span>
  </a>
</div>
<div className="col none" style={{'padding': '12px', 'borderTop': '1px solid var(--ln)'}}>
  <div className="onstrip" style={{'padding': '10px 12px'}}><span className="dot dot-acc"></span>
         <span className="col grow" style={{'gap': '1px'}}><span className="t-ls cacc">ONLINE · SYNCED</span>
         <span className="t-ls c3">Last sync 3 min ago</span></span></div>
</div>
</div>
  );
}
