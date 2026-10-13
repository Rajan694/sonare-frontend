import React from 'react';

/** A screenshot in a phone outline (1080x2400 captures, shown at 9:20). */
export const PhoneFrame = ({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) => {
  return (
    <div
      className={`relative rounded-[36px] border border-ln3 bg-s0 p-[7px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[29px] bg-bg">
        <img
          src={src}
          alt={alt}
          width={720}
          height={1600}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="block aspect-[9/20] w-full object-cover"
        />
        {/* The punch-hole camera, drawn over the status bar */}
        <span
          className="absolute left-1/2 top-[1.4%] h-[2.2%] w-[4.8%] -translate-x-1/2 rounded-full bg-black"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

/** A screenshot in a desktop window with a title bar (1440x900 captures). */
export const WindowFrame = ({
  src,
  alt,
  title = 'Sonare',
  className = '',
  eager = false,
}: {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  eager?: boolean;
}) => {
  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-ln3 bg-s1 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.03)] ${className}`}
    >
      <div className="flex h-[30px] items-center gap-[7px] border-b border-ln bg-s2 px-3" aria-hidden="true">
        <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
        <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
        <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate text-label-s text-t3">{title}</span>
      </div>
      <img
        src={src}
        alt={alt}
        width={1440}
        height={900}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block aspect-[16/10] w-full object-cover"
      />
    </div>
  );
};
