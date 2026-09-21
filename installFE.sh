#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
}

echo "=== Installing mobile (React Native) packages ==="
load_nvm
nvm use 22 2>/dev/null
cd "$SCRIPT_DIR/mobile" && npm install

echo ""
echo "=== Installing other-screens (React + TypeScript + NeutralinoJS) packages ==="
cd "$SCRIPT_DIR/other-screens" && npm install

echo ""
echo "=== Downloading NeutralinoJS binaries ==="
npx neu update

echo ""
echo "=== Building other-screens once (creates resources/, needed for app + tray icons) ==="
npm run build

echo ""
echo "All packages installed."
