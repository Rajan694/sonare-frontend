#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
    echo "Usage: ./runFE.sh <web|linux|windows|mobile> [options]"
    echo ""
    echo "Targets:"
    echo "  web       Run NeutralinoJS in browser mode (Vite dev server on 5183 + HMR)"
    echo "  linux     Run NeutralinoJS in window mode (Vite dev server on 5184 + HMR)."
    echo "            Uses its own ports, so it can run alongside 'web'."
    echo "  windows   Build NeutralinoJS for Windows"
    echo "  mobile    Start React Native Metro + Android"
    echo ""
    echo "Options (mobile only):"
    echo "  --port <number>   Metro port (default 8081). Use this when 8081 is"
    echo "                    already taken - the port is baked into the debug"
    echo "                    APK, so it must be set here rather than by starting"
    echo "                    Metro separately."
    echo "  --emulator[=<avd>] Install on the emulator even when a phone is plugged in."
    echo "                    Boots <avd> (default: the first one) if none is running."
    echo "  --device <serial> Install on this adb serial (see 'adb devices')."
    echo "                    Without either, ANDROID_SERIAL is used if set, otherwise"
    echo "                    every attached device gets the app."
    echo ""
    echo "Examples:"
    echo "  ./runFE.sh linux"
    echo "  ./runFE.sh mobile"
    echo "  ./runFE.sh mobile --port 8090"
    echo "  ./runFE.sh mobile --emulator"
    exit 1
}

TARGET="$1"
shift 2>/dev/null

if [ -z "$TARGET" ]; then
    usage
fi

load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
}

# The React Native CLI shells out to a bare `adb`, and Gradle needs the SDK path.
# Neither works from a plain login shell here, so resolve the SDK ourselves.
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

    if [ -z "$ANDROID_HOME" ]; then
        echo "Error: Android SDK not found."
        echo "Install it, or set ANDROID_HOME to your SDK directory."
        exit 1
    fi

    export ANDROID_HOME
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
}

# Gradle needs a full JDK (javac); a JRE alone fails with "JAVA_COMPILER". run.sh's
# terminals are non-interactive login shells, so a JAVA_HOME set in ~/.bashrc never
# reaches us and the system JRE wins. Same lookup as buildFE.sh.
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

# Vite and Metro each need an inotify instance to watch files. The default per-user limit
# (128) is easily used up by editors and language servers, and then whichever dev server
# starts last dies with "EMFILE: too many open files, watch".
inotify_hint() {
    local limit
    limit=$(cat /proc/sys/fs/inotify/max_user_instances 2>/dev/null) || return
    [ "$limit" -ge 512 ] && return
    echo "If the log above says 'EMFILE: too many open files, watch', the inotify limit"
    echo "($limit instances per user) is used up. Raise it once with:"
    echo "  echo fs.inotify.max_user_instances=1024 | sudo tee /etc/sysctl.d/60-inotify.conf && sudo sysctl --system"
}

METRO_PORT=""
DEVICE=""
USE_EMULATOR=0
EMULATOR_AVD=""
MOBILE_APP_ID="com.mobile"
# The Sonare backend (sonare-backend runBE.sh); debug builds reach it at localhost:3010.
BACKEND_PORT=3010

# Debug builds reach Metro at the emulator's 10.0.2.2 alias by default, i.e. over the
# emulator's own network. Cutting that network to test Offline Mode then cut Metro too
# ("Cannot connect to Metro" / "Fast Refresh disconnected" popups), and Android 17 asks for
# local-network access to use the alias at all. Point the app's dev settings at
# localhost instead, carried over the adb link by `adb reverse`. Fails (returns 1) until the
# app is installed, since it writes into the app's own data directory.
point_app_at_local_metro() {
    local tmp="/data/local/tmp/sonare_dev_prefs.xml" ok
    adb reverse "tcp:$1" "tcp:$1" >/dev/null 2>&1 || return 1
    printf '%s\n' "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>" '<map>' \
        "    <string name=\"debug_http_host\">localhost:$1</string>" '</map>' | adb shell "cat > $tmp"
    adb shell "run-as $MOBILE_APP_ID sh -c 'mkdir -p shared_prefs && cp $tmp shared_prefs/${MOBILE_APP_ID}_preferences.xml'" >/dev/null 2>&1
    ok=$?
    adb shell rm -f "$tmp" >/dev/null 2>&1
    return $ok
}

# `web` goes through `neu run`, which can only serve cli.frontendLibrary.devUrl (5183) and
# has Neutralino write .tmp/auth_info.json, where the dev server looks up its port. Two
# `neu run`s would fight over both, so the window build is started by hand on its own
# ports instead, and leaves auth_info.json to `web`.
LINUX_VITE_PORT=5184
# Not `local`: the EXIT trap below runs after the function has returned.
LINUX_VITE_PID=""
LINUX_NL_PID=""

