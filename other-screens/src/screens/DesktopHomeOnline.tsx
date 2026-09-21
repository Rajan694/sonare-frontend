import React from 'react';
import DesktopLayout from '../components/DesktopLayout';
import Button from '../components/ui/Button';
import Tile from '../components/ui/Tile';
import Card from '../components/ui/Card';

export default function DesktopHomeOnline() {
  const jumpBackIn = [
    { title: 'Paper Lanterns', subtitle: 'Hollow Coast', artClass: 'a1', source: 'local' as const },
    { title: 'Static Bloom', subtitle: 'Vela Nine', artClass: 'a2', source: 'server' as const },
    { title: 'Winter Arithmetic', subtitle: 'The Orchard Machine', artClass: 'a3', source: 'local' as const },
    { title: 'Signal Decay', subtitle: 'Kite Runner', artClass: 'a4', source: 'local' as const },
    { title: 'Deep Work Session', subtitle: 'Focus · 88 tracks', artClass: 'a5', source: 'server' as const },
    { title: 'Low Sun, Long Shadows', subtitle: 'Alinea', artClass: 'a6', source: 'local' as const },
  ];

  const recommendations = [
    { title: 'Hollow Coast', subtitle: '14 tracks · FLAC', artClass: 'a7', source: 'local' as const },
    { title: 'Vela Nine', subtitle: '9 tracks · 320k', artClass: 'a8', source: 'server' as const },
    { title: 'Alinea', subtitle: '11 tracks · ALAC', artClass: 'a9', source: 'local' as const },
  ];

  return (
    <DesktopLayout>
      <div className="flex flex-col gap-[28px] p-[26px_32px_0]">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-[4px]">
            <span className="text-[13px] leading-[18px] font-normal text-t3">Thursday evening &middot; 2 new releases from artists you follow</span>
            <span className="text-[32px] leading-[36px] font-bold tracking-[-0.4px] text-t1">Welcome back, Rajan</span>
          </div>
          <div className="flex flex-row items-center gap-[10px]">
            <Button variant="out" icon="sync">Sync now</Button>
            <Button variant="acc" icon="play">Resume</Button>
          </div>
        </div>

        <div className="grid gap-[12px] grid-cols-3">
          {jumpBackIn.map((item, idx) => (
            <Tile key={idx} {...item} />
          ))}
        </div>

        <div className="flex flex-col gap-[14px]">
          <div className="flex flex-row items-baseline justify-between gap-[12px]">
            <span className="text-[20px] leading-[26px] font-semibold text-t1">Trending locally this week</span>
            <a href="D05-Library.html" className="text-[13px] leading-[16px] font-medium text-t3 hover:text-t1">See all</a>
          </div>

          <div className="flex flex-row gap-[16px]">
            {recommendations.map((item, idx) => (
              <div key={idx} className="w-[160px]">
                <Card {...item} href="D06-Album.html" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesktopLayout>
  );
}
