# Sonare desktop

Sonare's desktop/web screens: **React + TypeScript (Vite)** running inside **NeutralinoJS**.

## Layout

```
index.html            Vite entry. Also cli.frontendLibrary.patchFile - see note below.
src/                  React + TypeScript sources
  main.tsx            Entry point; boots Neutralino, then mounts React
  App.tsx             Root component
  neutralino.ts       init(), tray menu, window/tray event wiring
public/               Static assets, copied verbatim into the build output
  icons/              App, tray and logo images
resources/            Vite build output - generated, gitignored
dist/                 `neu build` output - generated, gitignored
```

`resources/` is Neutralino's `documentRoot` and `cli.resourcesPath`, so Vite builds
straight into it. Don't hand-edit anything in there.

## Commands

Run these from the repo root instead, if you prefer: `../runFE.sh <web|linux|windows>`.

| Command                         | What it does                                                         |
| ------------------------------- | -------------------------------------------------------------------- |
| `npx neu run`                   | Starts the Vite dev server and opens the native window (HMR)         |
| `npx neu run -- --mode=browser` | Same, but opens in your browser                                      |
| `npx neu build --release`       | Builds the React app, then packages Neutralino binaries into `dist/` |
| `npm run build`                 | React/TS build only (typecheck + Vite)                               |
| `npm run typecheck`             | Types only                                                           |
| `npm run dev`                   | Plain Vite dev server, no Neutralino runtime                         |

`neu run` and `neu build` invoke Vite themselves through `cli.frontendLibrary` in
`neutralino.config.json` — don't start `npm run dev` alongside them, the dev server
port is strict (5173) and `neu` waits for it.

## Fixed port 47823

The desktop window is served by Neutralino on **http://localhost:47823** (`port` in
`neutralino.config.json`). The port is fixed so the production backend can allow exactly
that origin: its `CORS_ORIGINS` lists `http://localhost:47823` next to `https://sonare.dev`.

- If something else already uses 47823, Neutralino fails to start. Free the port, or start
  the app with another one (`./sonare-desktop-linux_x64 --port=47900`) **and** add that
  origin (`http://localhost:47900`) to the backend's `CORS_ORIGINS`.
- Development is unaffected: `runFE.sh linux` picks a free port and passes its own `--port`,
  and the development backend allows any localhost origin.

## Native APIs

Use the typed npm package rather than the injected global client library:

```ts
import { os, filesystem } from '@neutralinojs/lib';
```

`NL_*` globals are typed on `window` (`window.NL_OS`, `window.NL_PORT`, …). They only
exist when the page runs under Neutralino; `isNeutralino()` in `src/neutralino.ts`
guards that, so plain `npm run dev` still renders in a normal browser.

### The `__neutralino_globals.js` tag

`index.html` contains:

```html
<script src="/__neutralino_globals.js"></script>
```

In production Neutralino's own server answers that route. In dev the page is served by
Vite, so `neu run` rewrites the tag to point at the Neutralino server and reverts it on
exit. Keep the tag exactly as written — the CLI matches it with a regex. Vite prints a
harmless "can't be bundled without type=module" warning about it on every build.

## License

[MIT](LICENSE)

## Icon credits

- `trayIcon.png` - Made by [Freepik](https://www.freepik.com) and downloaded from [Flaticon](https://www.flaticon.com)
