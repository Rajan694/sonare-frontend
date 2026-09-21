#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
    echo "Usage: ./runFE.sh <web|linux|windows|mobile> [options]"
    echo ""
    echo "Targets:"
    echo "  web       Run NeutralinoJS in browser mode (Vite dev server + HMR)"
    echo "  linux     Run NeutralinoJS in window mode (Vite dev server + HMR)"
    echo "  windows   Build NeutralinoJS for Windows"
    echo "  mobile    Start React Native Metro + Android"
    echo ""
    echo "Options (mobile only):"
    echo "  --port <number>   Metro port (default 8081). Use this when 8081 is"
    echo "                    already taken - the port is baked into the debug"
    echo "                    APK, so it must be set here rather than by starting"
    echo "                    Metro separately."
    echo ""
    echo "Examples:"
    echo "  ./runFE.sh linux"
    echo "  ./runFE.sh mobile"
    echo "  ./runFE.sh mobile --port 8090"
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

METRO_PORT=""

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
}

# `neu run`/`neu build` drive Vite themselves via cli.frontendLibrary in
# neutralino.config.json - don't start `npm run dev` separately, the dev server
# port is strict and neu waits for it.
case "$TARGET" in
    web)
        [ $# -gt 0 ] && { echo "Error: 'web' takes no options"; usage; }
        cd "$SCRIPT_DIR/other-screens"
        npx neu run -- --mode=browser
        ;;
    linux)
        [ $# -gt 0 ] && { echo "Error: 'linux' takes no options"; usage; }
        cd "$SCRIPT_DIR/other-screens"
        npx neu run
        ;;
    windows)
        [ $# -gt 0 ] && { echo "Error: 'windows' takes no options"; usage; }
        cd "$SCRIPT_DIR/other-screens"
        npx neu build --release
        echo "Build output in: other-screens/dist/"
        ;;
    mobile)
        parse_mobile_args "$@"
        load_nvm
        nvm use 22 2>/dev/null
        load_android_sdk
        cd "$SCRIPT_DIR/mobile"

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
                exit 1
            fi
        fi

        # Build the bundle before the app launches. The app only waits a couple of
        # seconds for Metro and otherwise falls back to the (absent) asset bundle,
        # which surfaces as a red "Unable to load script" box.
        echo "Warming the JS bundle..."
        curl -s -o /dev/null "http://127.0.0.1:$PORT/index.bundle?platform=android&dev=true&minify=false"

        # Android 17 (SDK 37) gates local-network addresses, including the
        # emulator's 10.0.2.2 alias that Metro is reached through.
        echo "Note: if the app asks for local-network access on first launch, tap Allow."
        echo "      Declining it leaves a red \"Unable to load script\" box."

        npx react-native run-android --no-packager --port "$PORT"

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
