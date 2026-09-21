import React from 'react';

export default function Topbar() {
  return (
<div className="topbar">
<span className="row g4 none">
<button className="ib ib-32" aria-label="Back"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14.8 5-7 7 7 7"/></svg></button>
<button className="ib ib-32" aria-label="Forward"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9.2 5 7 7-7 7"/></svg></button>
</span>
<label className="field field-sq none" style={{'width': '380px', 'height': '38px', 'cursor': 'text'}}>
<svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.8"/><path d="m16 16 5 5"/></svg>
<input type="text" value="" placeholder="Search songs, albums, artists" aria-label="Search" />
<span className="kbd none">Ctrl K</span>
</label>
<span className="grow"></span>
<span className="seg">
<a className="seg-i seg-on-cloud" href="D01-Home-Online.html" aria-current="true"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg>Online</a>
<a className="seg-i " href="D02-Home-Offline.html" aria-current="false"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path d="M10.4 18.4h3.2"/></svg>Offline</a>
</span>
<span className="vr none" style={{'height': '24px'}}></span>
<button className="ib ib-32 none" aria-label="Sync status"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.4 12a8.4 8.4 0 0 1-14.6 5.8"/><path d="M3.6 12a8.4 8.4 0 0 1 14.6-5.8"/><path d="M18.2 3.2v3.4h-3.4"/><path d="M5.8 20.8v-3.4h3.4"/></svg></button>
<a className="ib ib-32 none" href="D15-Settings.html" aria-label="Settings"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 3.4v2.2M12 18.4v2.2M20.6 12h-2.2M5.6 12H3.4M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6M18.1 18.1l-1.6-1.6M7.5 7.5 5.9 5.9"/></svg></a>
<button className="ib ib-32 none" aria-label="Your profile" style={{'padding': '0'}}>
<span className="art a5 art-circ" style={{'width': '26px', 'height': '26px', 'display': 'block'}}></span></button>
<span className="vr none" style={{'height': '24px'}}></span>
<span className="wctl none">
<button aria-label="Minimize"><svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.4 12h13.2"/></svg></button>
<button aria-label="Maximize"><svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5.6" y="5.6" width="12.8" height="12.8" rx="1.6"/></svg></button>
<button className="cls" aria-label="Close"><svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4"/></svg></button>
</span>
  </div>
  );
}
