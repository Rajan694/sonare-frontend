module.exports = {
  globals: {
    __DEV__: true,
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-svg|nativewind|react-native-css-interop|lucide-react-native|moti)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    './src/data/': {
      lines: 85,
      branches: 75,
    },
    './src/store/': {
      lines: 80,
      branches: 60,
    },
    './src/lib/': {
      lines: 85,
      branches: 70,
    },
    './src/screens/': {
      lines: 65,
      branches: 50,
    },
  },
};
