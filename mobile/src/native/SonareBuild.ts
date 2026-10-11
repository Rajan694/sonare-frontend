import { NativeModules } from 'react-native';

/**
 * How this APK was built (android/app/src/main/java/com/mobile/buildinfo). `dev` is a release APK
 * made by `./buildFE.sh dev android`: production JS (__DEV__ is false) that also allows plain
 * http, so it can be pointed at a computer on the LAN.
 */
const native = NativeModules.SonareBuild as { dev?: boolean } | undefined;

export const isDevApk = native?.dev === true;
