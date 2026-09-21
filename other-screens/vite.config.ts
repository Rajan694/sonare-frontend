import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Neutralino serves the built app from `documentRoot` and bundles `cli.resourcesPath`,
// both of which point at /resources/ - so that is where Vite builds to. Everything in
// public/ (icons/) is copied there too, which keeps the tray and window icon paths in
// neutralino.config.json valid.
export default defineConfig({
  plugins: [react()],
  // `neu run` waits for this exact port (cli.frontendLibrary.devUrl) before opening
  // the window, so it must not silently shift to 5174.
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'resources',
    emptyOutDir: true,
    sourcemap: true,
  },
});
