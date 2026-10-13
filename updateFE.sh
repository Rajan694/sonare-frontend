#!/bin/bash
set -e

# Brings this checkout up to date and runs an app: pull, install what changed, then
# ./runFE.sh <target> (dev) or a production web build served locally (prod). Installable
# releases are not made here: ../build.sh prod all bumps the versions on purpose.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

usage() {
    echo "Usage: ./updateFE.sh [web|linux|mobile] [dev|prod] [--no-run]"
    echo ""
    echo "  dev (default)  Pull, install, then ./runFE.sh <target>: the web (default) or linux"
    echo "                 dev server, or mobile = Metro + the debug app"
    echo "  prod           web only: pull, install, build the web app for production and serve"
    echo "                 it on http://localhost:5183 (it talks to the production API)"
    echo "  --no-run       Stop after installing (../update.sh starts things itself)"
    echo ""
    echo "Refuses to pull over uncommitted changes. npm packages are reinstalled only where"
    echo "package.json or package-lock.json changed (or node_modules is missing)."
    echo "Release builds (APK, Linux, Windows) come from ../build.sh prod all."
    exit 1
}

TARGET="web"
MODE="dev"
RUN=1
for arg in "$@"; do
    case "$arg" in
        web|linux|mobile) TARGET="$arg" ;;
        dev|prod) MODE="$arg" ;;
        --no-run) RUN=0 ;;
        *) usage ;;
    esac
done
if [ "$MODE" = "prod" ] && [ "$TARGET" != "web" ]; then
    echo "prod is for the web app; release builds of the apps: ../build.sh prod all"
    exit 1
fi

load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm use 22 >/dev/null 2>&1 || true
}
load_nvm

# ---- pull -------------------------------------------------------------------------------

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "Uncommitted changes here - commit or stash them before updating:"
    git status --short --untracked-files=no
    exit 1
fi
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" != "HEAD" ] || { echo "Detached HEAD - check out a branch first."; exit 1; }
BEFORE="$(git rev-parse HEAD)"
echo "=== Pulling $BRANCH ==="
git pull --ff-only
AFTER="$(git rev-parse HEAD)"
changed() { [ "$BEFORE" != "$AFTER" ] && [ -n "$(git diff --name-only "$BEFORE" "$AFTER" -- "$@")" ]; }

# ---- install ------------------------------------------------------------------------------

# Reinstalls a package dir when its manifests changed in this pull or it was never installed.
install_dir() {
    local dir="$1" prefix="${1:+$1/}"
    if [ ! -d "$SCRIPT_DIR/${prefix}node_modules" ] || changed "${prefix}package.json" "${prefix}package-lock.json"; then
        echo ""
        echo "=== Installing packages in ${dir:-the repo root} (npm ci) ==="
        (cd "$SCRIPT_DIR/$dir" && npm ci)
    fi
}

install_dir ""
if [ "$TARGET" = "mobile" ]; then install_dir mobile; else install_dir desktop; fi
# runFE.sh runs web and linux through Neutralino (web in its browser mode).
if [ "$TARGET" != "mobile" ] && [ ! -d desktop/bin ]; then
    echo ""
    echo "=== Downloading the NeutralinoJS binaries ==="
    (cd desktop && npx neu update)
fi

[ "$RUN" = "1" ] || { echo ""; echo "Frontend updated ($(git log -1 --format='%h %s'))."; exit 0; }

# ---- run ---------------------------------------------------------------------------------

echo ""
if [ "$MODE" = "dev" ]; then
    exec ./runFE.sh "$TARGET"
fi

echo "=== Building the web app for production ==="
cd desktop
SONARE_ENV=prod npm run build -- --sourcemap false
echo ""
echo "=== Serving it on http://localhost:5183 (Ctrl+C stops it) ==="
exec npx vite preview --port 5183 --strictPort
