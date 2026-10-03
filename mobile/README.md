# Sonare mobile

The Sonare Android app: React Native 0.87 + TypeScript, NativeWind for styling, Zustand for
state, Moti / Reanimated for motion. It talks to the Sonare backend; playback and downloads
use the app's own native modules (`src/native/`, Kotlin under `android/`).

## Setup

Requirements: Node 22, JDK 17, the Android SDK (`ANDROID_HOME`), an emulator or a device.

```bash
npm install
```

Or run `../installFE.sh` from the frontend repo root.

## Running

```bash
../runFE.sh mobile               # Metro on 8081 + install and start the debug app
../runFE.sh mobile --port 8095   # another Metro port (it is baked into the debug APK)
```

or by hand: `npm start` (Metro) and `npm run android`. Start the backend first
(`../../sonare-backend/runBE.sh`).

## Configuration

There is no env file. `src/data/config.ts` picks the API origin:

- debug builds (`__DEV__`): `http://10.0.2.2:3010` on Android — the emulator's address for
  the host machine (`127.0.0.1` elsewhere);
- release builds: `https://api.sonare.dev`.

## Scripts

| Script                 | What it does                    |
| ---------------------- | ------------------------------- |
| `npm start`            | Metro                           |
| `npm run android`      | Build and install the debug app |
| `npm test`             | Test-plan check, then jest      |
| `npm run typecheck`    | `tsc --noEmit` (strict)         |
| `npm run lint`         | ESLint                          |
| `npm run format:check` | Prettier, checking only         |

Checks before a commit: `npm run format:check && npm run lint && npm run typecheck && npm test`.
Every test title starts with an id listed in `TEST-PLAN.md`.

## Release builds

- Signing: put the upload key settings in `~/.gradle/gradle.properties` (never in the repo):

  ```properties
  SONARE_UPLOAD_STORE_FILE=/path/to/sonare-upload.keystore
  SONARE_UPLOAD_STORE_PASSWORD=...
  SONARE_UPLOAD_KEY_ALIAS=...
  SONARE_UPLOAD_KEY_PASSWORD=...
  ```

- Build: `cd android && ./gradlew assembleRelease` (or `bundleRelease` for Play).
- Release builds talk to `https://api.sonare.dev`.
- iOS is not set up.

## Layout

```
src/
  components/   layout, music and ui components
  data/         API client, auth, settings, sync, hooks, types (re-exports ../shared)
  native/       JS side of the native player and downloads modules
  navigation/   React Navigation stacks and tabs
  screens/      one file per screen
  store/        Zustand stores
  lib/          helpers (cn, format, motion, …)
__tests__/      jest suites
```

## Licence

MIT — see `../LICENSE`.
