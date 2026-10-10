#!/bin/bash
set -e

# Builds the installable apps: the Android APK, Linux packages, the Windows .exe and the web
# bundle. The results go to dist/releases/, named so the admin page (Releases) can read the
# platform and version off the file name when they are uploaded.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Packages carry their files' permissions; a tight umask (007) makes dpkg-deb refuse them
# and leaves installed files unreadable for other users.
umask 022
DESKTOP="$SCRIPT_DIR/desktop"
MOBILE="$SCRIPT_DIR/mobile"

usage() {
    echo "Usage: ./buildFE.sh <dev|prod> <platform>... [version] [--formats=LIST] [--out=DIR]"
    echo ""
    echo "Environment (first):"
    echo "  dev       Desktop and web builds use VITE_API_BASE (desktop/.env); files get '-dev'"
    echo "  prod      Desktop and web builds use VITE_API_BASE_PROD - the ones to upload"
    echo "            Android is a release build against the production API either way."
    echo ""
    echo "Platforms (one or more):"
    echo "  android   Release APKs: arm64 (phones - the one to upload) and x86_64 (the emulator)"
    echo "  linux     Linux x64 packages: .tar.gz, .deb, and .AppImage when appimagetool is installed"
    echo "  windows   Windows x64 .exe (one file, the app's resources embedded)"
    echo "  web       The web app as a .tar.gz, for a web server"
    echo "  all       All of the above"
    echo ""
    echo "Version (optional, x.y.z):"
    echo "  Given     It becomes the version of what is built."
    echo "  Left out  The patch number goes up by one (1.0.0 -> 1.0.1)."
    echo "  Desktop, web, Linux and Windows share desktop/neutralino.config.json's version;"
    echo "  Android has its own (versionName in mobile/android/app/build.gradle), and its"
    echo "  versionCode goes up on every build so phones take it as an update. A lower"
    echo "  version than the current one is refused; if the build fails, the version"
    echo "  files are put back."
    echo ""
    echo "Options:"
    echo "  --formats=LIST   Linux formats, comma-separated: tar.gz,deb,appimage (default: all)"
    echo "  --out=DIR        Where the builds go (default: dist/releases)"
    echo ""
    echo "Examples:"
    echo "  ./buildFE.sh prod android            # 1.0.1 -> 1.0.2, versionCode +1"
    echo "  ./buildFE.sh prod linux windows 1.2.0"
    echo "  ./buildFE.sh dev linux --formats=deb"
    exit 1
}

ENV=""
TARGETS=()
VERSION=""
FORMATS="tar.gz,deb,appimage"
OUT="$SCRIPT_DIR/dist/releases"
for arg in "$@"; do
    case "$arg" in
        dev|prod)
            [ -n "$ENV" ] && { echo "Error: the environment is given twice ($ENV, $arg)"; exit 1; }
            ENV="$arg" ;;
        android|linux|windows|web) TARGETS+=("$arg") ;;
        all) TARGETS+=(android linux windows web) ;;
        [0-9]*)
            if ! [[ "$arg" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                echo "Error: the version must look like 1.2.0, not '$arg'"; exit 1
            fi
            [ -n "$VERSION" ] && { echo "Error: the version is given twice ($VERSION, $arg)"; exit 1; }
            VERSION="$arg" ;;
        --formats=*) FORMATS="${arg#--formats=}" ;;
        --out=*) OUT="${arg#--out=}" ;;
        -h|--help) usage ;;
        *) echo "Error: unknown argument '$arg'"; echo ""; usage ;;
    esac
