import { isNeutralino } from '../neutralino'

// Native features need the Neutralino *window*. `./runFE.sh web` also runs Neutralino
// (`neu run -- --mode=browser`), which injects NL_* globals but blocks filesystem.* —
// that is the web build, so it gets the web capability set.
const native = isNeutralino() && window.NL_MODE === 'window'

export const CAPS = {
  localLibrary: native,
  offlineMode: native,
  downloads: native,
  nativeEq: native,
} as const
