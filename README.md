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
./runFE.sh windows   # build the Windows app
./runFE.sh mobile    # Metro (8081) + the Android app; --port <n> for another Metro port
```

Start the backend first (`../sonare-backend/runBE.sh`, or `../run.sh` from the root repo
for everything).

## Configuration

- Desktop / web: `desktop/.env` (copy `desktop/.env.example`). `VITE_API_BASE` is the API
  base URL — `http://127.0.0.1:3010/api/v1` in development, `https://api.sonare.dev/api/v1`
  for production builds.
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
