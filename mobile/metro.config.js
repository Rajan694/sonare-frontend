const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Icons come from lucide-react-native (plain components), so there is no
 * react-native-svg-transformer wiring here and .svg stays an asset extension.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// withNativeWind teaches Metro to resolve the `./global.css` entry that App.tsx
// imports; without it the bundle fails and no NativeWind styles are applied.
const config = getDefaultConfig(__dirname);
// ../shared holds the API types shared with the desktop app. They are imported with
// `import type` only (erased by Babel), but watch the folder in case anything is ever
// imported from it at runtime.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')];

module.exports = withNativeWind(config, {
  input: './global.css',
});