done
[ $# -eq 0 ] && usage
[ -n "$ENV" ] || { echo "Error: say which environment first: ./buildFE.sh <dev|prod> <platform>..."; exit 1; }
[ ${#TARGETS[@]} -gt 0 ] || { echo "Error: say which platform: android, linux, windows, web or all"; exit 1; }
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"

has_target() {
    local t
    for t in "${TARGETS[@]}"; do [ "$t" = "$1" ] && return 0; done
    return 1
}

load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm use 22 >/dev/null 2>&1 || true
}

# Dev builds say so in their name, so one is never uploaded by mistake.
suffix() { [ "$ENV" = "dev" ] && echo "-dev" || true; }

BUILT=()

# ---- versions ---------------------------------------------------------------------------

NEU_CONFIG="$DESKTOP/neutralino.config.json"
GRADLE="$MOBILE/android/app/build.gradle"

desktop_version() { sed -n 's/^  "version": "\(.*\)",$/\1/p' "$NEU_CONFIG" | head -1; }
android_version() { sed -n 's/^\s*versionName "\(.*\)"$/\1/p' "$GRADLE" | head -1; }
android_code() { sed -n 's/^\s*versionCode \([0-9]*\)$/\1/p' "$GRADLE" | head -1; }

# 1.0 -> 1.0.1, 1.2.3 -> 1.2.4
bump_patch() {
    local major minor patch
    IFS=. read -r major minor patch <<< "$1"
    echo "${major:-0}.${minor:-0}.$(( ${patch:-0} + 1 ))"
}

# True when $1 is a lower version than $2.
version_lt() { [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -1)" = "$1" ]; }

# Copies of the version files, put back if the build fails.
BACKUP=""
CHANGED=()

backup_version_file() {
    [ -n "$BACKUP" ] || BACKUP="$(mktemp -d)"
    cp -p "$1" "$BACKUP/$(basename "$1")"
    CHANGED+=("$1")
}

restore_version_files() {
    local f
    for f in "${CHANGED[@]}"; do cp -p "$BACKUP/$(basename "$f")" "$f"; done
}

# Picks each app's new version (given, or the patch bumped) and writes it before building.
set_versions() {
    if has_target linux || has_target windows || has_target web; then
        local current next
        current="$(desktop_version)"
        [ -n "$current" ] || { echo "Error: no version in $NEU_CONFIG"; exit 1; }
        next="${VERSION:-$(bump_patch "$current")}"
        if version_lt "$next" "$current"; then
            echo "Error: desktop is already at $current; $next would be a step back."; exit 1
        fi
        if [ "$next" = "$current" ]; then
            echo "Desktop/web version: $current (unchanged, a rebuild)"
        else
            backup_version_file "$NEU_CONFIG"
            sed -i "0,/^  \"version\": \".*\",$/s//  \"version\": \"$next\",/" "$NEU_CONFIG"
            echo "Desktop/web version: $current -> $next"
        fi
    fi
    if has_target android; then
        local current next code
        current="$(android_version)"
        code="$(android_code)"
        [ -n "$current" ] && [ -n "$code" ] || { echo "Error: no versionName/versionCode in $GRADLE"; exit 1; }
        next="${VERSION:-$(bump_patch "$current")}"
        if version_lt "$next" "$current"; then
            echo "Error: Android is already at $current; $next would be a step back."; exit 1
        fi
        backup_version_file "$GRADLE"
        sed -i -e "s/^\(\s*\)versionName \".*\"$/\1versionName \"$next\"/" \
               -e "s/^\(\s*\)versionCode [0-9]*$/\1versionCode $((code + 1))/" "$GRADLE"
        echo "Android version:     $current -> $next (versionCode $code -> $((code + 1)))"
    fi
}

# ---- desktop (Linux, Windows) and web ---------------------------------------------------

# Builds run in a copy of desktop/ (node_modules linked in), so they never touch the dev
# setup: `neu build` packs and then empties .tmp, where a running `./runFE.sh web` keeps
# its auth token, and rewrites resources/ and dist/.
STAGE=""
cleanup_stage() { if [ -n "$STAGE" ]; then rm -rf "$STAGE"; fi; }

on_exit() {
    local rc=$?
    cleanup_stage
    if [ $rc -ne 0 ] && [ ${#CHANGED[@]} -gt 0 ]; then
        restore_version_files
        echo ""
        echo "The build failed - the version files are back as they were."
    fi
    [ -n "$BACKUP" ] && rm -rf "$BACKUP"
    exit $rc
}
trap on_exit EXIT

stage_desktop() {
    [ -n "$STAGE" ] && return
    STAGE="$(mktemp -d)"
    mkdir -p "$STAGE/desktop"
    tar -C "$DESKTOP" --exclude=./node_modules --exclude=./.tmp --exclude=./.storage \
        --exclude=./dist --exclude=./resources --exclude=./test-results \
        --exclude=./playwright-report --exclude='./*.log' -cf - . | tar -C "$STAGE/desktop" -xf -
    ln -s "$DESKTOP/node_modules" "$STAGE/desktop/node_modules"
    # src/types.ts pulls the API types from ../shared.
    cp -r "$SCRIPT_DIR/shared" "$STAGE/shared"
}

build_desktop() {
    echo ""
    echo "=== Building the desktop app (SONARE_ENV=$ENV) ==="
    stage_desktop
    cd "$STAGE/desktop"
    # The installed app can't write next to its binary (/opt is root's), so packaged builds
    # keep their storage and logs in the user's data directory.
    # Source maps (most of resources/) would be embedded in the binary for nothing.
    node -e '
        const c = require("./neutralino.config.json");
        c.dataLocation = "system";
        c.cli.frontendLibrary.buildCommand = "npm run build -- --sourcemap false";
        require("fs").writeFileSync("neutralino.config.json", JSON.stringify(c, null, 2));
    '
    # `neu build` runs `npm run build` first (cli.frontendLibrary), which reads SONARE_ENV.
    SONARE_ENV="$ENV" npx neu build --release --embed-resources
}

package_windows() {
    local version="$1" exe="$STAGE/desktop/dist/sonare-desktop/sonare-desktop-win_x64.exe"
    [ -f "$exe" ] || { echo "Error: $exe was not built"; exit 1; }
    local name="sonare-$version$(suffix)-windows-x64.exe"
    cp "$exe" "$OUT/$name"
    BUILT+=("$name")
}

desktop_entry() {
    printf '%s\n' \
        '[Desktop Entry]' \
        'Type=Application' \
        'Name=Sonare' \
        'Comment=Music player' \
        "Exec=$1" \
        'Icon=sonare' \
        'Categories=AudioVideo;Audio;Player;' \
        'Terminal=false' \
        'StartupWMClass=sonare-desktop'
}

package_linux() {
    local version="$1"
    local bin="$STAGE/desktop/dist/sonare-desktop/sonare-desktop-linux_x64"
    local icon="$DESKTOP/public/icons/appIcon.png"
    [ -f "$bin" ] || { echo "Error: $bin was not built"; exit 1; }
    local work
    work="$(mktemp -d)"

    if [[ ",$FORMATS," == *",tar.gz,"* ]]; then
        local dir="sonare-$version$(suffix)-linux-x64"
        mkdir -p "$work/$dir"
        install -m 755 "$bin" "$work/$dir/sonare"
        install -m 644 "$icon" "$work/$dir/sonare.png"
        desktop_entry sonare > "$work/$dir/sonare.desktop"
        printf '%s\n' "Run ./sonare. Needs GTK 3 and WebKitGTK (libwebkit2gtk-4.1-0 or 4.0-37)." \
            > "$work/$dir/README.txt"
        tar -C "$work" -czf "$OUT/$dir.tar.gz" "$dir"
        BUILT+=("$dir.tar.gz")
    fi

    if [[ ",$FORMATS," == *",deb,"* ]]; then
        if ! command -v dpkg-deb >/dev/null; then
            echo "Note: dpkg-deb is not installed - skipping the .deb."
        else
            # Debian versions can't contain '-dev'-style suffixes after a hyphen safely; use '~'.
            local debver="$version"
            [ "$ENV" = "dev" ] && debver="$version~dev"
            local root="$work/deb"
            mkdir -p "$root/DEBIAN" "$root/opt/sonare" "$root/usr/bin" \
                "$root/usr/share/applications" "$root/usr/share/icons/hicolor/256x256/apps"
            install -m 755 "$bin" "$root/opt/sonare/sonare"
            ln -s /opt/sonare/sonare "$root/usr/bin/sonare"
            install -m 644 "$icon" "$root/usr/share/icons/hicolor/256x256/apps/sonare.png"
            desktop_entry /opt/sonare/sonare > "$root/usr/share/applications/sonare.desktop"
            printf '%s\n' \
                'Package: sonare' \
                "Version: $debver" \
                'Section: sound' \
                'Priority: optional' \
                'Architecture: amd64' \
                'Depends: libgtk-3-0, libwebkit2gtk-4.1-0 | libwebkit2gtk-4.0-37' \
                'Recommends: gstreamer1.0-plugins-good, gstreamer1.0-plugins-bad, gstreamer1.0-libav' \
                'Maintainer: Sonare <no-reply@sonare.dev>' \
                'Description: Sonare music player' \
                ' Plays music from YouTube through a Sonare server, and files on this computer.' \
                > "$root/DEBIAN/control"
            local name="sonare_${debver}_amd64.deb"
            dpkg-deb --build --root-owner-group "$root" "$OUT/$name" >/dev/null
            BUILT+=("$name")
        fi
    fi

    if [[ ",$FORMATS," == *",appimage,"* ]]; then
        if ! command -v appimagetool >/dev/null; then
            echo "Note: appimagetool is not installed - skipping the AppImage."
            echo "      Get it from https://github.com/AppImage/appimagetool/releases and put it on PATH."
        else
            local app="$work/Sonare.AppDir"
            mkdir -p "$app/usr/bin"
            install -m 755 "$bin" "$app/usr/bin/sonare"
            install -m 644 "$icon" "$app/sonare.png"
            desktop_entry sonare > "$app/sonare.desktop"
            printf '%s\n' '#!/bin/sh' 'exec "$(dirname "$(readlink -f "$0")")/usr/bin/sonare" "$@"' > "$app/AppRun"
            chmod 755 "$app/AppRun"
            local name="sonare-$version$(suffix)-linux-x64.AppImage"
            ARCH=x86_64 appimagetool --no-appstream "$app" "$OUT/$name" >/dev/null
            BUILT+=("$name")
        fi
    fi

    rm -rf "$work"
}

build_web() {
    echo ""
    echo "=== Building the web app (SONARE_ENV=$ENV) ==="
    stage_desktop
    cd "$STAGE/desktop"
    SONARE_ENV="$ENV" npm run build
    local name="sonare-$1$(suffix)-web.tar.gz"
    # Source maps stay out of what goes on the server.
    tar -C "$STAGE/desktop/resources" --exclude='*.map' -czf "$OUT/$name" .
    BUILT+=("$name")
}

# ---- android ---------------------------------------------------------------------------

load_android_sdk() {
    if [ -z "$ANDROID_HOME" ]; then
        for candidate in "$ANDROID_SDK_ROOT" "$HOME/Android/Sdk" "$HOME/Android/sdk" \
                         "/usr/lib/android-sdk" "/opt/android-sdk"; do
            if [ -n "$candidate" ] && [ -d "$candidate/platform-tools" ]; then
                ANDROID_HOME="$candidate"
                break
            fi
        done
    fi
    [ -n "$ANDROID_HOME" ] || { echo "Error: Android SDK not found - set ANDROID_HOME."; exit 1; }
    export ANDROID_HOME ANDROID_SDK_ROOT="$ANDROID_HOME"
}

# Gradle needs a full JDK (javac); a JRE alone fails with "JAVA_COMPILER".
load_jdk() {
    if [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/javac" ]; then return; fi
    if command -v javac >/dev/null; then return; fi
    local jdk
    for jdk in "$HOME"/.jdks/jdk-17*; do
        if [ -x "$jdk/bin/javac" ]; then export JAVA_HOME="$jdk"; return; fi
    done
    echo "Error: no JDK found (javac). Install JDK 17 or set JAVA_HOME."
    exit 1
}

# android/app/build.gradle refuses a release build without the upload key.
check_signing() {
    local props="$HOME/.gradle/gradle.properties" missing=() key
    for key in SONARE_UPLOAD_STORE_FILE SONARE_UPLOAD_STORE_PASSWORD SONARE_UPLOAD_KEY_ALIAS SONARE_UPLOAD_KEY_PASSWORD; do
        grep -q "^$key=" "$props" 2>/dev/null || missing+=("$key")
    done
    [ ${#missing[@]} -eq 0 ] && return
    echo "Error: the release signing key isn't set up. Missing in $props:"
    printf '  %s\n' "${missing[@]}"
    echo ""
    echo "One-time setup (keep the keystore and passwords safe - every update must use the same key):"
    echo "  keytool -genkeypair -v -storetype PKCS12 -keystore ~/.gradle/sonare-upload.keystore \\"
    echo "          -alias sonare -keyalg RSA -keysize 2048 -validity 10000"
    echo "  then add to $props:"
    echo "    SONARE_UPLOAD_STORE_FILE=$HOME/.gradle/sonare-upload.keystore"
    echo "    SONARE_UPLOAD_STORE_PASSWORD=..."
    echo "    SONARE_UPLOAD_KEY_ALIAS=sonare"
    echo "    SONARE_UPLOAD_KEY_PASSWORD=..."
    exit 1
}

# The emulator APK, built for testing on a PC and never uploaded.
EMULATOR_APK=""

build_android() {
    echo ""
    echo "=== Building the Android release APKs ==="
    if [ "$ENV" = "dev" ]; then
        echo "Note: dev doesn't apply to Android. A release APK always uses the production API"
        echo "      (mobile/src/data/config.ts); people can point it elsewhere in Settings → Server address."
    fi
    check_signing
    load_android_sdk
    load_jdk
    cd "$MOBILE/android"
    ./gradlew assembleRelease
    # One APK per CPU (splits in app/build.gradle): arm64-v8a for phones, x86_64 for the emulator.
    local apks="app/build/outputs/apk/release" version
    version="$(android_version)"
    cp "$apks/app-arm64-v8a-release.apk" "$OUT/sonare-$version-android-arm64.apk"
    BUILT+=("sonare-$version-android-arm64.apk")
    EMULATOR_APK="sonare-$version-android-x86_64-emulator.apk"
    cp "$apks/app-x86_64-release.apk" "$OUT/$EMULATOR_APK"
    BUILT+=("$EMULATOR_APK")
}

# ---- run -------------------------------------------------------------------------------

load_nvm
echo ""
set_versions

if has_target linux || has_target windows; then
    version="$(desktop_version)"
    # One `neu build` makes the binaries for every platform.
    build_desktop
    has_target linux && package_linux "$version"
    has_target windows && package_windows "$version"
fi
has_target web && build_web "$(desktop_version)"
has_target android && build_android

echo ""
echo "=== Built (in $OUT) ==="
for f in "${BUILT[@]}"; do
    printf '  %-48s %s\n' "$f" "$(du -h "$OUT/$f" | cut -f1)"
done
if [ ${#CHANGED[@]} -gt 0 ]; then
    echo ""
    echo "Version changed in (commit these):"
    printf '  %s\n' "${CHANGED[@]#"$SCRIPT_DIR/"}"
fi
if [ "$ENV" = "dev" ] && { has_target linux || has_target windows || has_target web; }; then
    echo ""
    echo "These desktop/web builds use the dev API (VITE_API_BASE). Build with prod before"
    echo "uploading them on the admin page's Releases tab."
else
    echo ""
    echo "Upload them on the admin page: /admin/releases."
fi
if [ -n "$EMULATOR_APK" ]; then
    echo "$EMULATOR_APK is for the emulator on this PC (adb install) - don't upload it."
fi
