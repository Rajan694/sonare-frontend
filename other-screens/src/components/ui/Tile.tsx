import React from 'react';
import Icon from './Icon';

interface TileProps {
  title: string;
  subtitle: string;
  artClass: string;
  source: 'local' | 'server';
  href?: string;
}

export default function Tile({ title, subtitle, artClass, source, href = "#" }: TileProps) {
  return (
    <a className="tile h-[64px] p-[10px] pr-[16px]" href={href}>
      <div className={`art ${artClass} art-r-sm art-rings w-[44px] h-[44px]`}></div>
      <span className="flex flex-col flex-grow min-w-0 gap-[2px]">
        <span className="flex flex-row items-center gap-[6px]">
          <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">{title}</span>
          <span className={`src src-${source === 'local' ? 'local' : 'cloud'}`} title={source === 'local' ? "On this device" : "Streaming from server"}>
            <Icon name={source === 'local' ? 'smartphone_3' : 'cloud_2'} />
          </span>
        </span>
        <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">{subtitle}</span>
      </span>
      <span className="playbtn-fab flex-none w-[34px] h-[34px]">
        <Icon name="play" />
      </span>
    </a>
  );
}
