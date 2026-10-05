import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
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

/**
 * Which backend the app talks to, the desktop counterpart of React Native's __DEV__.
 * SONARE_ENV=dev (the default) uses VITE_API_BASE; SONARE_ENV=prod uses VITE_API_BASE_PROD
 * and leaves out the dev auto-login, so a shipped build never carries those credentials.
 * Set it in the shell (`SONARE_ENV=prod npm run build`, the web server's build) or in .env;
 * ../buildFE.sh passes it from --env.
 */
function apiEnvironment(mode: string): Record<string, string> {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.SONARE_ENV || 'dev';
  if (target !== 'dev' && target !== 'prod') {
    throw new Error(`SONARE_ENV must be dev or prod, not "${target}"`);
  }
  if (target === 'dev') return { 'import.meta.env.VITE_SONARE_ENV': JSON.stringify('dev') };
  if (!env.VITE_API_BASE_PROD) {
    throw new Error('SONARE_ENV=prod needs VITE_API_BASE_PROD (in desktop/.env or the environment)');
  }
  return {
    'import.meta.env.VITE_SONARE_ENV': JSON.stringify('prod'),
    'import.meta.env.VITE_API_BASE': JSON.stringify(env.VITE_API_BASE_PROD),
    'import.meta.env.VITE_DEV_EMAIL': JSON.stringify(''),
    'import.meta.env.VITE_DEV_PASSWORD': JSON.stringify(''),
  };
}

// Neutralino serves the built app from `documentRoot` and bundles `cli.resourcesPath`,
// both of which point at /resources/ - so that is where Vite builds to. Everything in
// public/ (icons/) is copied there too, which keeps the tray and window icon paths in
// neutralino.config.json valid.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), neutralinoGlobalsPort()],
  define: apiEnvironment(mode),
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
}));
