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
 *
 * `./runFE.sh linux` doesn't go through `neu run`: it picks the Neutralino port itself and
 * passes it as SONARE_NL_PORT, leaving .tmp/auth_info.json to a `web` run alongside it.
 */
function neutralinoGlobalsPort(): Plugin {
  const authInfo = fileURLToPath(new URL('./.tmp/auth_info.json', import.meta.url));
  const fixedPort = process.env.SONARE_NL_PORT;
  return {
    name: 'neutralino-globals-port',
    apply: 'serve',
    transformIndexHtml(html) {
      try {
        const nlPort = fixedPort ?? (JSON.parse(readFileSync(authInfo, 'utf8')) as { nlPort: number }).nlPort;
        return html.replace(/localhost:\d+\/__neutralino_globals\.js/, `localhost:${nlPort}/__neutralino_globals.js`);
      } catch {
        return html;
      }
    },
  };
}

// `./runFE.sh web` serves on 5183: `neu run` waits for exactly that port
// (cli.frontendLibrary.devUrl), so it must not silently shift. `./runFE.sh linux` passes
// 5184 so both can run side by side - with its own dependency cache, or the two dev
// servers would keep rewriting each other's.
const port = Number(process.env.SONARE_VITE_PORT) || 5183;

// Neutralino serves the built app from `documentRoot` and bundles `cli.resourcesPath`,
// both of which point at /resources/ - so that is where Vite builds to. Everything in
// public/ (icons/) is copied there too, which keeps the tray and window icon paths in
// neutralino.config.json valid.
export default defineConfig({
  plugins: [react(), tailwindcss(), neutralinoGlobalsPort()],
  cacheDir: port === 5183 ? undefined : `node_modules/.vite-${port}`,
  server: {
    port,
    strictPort: true,
  },
  build: {
    outDir: 'resources',
    emptyOutDir: true,
    sourcemap: true,
  },
});
