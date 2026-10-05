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
    echo "Usage: ./buildFE.sh <target>... [--env=dev|prod] [--formats=LIST] [--out=DIR]"
    echo ""
    echo "Targets (one or more):"
    echo "  android   Release APK (always talks to the production API, like any release build)"
    echo "  linux     Linux x64 packages: .tar.gz, .deb, and .AppImage when appimagetool is installed"
    echo "  windows   Windows x64 .exe (one file, the app's resources embedded)"
    echo "  web       The web app as a .tar.gz, for a web server"
    echo "  all       All of the above"
    echo ""
    echo "Options:"
    echo "  --env=dev|prod   Which API the desktop and web builds use (default dev):"
    echo "                   dev  = VITE_API_BASE, prod = VITE_API_BASE_PROD (desktop/.env)."
    echo "                   Same switch as SONARE_ENV for a plain 'npm run build'."
    echo "  --formats=LIST   Linux formats, comma-separated: tar.gz,deb,appimage (default: all)"
    echo "  --out=DIR        Where the builds go (default: dist/releases)"
    echo ""
    echo "Examples:"
    echo "  ./buildFE.sh linux windows --env=prod"
    echo "  ./buildFE.sh android"
    echo "  ./buildFE.sh linux --formats=deb"
    exit 1
}

TARGETS=()
ENV="dev"
FORMATS="tar.gz,deb,appimage"
OUT="$SCRIPT_DIR/dist/releases"
for arg in "$@"; do
    case "$arg" in
        android|linux|windows|web) TARGETS+=("$arg") ;;
        all) TARGETS+=(android linux windows web) ;;
        --env=*) ENV="${arg#--env=}" ;;
        --formats=*) FORMATS="${arg#--formats=}" ;;
        --out=*) OUT="${arg#--out=}" ;;
        -h|--help) usage ;;
        *) echo "Error: unknown argument '$arg'"; echo ""; usage ;;
    esac
done
[ ${#TARGETS[@]} -eq 0 ] && usage
case "$ENV" in dev|prod) ;; *) echo "Error: --env must be dev or prod, not '$ENV'"; exit 1 ;; esac
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

# ---- desktop (Linux, Windows) and web ---------------------------------------------------

desktop_version() {
    node -p "require('$DESKTOP/neutralino.config.json').version"
}

# Builds run in a copy of desktop/ (node_modules linked in), so they never touch the dev
# setup: `neu build` packs and then empties .tmp, where a running `./runFE.sh web` keeps
# its auth token, and rewrites resources/ and dist/.
STAGE=""
cleanup_stage() { [ -n "$STAGE" ] && rm -rf "$STAGE"; }
trap cleanup_stage EXIT

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
    node -e '
        const c = require("./neutralino.config.json");
        c.dataLocation = "system";
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

build_android() {
    echo ""
    echo "=== Building the Android release APK ==="
    if [ "$ENV" = "dev" ]; then
        echo "Note: --env doesn't apply to Android. A release APK always uses the production API"
        echo "      (mobile/src/data/config.ts); people can point it elsewhere in Settings → Server address."
    fi
    check_signing
    load_android_sdk
    load_jdk
    cd "$MOBILE/android"
    ./gradlew assembleRelease
    local version
    version="$(sed -n 's/^\s*versionName "\(.*\)"/\1/p' app/build.gradle | head -1)"
    local name="sonare-$version-android.apk"
    cp app/build/outputs/apk/release/app-release.apk "$OUT/$name"
    BUILT+=("$name")
}

# ---- run -------------------------------------------------------------------------------

load_nvm

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
if [ "$ENV" = "dev" ] && { has_target linux || has_target windows || has_target web; }; then
    echo ""
    echo "These desktop/web builds use the dev API (VITE_API_BASE). Build with --env=prod before"
    echo "uploading them on the admin page's Releases tab."
else
    echo ""
    echo "Upload them on the admin page: /admin/releases."
fi
