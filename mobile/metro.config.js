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
module.exports = withNativeWind(getDefaultConfig(__dirname), {
  input: './global.css',
});
