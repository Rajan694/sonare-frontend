import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * `neu run` opens the window first and only then patches index.html with the new
 * Neutralino port and asks Vite to reload. The window's Vite client often connects after
 * that reload was broadcast, so it keeps the unpatched page - no NL_* globals, no native
 * API. Neutralino writes its port to .tmp/auth_info.json (`--export-auth-info`) before the
 * window loads, so point the globals script at it on every request.
 */
function neutralinoGlobalsPort(): Plugin {
  const authInfo = fileURLToPath(new URL('./.tmp/auth_info.json', import.meta.url));
  return {
    name: 'neutralino-globals-port',
    apply: 'serve',
    transformIndexHtml(html) {
      try {
        const { nlPort } = JSON.parse(readFileSync(authInfo, 'utf8')) as { nlPort: number };
        return html.replace(/localhost:\d+\/__neutralino_globals\.js/, `localhost:${nlPort}/__neutralino_globals.js`);
      } catch {
        return html;
      }
    },
  };
}

// Neutralino serves the built app from `documentRoot` and bundles `cli.resourcesPath`,
// both of which point at /resources/ - so that is where Vite builds to. Everything in
// public/ (icons/) is copied there too, which keeps the tray and window icon paths in
// neutralino.config.json valid.
export default defineConfig({
  plugins: [react(), tailwindcss(), neutralinoGlobalsPort()],
  // `neu run` waits for this exact port (cli.frontendLibrary.devUrl) before opening
  // the window, so it must not silently shift to 5184.
  server: {
    port: 5183,
    strictPort: true,
  },
  build: {
    outDir: 'resources',
    emptyOutDir: true,
    sourcemap: true,
  },
});
