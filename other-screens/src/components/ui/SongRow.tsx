import React from 'react';
import Icon from './Icon';

export interface SongRowProps {
  index?: string | number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  plays?: string;
  artClass?: string;
  source: 'local' | 'server';
  isActive?: boolean;
}

export default function SongRow({ index, title, artist, album, duration, plays, artClass, source, isActive }: SongRowProps) {
  return (
    <div className={`srow ${isActive ? 'srow-on' : 'srow-hover'} h-[56px] px-[16px]`}>
      <span className="srow-idx text-t3 w-[24px] text-right text-[12px] font-medium font-mono">{isActive ? <Icon name="volume" className="text-acc" /> : index}</span>
      {artClass && <span className={`art ${artClass} art-r-xs w-[40px] h-[40px]`}></span>}
      <div className="flex flex-col flex-grow min-w-0 pr-[16px]">
        <span className={`text-[14px] leading-[20px] font-medium truncate ${isActive ? 'text-acc' : 'text-t1'}`}>{title}</span>
        <span className="text-[13px] leading-[18px] font-normal text-t3 truncate">{artist}</span>
      </div>
      <div className="flex-none w-[200px] text-[13px] leading-[18px] text-t3 truncate">{album}</div>
      <div className="flex-none w-[44px]">
        <span className={`src src-${source === 'local' ? 'local' : 'cloud'}`}>
          <Icon name={source === 'local' ? 'smartphone_3' : 'cloud_2'} />
        </span>
      </div>
      {plays && <div className="flex-none w-[80px] text-[13px] text-t3 text-right font-mono">{plays}</div>}
      <div className="flex-none w-[64px] text-[13px] text-t3 text-right font-mono">{duration}</div>
      <div className="flex-none w-[44px] text-right">
        <button className="ib ib-32"><Icon name="plus" /></button>
      </div>
      <div className="flex-none w-[44px] text-right">
        <button className="ib ib-32"><Icon name="icon" /></button>
      </div>
    </div>
  );
}
