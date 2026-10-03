import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Desktop mode setup: NL_MODE === 'window' with mock Neutralino
(window as any).NL_MODE = 'window';
(window as any).NL_PORT = 5184;
(window as any).NL_OS = 'Linux';
(window as any).NL_APPID = 'sonare';

(window as any).Neutralino = {
  init: vi.fn(),
  events: {
    on: vi.fn(),
    off: vi.fn(),
    dispatch: vi.fn(),
  },
  filesystem: {
    readDirectory: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    createDirectory: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({ size: 1000, isFile: true }),
  },
  os: {
    showOpenDialog: vi.fn().mockResolvedValue(['/mock/music']),
    showMessageBox: vi.fn().mockResolvedValue('OK'),
    open: vi.fn().mockResolvedValue(undefined),
    getPath: vi.fn().mockResolvedValue('/mock/home'),
  },
  storage: {
    setData: vi.fn().mockResolvedValue(undefined),
    getData: vi.fn().mockResolvedValue(''),
  },
  app: {
    exit: vi.fn(),
    getConfig: vi.fn().mockResolvedValue({}),
  },
  window: {
    setTitle: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    minimize: vi.fn().mockResolvedValue(undefined),
  },
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
