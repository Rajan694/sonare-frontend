import React from 'react';

export default function Topbar() {
  return (
<div className="topbar">
<span className="flex flex-row items-center gap-[4px] flex-none">
<button className="ib ib-32" aria-label="Back"><img src="/assets/chevron_left.svg" className="ic" alt="icon" /></button>
<button className="ib ib-32" aria-label="Forward"><img src="/assets/chevron_right_2.svg" className="ic" alt="icon" /></button>
</span>
<label className="field field-sq none" style={{'width': '380px', 'height': '38px', 'cursor': 'text'}}>
<img src="/assets/icon_96.svg" className="ic" alt="icon" />
<input type="text" value="" placeholder="Search songs, albums, artists" aria-label="Search" />
<span className="kbd flex-none">Ctrl K</span>
</label>
<span className="flex-grow min-w-0"></span>
<span className="seg">
<a className="seg-i seg-on-cloud" href="D01-Home-Online.html" aria-current="true"><img src="/assets/cloud_8.svg" className="ic" alt="icon" />Online</a>
<a className="seg-i" href="D02-Home-Offline.html" aria-current="false"><img src="/assets/smartphone_6.svg" className="ic" alt="icon" />Offline</a>
</span>
<span className="vr none" style={{'height': '24px'}}></span>
<button className="ib ib-32 flex-none" aria-label="Sync status"><img src="/assets/sync_3.svg" className="ic" alt="icon" /></button>
<a className="ib ib-32 flex-none" href="D15-Settings.html" aria-label="Settings"><img src="/assets/icon_54.svg" className="ic" alt="icon" /></a>
<button className="ib ib-32 none" aria-label="Your profile" style={{'padding': '0'}}>
<span className="art a5 art-circ" style={{'width': '26px', 'height': '26px', 'display': 'block'}}></span></button>
<span className="vr none" style={{'height': '24px'}}></span>
<span className="wctl flex-none">
<button aria-label="Minimize"><img src="/assets/icon_93.svg" className="ic" alt="icon" /></button>
<button aria-label="Maximize"><img src="/assets/icon_32.svg" className="ic" alt="icon" /></button>
<button className="cls" aria-label="Close"><img src="/assets/icon_23.svg" className="ic" alt="icon" /></button>
</span>
  </div>
  );
}
