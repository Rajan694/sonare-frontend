/* eslint-disable no-undef */
const mockSonarePlayerNative = {
  load: jest.fn().mockResolvedValue(undefined),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(),
  stop: jest.fn(),
  setNext: jest.fn(),
  setTransitions: jest.fn(),
  setSpeed: jest.fn(),
  setAudioEffects: jest.fn(),
  getOutputDevice: jest.fn().mockResolvedValue({ id: 1, type: 'speaker', name: 'Phone speaker' }),
  getOutputDevices: jest.fn().mockResolvedValue([{ id: 1, type: 'speaker', name: 'Phone speaker' }]),
  setOutputDevice: jest.fn(),
  setSleepTimer: jest.fn(),
  setPauseAtEndOfTrack: jest.fn(),
};

const mockSonareDownloadsNative = {
  setActive: jest.fn(),
  start: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(100),
  discard: jest.fn().mockResolvedValue(undefined),
  partSize: jest.fn().mockResolvedValue(50),
  deleteFile: jest.fn().mockResolvedValue(true),
  exists: jest.fn().mockResolvedValue(true),
  pickFolder: jest.fn().mockResolvedValue({ uri: 'content://tree/music', name: 'Music' }),
  defaultLocation: jest.fn().mockResolvedValue('Music/Sonare'),
};

class MockNativeEventEmitter {
  constructor() {
    this.listeners = {};
  }
  addListener(event, handler) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(handler);
    return {
      remove: () => {
        this.listeners[event] = (this.listeners[event] || []).filter((h) => h !== handler);
      },
    };
  }
  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((h) => h(...args));
    }
  }
  removeAllListeners(event) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

const mockEventEmitter = new MockNativeEventEmitter();

const mockStatusBar = 'StatusBar';
mockStatusBar.setBarStyle = jest.fn();
mockStatusBar.setBackgroundColor = jest.fn();

const mockAnimatedValue = function (init) {
  return {
    value: init,
    setValue: jest.fn(),
    interpolate: jest.fn(() => 0),
    stopAnimation: jest.fn((cb) => cb?.(0)),
    addListener: jest.fn(() => '1'),
    removeListener: jest.fn(),
  };
};

const mockAnimated = {
  Value: jest.fn(mockAnimatedValue),
  timing: jest.fn(() => ({
    start: (cb) => cb?.({ finished: true }),
  })),
  spring: jest.fn(() => ({
    start: (cb) => cb?.({ finished: true }),
  })),
  parallel: jest.fn(() => ({
    start: (cb) => cb?.({ finished: true }),
  })),
  sequence: jest.fn(() => ({
    start: (cb) => cb?.({ finished: true }),
  })),
  loop: jest.fn(() => ({
    start: (cb) => cb?.({ finished: true }),
    stop: jest.fn(),
  })),
  createAnimatedComponent: (c) => c,
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
};

const mockEasingFn = jest.fn((t) => t);
const mockEasing = {
  linear: mockEasingFn,
  ease: mockEasingFn,
  quad: mockEasingFn,
  cubic: mockEasingFn,
  poly: () => mockEasingFn,
  sin: mockEasingFn,
  circle: mockEasingFn,
  exp: mockEasingFn,
  elastic: () => mockEasingFn,
  back: () => mockEasingFn,
  bounce: mockEasingFn,
  bezier: () => mockEasingFn,
  in: (fn) => fn || mockEasingFn,
  out: (fn) => fn || mockEasingFn,
  inOut: (fn) => fn || mockEasingFn,
};

