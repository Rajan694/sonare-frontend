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
// ../shared holds the API types and the in-app YouTube catalog shared with the desktop app.
// Its files sit outside this project, so Babel's runtime helpers (and any other package they
// pull in) are resolved from this app's node_modules rather than a missing ../node_modules.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
// The shared code imports its own TypeScript files as `./x.js` (what the desktop's Vite and
// tsc expect); Metro looks for a real .js file, so fall back to the name without it.
const sharedDir = path.resolve(__dirname, '../shared') + path.sep;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js') && context.originModulePath.startsWith(sharedDir)) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      // Not a TypeScript sibling after all: resolve it as written.
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: './global.css',
});
