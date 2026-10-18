import { NativeModules } from 'react-native';

/**
 * How this APK was built (android/app/src/main/java/com/mobile/buildinfo). `dev` is a release APK
 * made by `./buildFE.sh dev android`: production JS (__DEV__ is false) that also allows plain
 * http, so it can be pointed at a computer on the LAN.
 */
const native = NativeModules.SonareBuild as { dev?: boolean; version?: string } | undefined;

export const isDevApk = native?.dev === true;

/** versionName from android/app/build.gradle (Settings → About and the update check). */
export const appVersion: string = native?.version ?? '0.0.0';

/** Run from Metro (a debug build) or a dev APK: Settings says so and offers no update. */
export const isLocalBuild = (__DEV__ && process.env.NODE_ENV !== 'test') || isDevApk;
