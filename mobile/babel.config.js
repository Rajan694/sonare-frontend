module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    'nativewind/babel',
  ],
  // Reanimated 4 moved the worklets transform into react-native-worklets.
  // It must stay last.
  plugins: [
    'react-native-worklets/plugin',
  ],
};
