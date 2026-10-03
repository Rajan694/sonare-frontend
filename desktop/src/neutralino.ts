import { app, events, init, os } from '@neutralinojs/lib';
import type { TrayOptions } from '@neutralinojs/lib';

/**
 * True when the page is running inside Neutralino (its server injects the NL_* globals).
 * Plain `npm run dev` in a normal browser has none of them, and the app still renders.
 */
export function isNeutralino(): boolean {
  return typeof window.NL_PORT !== 'undefined';
}

/**
 * Tray menus only exist in window mode, and are still broken on macOS.
 * https://github.com/neutralinojs/neutralinojs/issues/615
 */
function setTray(): void {
  if (window.NL_MODE !== 'window') {
    console.log('INFO: Tray menu is only available in the window mode.');
    return;
  }
  if (window.NL_OS === 'Darwin') {
    return;
  }

  const tray: TrayOptions = {
    icon: '/resources/icons/trayIcon.png',
    menuItems: [
      { id: 'VERSION', text: 'Get version' },
      { id: 'SEP', text: '-' },
      { id: 'QUIT', text: 'Quit' },
    ],
  };

  void os.setTray(tray);
}

function onTrayMenuItemClicked(event: CustomEvent<{ id: string }>): void {
  switch (event.detail.id) {
    case 'VERSION':
      void os.showMessageBox(
        'Version information',
        `Neutralinojs server: v${window.NL_VERSION} | Neutralinojs client: v${window.NL_CVERSION}`,
      );
      break;
    case 'QUIT':
      void app.exit();
      break;
  }
}

function onWindowClose(): void {
  void app.exit();
}

let initialised = false;

/** Safe to call more than once; React StrictMode double-invokes in dev. */
export function initNeutralino(): void {
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

  init();

  void events.on('trayMenuItemClicked', onTrayMenuItemClicked as (ev: CustomEvent) => void);
  void events.on('windowClose', onWindowClose);

  setTray();
}