jest.mock('react-native', () => {
  return {
    Platform: {
      OS: 'android',
      Version: 33,
      select: (dict) => (dict.android !== undefined ? dict.android : dict.default),
      constants: {
        reactNativeVersion: { major: 0, minor: 87, patch: 1 },
      },
    },
    StyleSheet: {
      create: (styles) => styles,
      flatten: (styles) => styles,
      absoluteFill: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    Appearance: {
      getColorScheme: jest.fn().mockReturnValue('dark'),
      setColorScheme: jest.fn(),
      addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    useColorScheme: jest.fn().mockReturnValue('dark'),
    Animated: mockAnimated,
    Easing: mockEasing,
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    FlatList: (props) => {
      const header =
        typeof props.ListHeaderComponent === 'function' ? props.ListHeaderComponent() : props.ListHeaderComponent;
      const items = (props.data || []).map((item, index) =>
        props.renderItem ? props.renderItem({ item, index, separators: {} }) : null,
      );
      const empty =
        !props.data || props.data.length === 0
          ? typeof props.ListEmptyComponent === 'function'
            ? props.ListEmptyComponent()
            : props.ListEmptyComponent
          : null;
      const footer =
        typeof props.ListFooterComponent === 'function' ? props.ListFooterComponent() : props.ListFooterComponent;
      return [header, items, empty, footer];
    },
    TextInput: 'TextInput',
    ActivityIndicator: 'ActivityIndicator',
    Image: 'Image',
    Modal: 'Modal',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    RefreshControl: 'RefreshControl',
    StatusBar: mockStatusBar,
    useWindowDimensions: jest.fn(() => ({ width: 412, height: 915, scale: 2.625, fontScale: 1 })),
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 1080, height: 2400 }),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Alert: {
      alert: jest.fn(),
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn((_event, _handler) => ({
        remove: jest.fn(),
      })),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
      addEventListener: jest.fn(),
    },
    Keyboard: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
      dismiss: jest.fn(),
    },
    Linking: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      openURL: jest.fn().mockResolvedValue(true),
      canOpenURL: jest.fn().mockResolvedValue(true),
      getInitialURL: jest.fn().mockResolvedValue(null),
    },
    I18nManager: {
      getConstants: () => ({ isRTL: false, doLeftAndRightSwapInRTL: false }),
      isRTL: false,
      allowRTL: jest.fn(),
      forceRTL: jest.fn(),
      swapLeftAndRightInRTL: jest.fn(),
    },
    NativeModules: {
      SonarePlayer: mockSonarePlayerNative,
      SonareDownloads: mockSonareDownloadsNative,
      PlatformConstants: {
        getConstants: () => ({ isTesting: true }),
      },
      UIManager: {
        getViewManagerConfig: () => ({}),
      },
    },
    NativeEventEmitter: jest.fn().mockImplementation(() => mockEventEmitter),
  };
});

// Mock AsyncStorage
const mockStorageMap = new Map();
const mockAsyncStorage = {
  getItem: jest.fn((key) => Promise.resolve(mockStorageMap.has(key) ? mockStorageMap.get(key) : null)),
  setItem: jest.fn((key, value) => {
    mockStorageMap.set(key, value);
    return Promise.resolve(null);
  }),
  removeItem: jest.fn((key) => {
    mockStorageMap.delete(key);
    return Promise.resolve(null);
  }),
  clear: jest.fn(() => {
    mockStorageMap.clear();
    return Promise.resolve(null);
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStorageMap.keys()))),
  multiGet: jest.fn((keys) => Promise.resolve(keys.map((k) => [k, mockStorageMap.get(k) ?? null]))),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([k, v]) => mockStorageMap.set(k, v));
    return Promise.resolve(null);
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach((k) => mockStorageMap.delete(k));
    return Promise.resolve(null);
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

// Mock react-native-keychain
const mockKeychainMap = new Map();
const mockKeychain = {
  setGenericPassword: jest.fn((username, password, options) => {
    const service = options?.service || 'default';
    mockKeychainMap.set(service, { username, password, service });
    return Promise.resolve(true);
  }),
  getGenericPassword: jest.fn((options) => {
    const service = options?.service || 'default';
    return Promise.resolve(mockKeychainMap.has(service) ? mockKeychainMap.get(service) : false);
  }),
  resetGenericPassword: jest.fn((options) => {
    const service = options?.service || 'default';
    mockKeychainMap.delete(service);
    return Promise.resolve(true);
  }),
  mockClearKeychain: () => {
    mockKeychainMap.clear();
  },
};