run_linux_window() {
    local binary nl_port
    case "$(uname -m)" in
        x86_64) binary="bin/neutralino-linux_x64" ;;
        aarch64|arm64) binary="bin/neutralino-linux_arm64" ;;
        armv7l) binary="bin/neutralino-linux_armhf" ;;
        *) echo "Error: unsupported CPU '$(uname -m)'"; exit 1 ;;
    esac
    if [ ! -x "$binary" ]; then
        echo "Error: $binary is missing - run ./installFE.sh first."
        exit 1
    fi

    vite_is_up() {
        curl -s -o /dev/null -m 2 "http://localhost:$LINUX_VITE_PORT/"
    }
    if vite_is_up; then
        echo "Error: port $LINUX_VITE_PORT is already in use - is another 'linux' run still open?"
        exit 1
    fi

    # Chosen up front so the dev server can point the page's globals script at it.
    # A string, not a number: with FORCE_COLOR set, console.log colours numbers.
    nl_port=$(node -e 'const s = require("net").createServer(); s.listen(0, "127.0.0.1", () => { console.log(String(s.address().port)); s.close(); })')

    SONARE_VITE_PORT=$LINUX_VITE_PORT SONARE_NL_PORT=$nl_port node_modules/.bin/vite &
    LINUX_VITE_PID=$!
    trap 'kill $LINUX_VITE_PID $LINUX_NL_PID 2>/dev/null' EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM

    for _ in $(seq 1 60); do
        vite_is_up && break
        sleep 0.5
    done
    if ! vite_is_up; then
        echo "Error: the dev server did not come up on port $LINUX_VITE_PORT."
        inotify_hint
        exit 1
    fi

    # In the background with `wait`, so a TERM from ../run.sh is handled straight away
    # and closes the window too, instead of waiting for it to exit on its own.
    "$binary" --load-dir-res --path=. --port="$nl_port" --url="http://localhost:$LINUX_VITE_PORT" --window-enable-inspector=true &
    LINUX_NL_PID=$!
    wait "$LINUX_NL_PID"
}

parse_mobile_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --port)
                METRO_PORT="$2"
                shift 2
                ;;
            --port=*)
                METRO_PORT="${1#*=}"
                shift
                ;;
            --emulator)
                USE_EMULATOR=1
                shift
                ;;
            --emulator=*)
                USE_EMULATOR=1
                EMULATOR_AVD="${1#*=}"
                shift
                ;;
            --device)
                DEVICE="$2"
                shift 2
                ;;
            --device=*)
                DEVICE="${1#*=}"
                shift
                ;;
            *)
                echo "Error: Unknown option '$1' for target 'mobile'"
                usage
                ;;
        esac
    done

    if [ -n "$METRO_PORT" ] && ! [ "$METRO_PORT" -eq "$METRO_PORT" ] 2>/dev/null; then
        echo "Error: --port expects a number, got '$METRO_PORT'"
        exit 1
    fi
    if [ "$USE_EMULATOR" = 1 ] && [ -n "$DEVICE" ]; then
        echo "Error: pass --emulator or --device, not both"
        exit 1
    fi
}

running_emulator() {
    adb devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1; exit }'
}

