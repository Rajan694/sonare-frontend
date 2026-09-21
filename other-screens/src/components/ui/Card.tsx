import React from 'react';
import Icon from './Icon';

interface CardProps {
  title: string;
  subtitle: string;
  artClass: string;
  source: 'local' | 'server';
  downloadLabel?: string;
  href?: string;
}

export default function Card({ title, subtitle, artClass, source, downloadLabel, href = "#" }: CardProps) {
  return (
    <a className="acard" href={href}>
      <div className={`art ${artClass} art-r-lg group w-full aspect-square`}>
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="playbtn-48"><Icon name="play" /></span>
        </div>
      </div>
      <div className="flex flex-col gap-[2px]">
        <span className="flex flex-row items-center gap-[6px]">
          <span className="text-[15px] leading-[22px] font-medium text-t1 truncate">{title}</span>
          <span className={`src src-${source === 'local' ? 'local' : 'cloud'}`} title="Source">
            <Icon name={source === 'local' ? 'smartphone_3' : 'cloud_2'} />
          </span>
        </span>
        <span className="flex flex-row items-center gap-[4px] text-[13px] leading-[18px] font-normal text-t3 truncate">
          {downloadLabel && <span className="text-acc">{downloadLabel}</span>}
          {subtitle}
        </span>
      </div>
    </a>
  );
}
