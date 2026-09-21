import React from 'react';

export default function DesktopNowPlayingOffline() {
  return (
    <>
<div className="scr w-[1440px] h-[900px] relative" >
  <div className="ambient absolute" style={{'inset': '0'}}>
    <i className="w-[760px] h-[760px]" style={{'left': '-160px', 'top': '-220px', 'background': '#2A5AA8'}}></i>
    <i className="w-[620px] h-[620px]" style={{'right': '-140px', 'top': '120px', 'background': '#A86B25'}}></i>
    <i className="w-[520px] h-[520px]" style={{'left': '520px', 'top': '460px', 'background': '#6B3FA0', 'opacity': '.32'}}></i>
  </div>

  <div className="col relative h-[900px]" >
    <div className="row between none h-[64px]" style={{'padding': '0 28px'}}>
      <a className="row g10 none no-underline" href="D02-Home-Offline.html" style={{'color': 'inherit'}}>
        <svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5 9.2 7 7 7-7"/></svg><span className="t-ll c2" >Back to library</span></a>
      <span className="col center none gap-[2px]" >
        <span className="t-ls c3" >PLAYING FROM ALBUM</span>
        <span className="t-ll c1" >Midnight Cartography</span>
      </span>
      <span className="row g4 none" >
        <span className="row g6 none h-[26px] rounded-[999px] mr-[6px]" style={{'padding': '0 10px', 'background': 'var(--goldbg)', 'color': 'var(--gold)'}}>
          <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg><span className="t-ls" >OFFLINE</span></span>
        <button className="ib ib-32" aria-label="Compact player"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="3.4" y="4.6" width="17.2" height="14.8" rx="2.2"/><rect className="" x="11.8" y="11.8" width="7" height="5.6" rx="1.2"/></svg></button>
        <button className="ib ib-32" aria-label="Exit full screen"><svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 9.2h5.2V4M20 9.2h-5.2V4M20 14.8h-5.2V20M4 14.8h5.2V20"/></svg></button>
      </span>
    </div>

    <div className="row grow g48 items-center gap-[56px]" style={{'padding': '0 72px'}}>
      <div className="col none gap-[30px] w-[460px]" >
        <div className="art a1 art-r-xl art-rings w-[460px] h-[460px]" style={{'boxShadow': '0 40px 100px -30px rgba(0,0,0,.95)'}}></div>
      </div>

      <div className="col grow gap-[22px] min-w-[0]" >
        <div className="col gap-[8px]" >
          <span className="t-dis c1" style={{'fontSize': '52px', 'lineHeight': '56px'}}>Paper Lanterns</span>
          <span className="t-h2 c2" >Hollow Coast</span>
          <div className="row g10 mt-[6px]" >
            <span className="row g6 none h-[26px] rounded-[999px]" style={{'padding': '0 10px', 'background': 'var(--goldbg)', 'color': 'var(--gold)'}}>
              <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg><span className="t-ls" >ON THIS DEVICE</span></span>
            <span className="t-mono-s c3" >FLAC · 1411 kbps · 24-bit · /Music/Albums</span>
          </div>
        </div>

        <div className="col gap-[8px] max-w-[620px]" >
          <span className="wave wave-gold h-[44px]" ><i className="on h-[18px]" ></i><i className="on h-[33px]" ></i><i className="on h-[19px]" ></i><i className="on h-[28px]" ></i><i className="on h-[25px]" ></i><i className="on h-[26px]" ></i><i className="on h-[30px]" ></i><i className="on h-[22px]" ></i><i className="on h-[31px]" ></i><i className="on h-[27px]" ></i><i className="on h-[20px]" ></i><i className="on h-[22px]" ></i><i className="on h-[34px]" ></i><i className="on h-[19px]" ></i><i className="on h-[23px]" ></i><i className="on h-[27px]" ></i><i className="on h-[36px]" ></i><i className="on h-[27px]" ></i><i className="on h-[30px]" ></i><i className="on h-[25px]" ></i><i className="on h-[32px]" ></i><i className="on h-[28px]" ></i><i className="on h-[30px]" ></i><i className="on h-[28px]" ></i><i className="on h-[32px]" ></i><i className="on h-[30px]" ></i><i className="on h-[27px]" ></i><i className="on h-[37px]" ></i><i className="on h-[35px]" ></i><i className="on h-[31px]" ></i><i className="on h-[39px]" ></i><i className="on h-[35px]" ></i><i className="on h-[27px]" ></i><i className="on h-[30px]" ></i><i className="on h-[26px]" ></i><i className="on h-[34px]" ></i><i className="on h-[44px]" ></i><i className="on h-[43px]" ></i><i className="on h-[35px]" ></i><i className="on h-[29px]" ></i><i className="on h-[33px]" ></i><i className="on h-[26px]" ></i><i className="on h-[37px]" ></i><i className="on h-[43px]" ></i><i className="on h-[32px]" ></i><i className="on h-[44px]" ></i><i className="on h-[32px]" ></i><i className="on h-[38px]" ></i><i className="on h-[29px]" ></i><i className="on h-[28px]" ></i><i className="on h-[33px]" ></i><i className="on h-[28px]" ></i><i className="on h-[30px]" ></i><i className="on h-[36px]" ></i><i className="on h-[40px]" ></i><i className="on h-[28px]" ></i><i className="on h-[37px]" ></i><i className="hd h-[43px]" ></i><i className="h-[41px]" ></i><i className="h-[43px]" ></i><i className="h-[28px]" ></i><i className="h-[26px]" ></i><i className="h-[41px]" ></i><i className="h-[23px]" ></i><i className="h-[25px]" ></i><i className="h-[24px]" ></i><i className="h-[34px]" ></i><i className="h-[37px]" ></i><i className="h-[33px]" ></i><i className="h-[34px]" ></i><i className="h-[32px]" ></i><i className="h-[29px]" ></i><i className="h-[35px]" ></i><i className="h-[37px]" ></i><i className="h-[34px]" ></i><i className="h-[31px]" ></i><i className="h-[23px]" ></i><i className="h-[34px]" ></i><i className="h-[24px]" ></i><i className="h-[22px]" ></i><i className="h-[36px]" ></i><i className="h-[30px]" ></i><i className="h-[40px]" ></i><i className="h-[36px]" ></i><i className="h-[40px]" ></i><i className="h-[35px]" ></i><i className="h-[33px]" ></i><i className="h-[35px]" ></i><i className="h-[34px]" ></i><i className="h-[24px]" ></i><i className="h-[39px]" ></i><i className="h-[25px]" ></i><i className="h-[33px]" ></i><i className="h-[37px]" ></i><i className="h-[38px]" ></i><i className="h-[37px]" ></i><i className="h-[40px]" ></i><i className="h-[38px]" ></i><i className="h-[40px]" ></i><i className="h-[31px]" ></i><i className="h-[35px]" ></i><i className="h-[22px]" ></i><i className="h-[37px]" ></i><i className="h-[35px]" ></i><i className="h-[28px]" ></i><i className="h-[35px]" ></i><i className="h-[25px]" ></i><i className="h-[28px]" ></i><i className="h-[30px]" ></i><i className="h-[33px]" ></i><i className="h-[21px]" ></i><i className="h-[27px]" ></i><i className="h-[31px]" ></i><i className="h-[31px]" ></i><i className="h-[23px]" ></i><i className="h-[24px]" ></i><i className="h-[23px]" ></i><i className="h-[16px]" ></i><i className="h-[23px]" ></i><i className="h-[27px]" ></i><i className="h-[18px]" ></i><i className="h-[24px]" ></i><i className="h-[26px]" ></i><i className="h-[15px]" ></i><i className="h-[14px]" ></i><i className="h-[22px]" ></i><i className="h-[17px]" ></i><i className="h-[23px]" ></i><i className="h-[14px]" ></i><i className="h-[21px]" ></i><i className="h-[19px]" ></i><i className="h-[15px]" ></i><i className="h-[15px]" ></i><i className="h-[23px]" ></i><i className="h-[19px]" ></i><i className="h-[22px]" ></i><i className="h-[15px]" ></i><i className="h-[23px]" ></i><i className="h-[24px]" ></i><i className="h-[16px]" ></i><i className="h-[20px]" ></i><i className="h-[18px]" ></i><i className="h-[18px]" ></i><i className="h-[17px]" ></i><i className="h-[28px]" ></i><i className="h-[20px]" ></i><i className="h-[18px]" ></i><i className="h-[17px]" ></i><i className="h-[22px]" ></i><i className="h-[24px]" ></i></span>
          <div className="row between" ><span className="t-mono c2" >1:24</span><span className="t-mono c3" >-2:18</span></div>
        </div>

        <div className="row g20" >
          <button className="ib ib-44" aria-label="Shuffle"><svg className="ic" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{'color': 'var(--gold)'}}><path className="" d="M16.6 3.6 20 7l-3.4 3.4"/><path className="" d="M16.6 13.6 20 17l-3.4 3.4"/><path className="" d="M3.8 7h3.4c1.7 0 2.7 1 3.7 2.4l2.7 3.9c1 1.4 2 2.4 3.7 2.4H20"/><path className="" d="M3.8 17h3.4c1.5 0 2.5-.8 3.4-2"/><path className="" d="M15.2 9c.9-1.2 1.9-2 3.4-2H20"/></svg></button>
          <button className="ib ib-44" aria-label="Previous track"><svg className="ic" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M19 5.2v13.6L9 12z"/><rect className="" x="4.5" y="5.2" width="2.9" height="13.6" rx="1.2"/></svg></button>
          <button className="playbtn" aria-label="Pause" style={{'background': 'var(--gold)', 'boxShadow': 'var(--glow-g)'}}><svg className="ic" width="27" height="27" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.4" y="4.6" width="3.9" height="14.8" rx="1.2"/><rect className="" x="13.7" y="4.6" width="3.9" height="14.8" rx="1.2"/></svg></button>
          <button className="ib ib-44" aria-label="Next track"><svg className="ic" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M5 5.2v13.6L15 12z"/><rect className="" x="16.6" y="5.2" width="2.9" height="13.6" rx="1.2"/></svg></button>
          <button className="ib ib-44" aria-label="Repeat one"><svg className="ic" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M16.6 2.6 20 6l-3.4 3.4"/><path className="" d="M20 6H8.2A4.2 4.2 0 0 0 4 10.2v1.4"/><path className="" d="M7.4 21.4 4 18l3.4-3.4"/><path className="" d="M4 18h11.8a4.2 4.2 0 0 0 4.2-4.2v-1.4"/><path className="" d="M12 9.6v4.8M12 9.6l-1.4 1"/></svg></button>
          <span className="vr h-[28px]" style={{'margin': '0 6px'}}></span>
          <button className="ib ib-44" aria-label="Favourite"><svg className="ic" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{'color': 'var(--acc)'}}><path className="" d="M12 20.4S4 15.5 4 10.3A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8 2.7c0 5.2-8 10.1-8 10.1z"/></svg></button>
          <a className="ib ib-44" href="D11-Lyrics.html" aria-label="Lyrics"><svg className="ic" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 5h16v11.4H9.4L4 20.4z"/><path className="" d="M8 9.4h8M8 12.6h5"/></svg></a>
          <a className="ib ib-44" href="D13-Equalizer.html" aria-label="Equalizer"><svg className="ic" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M6 3v6.2M6 13.4V21M12 3v9.6M12 16.8V21M18 3v2.4M18 9.6V21"/><circle className="" cx="6" cy="11.3" r="2.1"/><circle className="" cx="12" cy="14.7" r="2.1"/><circle className="" cx="18" cy="7.5" r="2.1"/></svg></a>
          <button className="ib ib-44" aria-label="Audio output"><svg className="ic" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="3" y="5.4" width="10.6" height="13.2" rx="2.2"/><path className="" d="M8.3 9.6v4.8"/><path className="" d="M17 9.2a4.4 4.4 0 0 1 0 5.6"/><path className="" d="M19.9 6.6a8.4 8.4 0 0 1 0 10.8"/></svg></button>
          <span className="row g8 none w-[120px]" ><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 9.4h3.6L12 5.4v13.2L7.6 14.6H4z"/><path className="" d="M15.6 9.6a4.2 4.2 0 0 1 0 4.8"/><path className="" d="M18.4 7a8 8 0 0 1 0 10"/></svg><span className="track track-gold" style={{}}><i className="w-[62%]" ></i><b className="" style={{'left': '62%'}}></b></span></span>
        </div>

        <div className="row g12 mt-[4px]" >
          <span className="row g10 none rounded-[12px]" style={{'padding': '10px 14px', 'background': 'rgba(17,17,20,.8)', 'border': '1px solid var(--ln2)'}}>
            <span className="" style={{'color': 'var(--gold)'}}><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M4 15.4v-3.2a8 8 0 0 1 16 0v3.2"/><rect className="" x="2.4" y="13.8" width="4.6" height="6.8" rx="2.3"/><rect className="" x="17" y="13.8" width="4.6" height="6.8" rx="2.3"/></svg></span>
            <span className="col gap-[1px]" ><span className="t-ll c1" >Wired headphones</span>
            <span className="t-ls c3" >Local playback · no network</span></span>
            <svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="m5 9.2 7 7 7-7"/></svg>
          </span>
        </div>

        <div className="col gap-[10px] mt-[6px]" >
          <div className="row between max-w-[560px]" >
            <span className="t-ov c3" >Up next</span>
            <a className="t-ll c2 no-underline" href="D12-Queue.html" >Open queue</a>
          </div>
          <div className="col g2 max-w-[560px]" >
            <div className="srow" style={{'padding': '6px 8px'}}><div className="art a1 art-r-sm w-[36px] h-[36px]" ></div>
              <span className="col grow gap-[1px] min-w-[0]" ><span className="row g6" ><span className="t-ll c1 trunc" >Copper Wires</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
              <span className="t-ls c3 trunc" >Hollow Coast</span></span>
              <span className="t-mono-s c3 none" >4:33</span></div><div className="srow" style={{'padding': '6px 8px'}}><div className="art a3 art-r-sm w-[36px] h-[36px]" ></div>
              <span className="col grow gap-[1px] min-w-[0]" ><span className="row g6" ><span className="t-ll c1 trunc" >Winter Arithmetic</span><span className="src src-local" title="On this device"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect className="" x="6.2" y="2.6" width="11.6" height="18.8" rx="2.6"/><path className="" d="M10.4 18.4h3.2"/></svg></span></span>
              <span className="t-ls c3 trunc" >The Orchard Machine</span></span>
              <span className="t-mono-s c3 none" >5:08</span></div><div className="srow" style={{'padding': '6px 8px'}}><div className="art a2 art-r-sm w-[36px] h-[36px]" ></div>
              <span className="col grow gap-[1px] min-w-[0]" ><span className="row g6" ><span className="t-ll c1 trunc" >Static Bloom</span><span className="src src-cloud" title="Streaming from server"><svg className="ic" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="" d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 5.9 11a3.6 3.6 0 0 0 1.3 7.4z"/></svg></span></span>
              <span className="t-ls c3 trunc" >Vela Nine</span></span>
              <span className="t-mono-s c3 none" >4:15</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

    </>
  );
}
