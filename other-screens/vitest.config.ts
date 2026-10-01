import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Tests never talk to a real backend: a fake host (unhandled requests fail the test, see
// test/helpers/server.ts), and no dev auto-login with the developer's own account.
const testEnv = {
  VITE_API_BASE: 'http://api.sonare.test/api/v1',
  VITE_DEV_EMAIL: '',
  VITE_DEV_PASSWORD: '',
};

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    env: testEnv,
    projects: [
      {
        test: {
          name: 'web',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./test/setup.web.ts'],
          env: testEnv,
          include: [
            'test/unit/**/*.test.{ts,tsx}',
            'test/components/**/*.test.{ts,tsx}',
            'test/screens/**/*.test.{ts,tsx}',
            'test/app/**/*.test.{ts,tsx}',
          ],
        },
      },
      {
        test: {
          name: 'desktop',
          globals: true,
          environment: 'jsdom',
          env: testEnv,
          setupFiles: ['./test/setup.desktop.ts'],
          include: ['test/desktop/**/*.test.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/main.tsx',
        'src/data/streamDecoder.worker.ts',
        // Context declarations: their default values are inert placeholders that App.tsx always
        // replaces with a real provider, so there is no behaviour in them to test.
        'src/store/playerStore.ts',
        'src/store/modeStore.ts',
      ],
      thresholds: {
        'src/data/**': { lines: 85, branches: 75 },
        'src/lib/**': { lines: 85, branches: 75 },
        'src/store/**': { lines: 85, branches: 75 },
        'src/components/**': { lines: 70, branches: 60 },
        'src/screens/**': { lines: 70, branches: 60 },
      },
    },
  },
});