jest.mock('react-native-keychain', () => ({
  __esModule: true,
  default: mockKeychain,
  ...mockKeychain,
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  useNetInfo: jest.fn().mockReturnValue({ isConnected: true, isInternetReachable: true }),
}));

// Mock react-native-reanimated
const mockCreateAnimatedComponent = (c) => c;
const mockLayout = {
  springify: () => mockLayout,
  damping: () => mockLayout,
  reduceMotion: () => mockLayout,
};
const mockFade = {
  delay: () => mockFade,
  springify: () => mockFade,
  duration: () => mockFade,
  damping: () => mockFade,
  reduceMotion: () => mockFade,
};

const mockReanimated = {
  __esModule: true,
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  createAnimatedComponent: mockCreateAnimatedComponent,
  FadeIn: mockFade,
  FadeInUp: mockFade,
  FadeOutUp: mockFade,
  FadeOut: mockFade,
  SlideInDown: mockFade,
  Layout: mockLayout,
  ReduceMotion: { System: 'system', Never: 'never', Always: 'always' },
  useSharedValue: (init) => ({ value: init }),
  useAnimatedStyle: (fn) => fn(),
  withTiming: (val, _cfg, cb) => {
    cb?.(true);
    return val;
  },
  withSpring: (val, _cfg, cb) => {
    cb?.(true);
    return val;
  },
  withRepeat: (val) => val,
  withSequence: (...vals) => vals[0],
  withDelay: (_d, val) => val,
  runOnJS: (fn) => fn,
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    inOut: jest.fn(),
  },
};
mockReanimated.default = mockReanimated;

jest.mock('react-native-reanimated', () => mockReanimated);

// Mock moti
jest.mock('moti', () => {
  return {
    MotiView: 'View',
    MotiText: 'Text',
    AnimatePresence: ({ children }) => children,
  };
});

// Mock lucide-react-native
jest.mock('lucide-react-native', () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        return `Icon-${String(prop)}`;
      },
    },
  );
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  return {
    __esModule: true,
    default: 'Svg',
    Svg: 'Svg',
    Path: 'Path',
    Rect: 'Rect',
    Circle: 'Circle',
    Ellipse: 'Ellipse',
    Line: 'Line',
    G: 'G',
    Defs: 'Defs',
    LinearGradient: 'LinearGradient',
    Stop: 'Stop',
  };
});

// Mock react-native-safe-area-context
const mockReact = require('react');
const mockInset = { top: 0, right: 0, bottom: 0, left: 0 };
const mockFrame = { x: 0, y: 0, width: 1080, height: 2400 };
const mockSafeAreaInsetsContext = mockReact.createContext(mockInset);
const mockSafeAreaFrameContext = mockReact.createContext(mockFrame);

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(mockInset),
    SafeAreaInsetsContext: mockSafeAreaInsetsContext,
    SafeAreaFrameContext: mockSafeAreaFrameContext,
    useSafeAreaInsets: () => mockInset,
    useSafeAreaFrame: () => mockFrame,
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  return {
    GestureHandlerRootView: 'View',
    PanGestureHandler: 'View',
    // Sliders: tests drive them through their accessibility actions.
    GestureDetector: ({ children }) => children,
    usePanGesture: () => ({}),
    State: {},
    Directions: {},
  };
});

// Global polyfills
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock MockXMLHttpRequest
class MockXMLHttpRequest {
  constructor() {
    this.url = '';
    this.method = 'GET';
    this.headers = {};
    this.timeout = 0;
    this.status = 200;
    this.responseText = '';
    this.onload = null;
    this.onerror = null;
    this.ontimeout = null;
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name, value) {
    this.headers[name] = value;
  }
  send(_body) {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}
global.XMLHttpRequest = MockXMLHttpRequest;

module.exports = {
  mockSonarePlayerNative,
  mockSonareDownloadsNative,
  mockEventEmitter,
  MockXMLHttpRequest,
};
