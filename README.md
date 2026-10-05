# Sonare frontend

The two Sonare apps. Both talk only to the Sonare backend (`sonare-backend`, `/api/v1` on
port 3010), which in turn talks to Piped, Postgres and Redis — the apps never call Piped
directly.

| App                   | Folder     | What it is                                                                                         |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| Desktop / web / admin | `desktop/` | React 19 + Vite + TypeScript inside NeutralinoJS: the Linux/Windows app, the web app, and `/admin` |
| Mobile                | `mobile/`  | React Native 0.87 (Android)                                                                        |

`shared/apiTypes.ts` holds the API types both apps use (types only).

## Install

```bash
./installFE.sh
```

It installs the git hooks (root `package.json`: husky + lint-staged), then each app's
packages, downloads the Neutralino binaries and builds the desktop app once. Node 22.

## Run

```bash
./runFE.sh web       # browser build, Vite on http://localhost:5183
./runFE.sh linux     # desktop window, Vite on 5184 (can run next to `web`)
./runFE.sh windows   # quick Windows build (neu build), for local testing
./runFE.sh mobile    # Metro (8081) + the Android app; --port <n> for another Metro port
```

Start the backend first (`../sonare-backend/runBE.sh`, or `../run.sh` from the root repo
for everything).

## Build the apps

```bash
./buildFE.sh linux windows --env=prod   # .tar.gz + .deb (+ .AppImage with appimagetool), .exe
./buildFE.sh android                    # release APK (needs the upload key, see below)
./buildFE.sh web --env=prod             # the web app as a .tar.gz
./buildFE.sh all --env=prod
```

Builds land in `dist/releases/`; upload them on the admin page's **Releases** tab and the
web app offers them under Settings → About. `../build.sh` from the root repo does the same.

- `--env=dev|prod` picks the API for the desktop and web builds (default `dev`; dev builds
  get `-dev` in their file names). It sets `SONARE_ENV`, see Configuration.
- Desktop builds are single files with the app embedded (`neu build --embed-resources`),
  made in a temporary copy of `desktop/`, so a running `./runFE.sh web` is not disturbed.
  Installed builds keep their data in the user's data directory, not next to the binary.
- Android is always a release build against the production API (`__DEV__` is false). The
  first time, it prints how to create the upload key and which
  `~/.gradle/gradle.properties` entries it needs. Use the same key for every update.

## Configuration

- Desktop / web: `desktop/.env` (copy `desktop/.env.example`). `SONARE_ENV` picks the API,
  the desktop counterpart of the mobile app's `__DEV__`: `dev` (default) uses
  `VITE_API_BASE` (`http://127.0.0.1:3010/api/v1`), `prod` uses `VITE_API_BASE_PROD`
  (`https://api.sonare.dev/api/v1`) and leaves the dev auto-login credentials out of the
  bundle. Set it on the web server's build (`SONARE_ENV=prod npm run build`) or pass
  `--env=prod` to `./buildFE.sh`; a prod build without `VITE_API_BASE_PROD` fails.
- Mobile: no env file. `mobile/src/data/config.ts` uses `http://localhost:3010` in debug
  builds (`./runFE.sh mobile` forwards it to this computer with `adb reverse`, on the
  emulator or a USB phone) and `https://api.sonare.dev` in release builds. Settings →
  Server address overrides it on the phone (e.g. the computer's LAN IP over Wi-Fi).

## Tests and checks

| App     | From       | Command                                                                                  |
| ------- | ---------- | ---------------------------------------------------------------------------------------- |
| Desktop | `desktop/` | `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` |
| Mobile  | `mobile/`  | `npm run format:check && npm run lint && npm run typecheck && npm test`                  |

Every test title starts with an id listed in that app's `TEST-PLAN.md`; `npm test` checks
both directions first. The desktop app also has Playwright end-to-end tests
(`npm run test:e2e`). CI (`.github/workflows/ci.yml`) runs the same commands.

A pre-commit hook runs Prettier and ESLint on staged files with each app's own config.

## More

- [desktop/README.md](desktop/README.md)
- [mobile/README.md](mobile/README.md)
- API contract: `../docs/api-contract.md` in the root repo

## Licence

MIT — see [LICENSE](LICENSE). `desktop/LICENSE` is the licence of the NeutralinoJS
template the desktop app started from.
