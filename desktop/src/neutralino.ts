import { app, events, init, os } from '@neutralinojs/lib';
import type { TrayOptions } from '@neutralinojs/lib';
import { isNeutralino } from './lib/caps';

export { isNeutralino };

/** What the tray menu's player items do; App binds them to the player once it mounts. */
export interface TrayActions {
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
}

let initialised = false;
let trayActions: TrayActions | null = null;
let nowPlaying: { label: string; playing: boolean } | null = null;
/** The menu last sent, so a position tick or re-render doesn't rebuild the same tray. */
let shownTray = '';

/** A menu line for the track: "Title - Artist", cut short so the menu stays narrow. */
const trayLabel = (title: string, artist: string): string => {
  const label = artist ? `${title} - ${artist}` : title;
  return label.length > 60 ? `${label.slice(0, 59)}…` : label;
};

/**
 * Tray menus only exist in window mode, and are still broken on macOS.
 * https://github.com/neutralinojs/neutralinojs/issues/615
 */
const setTray = (): void => {
  if (window.NL_MODE !== 'window') {
    console.log('INFO: Tray menu is only available in the window mode.');
    return;
  }
  if (window.NL_OS === 'Darwin') {
    return;
  }

  const idle = !nowPlaying;
  const tray: TrayOptions = {
    icon: '/resources/icons/trayIcon.png',
    menuItems: [
      { id: 'NOW', text: nowPlaying?.label ?? 'Nothing playing', isDisabled: true },
      { id: 'SEP1', text: '-' },
      { id: 'TOGGLE', text: nowPlaying?.playing ? 'Pause' : 'Play', isDisabled: idle },
      { id: 'NEXT', text: 'Next', isDisabled: idle },
      { id: 'PREVIOUS', text: 'Previous', isDisabled: idle },
      { id: 'SEP2', text: '-' },
      { id: 'QUIT', text: 'Quit' },
    ],
  };

  const key = JSON.stringify(tray.menuItems);
  if (key === shownTray) return;
  shownTray = key;
  void os.setTray(tray);
};

/** Hands the tray's Play/Pause, Next and Previous to the player; returns the cleanup. */
export const bindTray = (actions: TrayActions): (() => void) => {
  trayActions = actions;
  return () => {
    if (trayActions === actions) trayActions = null;
  };
};

/** Shows the current track and Play or Pause in the tray menu (the window only). */
export const showInTray = (track: { title: string; artist: string } | null, playing: boolean): void => {
  nowPlaying = track ? { label: trayLabel(track.title, track.artist), playing } : null;
  if (initialised && isNeutralino() && window.NL_MODE === 'window') setTray();
};

const onTrayMenuItemClicked = (event: CustomEvent<{ id: string }>): void => {
  switch (event.detail.id) {
    case 'TOGGLE':
      trayActions?.togglePlay();
      break;
    case 'NEXT':
      trayActions?.next();
      break;
    case 'PREVIOUS':
      trayActions?.previous();
      break;
    case 'QUIT':
      void app.exit();
      break;
  }
};

const onWindowClose = (): void => {
  void app.exit();
};

/** Safe to call more than once; React StrictMode double-invokes in dev. */
export const initNeutralino = (): void => {
  if (initialised) {
    return;
  }
  initialised = true;

  if (!isNeutralino()) {
    console.warn(
      'Neutralino globals are missing - running as a plain web page. ' +
        'Use `neu run` (or ../runFE.sh linux|web) for the native APIs.',
    );
    return;
  }

  // `./runFE.sh web` (browser mode) uses no native API (lib/caps.ts), and its token works for
  // one tab only: connecting a second one (a link from an email, a reload in a new tab) made
  // the client replace the page with NE_CL_IVCTOKN. So only the window connects.
  if (window.NL_MODE !== 'window') return;

  init();

  void events.on('trayMenuItemClicked', onTrayMenuItemClicked as (ev: CustomEvent) => void);
  void events.on('windowClose', onWindowClose);

  setTray();
};
