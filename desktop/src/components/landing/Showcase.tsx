import React, { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { PhoneFrame, WindowFrame } from './Frames';

type Device = 'android' | 'linux';

const PHONE_SHOTS = [
  {
    src: '/landing/android-home.webp',
    alt: 'Sonare on Android: Home with trending songs and a song playing',
    caption: 'Home',
  },
  {
    src: '/landing/android-nowplaying.webp',
    alt: 'Sonare on Android: Now Playing with the waveform and controls',
    caption: 'Now Playing',
  },
  {
    src: '/landing/android-lyrics.webp',
    alt: 'Sonare on Android: synced lyrics in Devanagari, the current line lit up',
    caption: 'Synced lyrics',
  },
];

const DESKTOP_SHOTS = [
  {
    src: '/landing/linux-home.webp',
    alt: 'Sonare on Linux: Home with the sidebar, search and trending songs',
    caption: 'Home',
  },
  {
    src: '/landing/linux-nowplaying.webp',
    alt: 'Sonare on Linux: Now Playing with the album art, waveform and up next',
    caption: 'Now Playing',
  },
];

/** The screenshots, Android or Linux, behind a segmented switch. */
export const Showcase = () => {
  const [device, setDevice] = useState<Device>('android');
  const tabs: { id: Device; label: string; icon: typeof Smartphone }[] = [
    { id: 'android', label: 'Android', icon: Smartphone },
    { id: 'linux', label: 'Linux', icon: Monitor },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Screenshots for"
        className="mx-auto flex w-fit gap-1 rounded-full border border-ln2 bg-s1 p-1"
      >
        {tabs.map(({ id, label, icon: TabIcon }) => {
          const on = device === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`shots-tab-${id}`}
              aria-selected={on}
              aria-controls="shots-panel"
              onClick={() => setDevice(id)}
              className={`focus-visible:focusring flex items-center gap-2 rounded-full px-4 py-2 text-label-l transition-colors ${
                on ? 'bg-accbg2 text-acc' : 'text-t2 hover:text-t1'
              }`}
            >
              <TabIcon size={16} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div id="shots-panel" role="tabpanel" aria-labelledby={`shots-tab-${device}`} className="mt-10">
        <div key={device}>
          {device === 'android' ? (
            <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0">
              {PHONE_SHOTS.map((shot) => (
                <figure key={shot.src} className="w-[min(72vw,260px)] shrink-0 snap-center">
                  <PhoneFrame src={shot.src} alt={shot.alt} />
                  <figcaption className="mt-3 text-center text-label-l text-t2">{shot.caption}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {DESKTOP_SHOTS.map((shot) => (
                <figure key={shot.src}>
                  <WindowFrame src={shot.src} alt={shot.alt} title={`Sonare — ${shot.caption}`} />
                  <figcaption className="mt-3 text-center text-label-l text-t2">{shot.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