# Sets DEVICE to a booted emulator's serial, starting one if none is up. setsid keeps the
# emulator running after this script exits, so the next run doesn't wait for a cold boot.
pick_emulator() {
    local avd
    DEVICE="$(running_emulator)"
    [ -n "$DEVICE" ] && return

    avd="${EMULATOR_AVD:-$(emulator -list-avds 2>/dev/null | head -1)}"
    if [ -z "$avd" ]; then
        echo "Error: no emulator is running and there is no AVD to start - create one in Android Studio."
        exit 1
    fi
    echo "Starting the $avd emulator..."
    setsid emulator -avd "$avd" >/dev/null 2>&1 < /dev/null &

    for _ in $(seq 1 90); do
        DEVICE="$(running_emulator)"
        if [ -n "$DEVICE" ] && \
           [ "$(adb -s "$DEVICE" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; then
            return
        fi
        sleep 2
    done
    echo "Error: the $avd emulator did not finish booting."
    exit 1
}

# `neu run`/`neu build` drive Vite themselves via cli.frontendLibrary in
# neutralino.config.json - don't start `npm run dev` separately, the dev server
# port is strict and neu waits for it.
case "$TARGET" in
    web)
        [ $# -gt 0 ] && { echo "Error: 'web' takes no options"; usage; }
        cd "$SCRIPT_DIR/desktop"
        npx neu run -- --mode=browser
        ;;
    linux)
        [ $# -gt 0 ] && { echo "Error: 'linux' takes no options"; usage; }
        cd "$SCRIPT_DIR/desktop"
        run_linux_window
        ;;
    windows)
        [ $# -gt 0 ] && { echo "Error: 'windows' takes no options"; usage; }
        cd "$SCRIPT_DIR/desktop"
        npx neu build --release
        echo "Build output in: desktop/dist/sonare-desktop/"
        ;;
    mobile)
        parse_mobile_args "$@"
        load_nvm
        nvm use 22 2>/dev/null
        load_android_sdk
        load_jdk
        cd "$SCRIPT_DIR/mobile"

        [ "$USE_EMULATOR" = 1 ] && pick_emulator
        DEVICE="${DEVICE:-$ANDROID_SERIAL}"
        DEVICE_ARGS=()
        if [ -n "$DEVICE" ]; then
            # adb honours ANDROID_SERIAL, which covers the reverse/shell calls below;
            # run-android only looks at --device.
            export ANDROID_SERIAL="$DEVICE"
            DEVICE_ARGS=(--device "$DEVICE")
            echo "Using device $DEVICE."
        fi

        PORT="${METRO_PORT:-8081}"
        STATUS_URL="http://127.0.0.1:$PORT/status"

        metro_is_up() {
            curl -s -m 2 "$STATUS_URL" 2>/dev/null | grep -q "packager-status:running"
        }

        # The RN CLI can only start Metro by opening a new terminal window, and
        # bails out ("no terminal app was specified") on a plain shell. Start it
        # ourselves instead, so this stays a single command everywhere.
        METRO_PID=""
        if metro_is_up; then
            echo "Reusing the Metro server already running on port $PORT."
        else
            echo "Starting Metro on port $PORT..."
            npx react-native start --port "$PORT" &
            METRO_PID=$!
            trap '[ -n "$METRO_PID" ] && kill "$METRO_PID" 2>/dev/null' EXIT INT TERM

            for _ in $(seq 1 60); do
                metro_is_up && break
                sleep 1
            done

            if ! metro_is_up; then
                echo "Error: Metro did not come up on port $PORT."
                echo "Something else may be using it - try a different --port."
                inotify_hint
                exit 1
            fi
        fi

        # Build the bundle before the app launches. The app only waits a couple of
        # seconds for Metro and otherwise falls back to the (absent) asset bundle,
        # which surfaces as a red "Unable to load script" box.
        echo "Warming the JS bundle..."
        curl -s -o /dev/null "http://127.0.0.1:$PORT/index.bundle?platform=android&dev=true&minify=false"

        # Debug builds call the backend at localhost:3010 (mobile/src/data/config.ts); carry
        # that over the adb link too, so the emulator and a USB phone both reach this machine.
        if ! adb reverse "tcp:$BACKEND_PORT" "tcp:$BACKEND_PORT" >/dev/null 2>&1; then
            echo "Note: could not forward port $BACKEND_PORT to the device (is one attached?)."
            echo "      Without it the app can't reach the backend; on Wi-Fi only, set the"
            echo "      computer's LAN address in the app under Settings → Server address."
        fi

        # Already installed: point it at localhost before it launches. A fresh install
        # has no data directory yet, so it gets pointed right after and restarted.
        METRO_HOST_SET=0
        point_app_at_local_metro "$PORT" && METRO_HOST_SET=1
        if [ "$METRO_HOST_SET" = 0 ]; then
            # Only this first launch goes through 10.0.2.2, which Android 17 (SDK 37) gates.
            echo "Note: if the app asks for local-network access on first launch, tap Allow."
            echo "      Declining it leaves a red \"Unable to load script\" box."
        fi

        # Native code (Reanimated, Worklets, Screens, SVG...) is C++ compiled once per ABI.
        # gradle.properties lists all four for release builds; a dev run only needs the
        # attached device's, which cuts the native build to a quarter.
        npx react-native run-android --no-packager --port "$PORT" --active-arch-only "${DEVICE_ARGS[@]}"

        if [ "$METRO_HOST_SET" = 0 ] && point_app_at_local_metro "$PORT"; then
            adb shell am force-stop "$MOBILE_APP_ID"
            adb shell am start -n "$MOBILE_APP_ID/.MainActivity" >/dev/null
        fi

        if [ -n "$METRO_PID" ]; then
            echo ""
            echo "Metro is running on port $PORT. Press Ctrl+C to stop it."
            wait "$METRO_PID"
        fi
        ;;
    *)
        echo "Error: Unknown target '$TARGET'"
        usage
        ;;
esac
