module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    // youtubei.js uses `export * as X from`, which the React Native preset leaves alone.
    // (Installed with @babel/preset-env, a dev dependency.)
    '@babel/plugin-transform-export-namespace-from',
    // Reanimated 4 moved the worklets transform into react-native-worklets.
    // It must stay last.
    'react-native-worklets/plugin',
  ],
};
