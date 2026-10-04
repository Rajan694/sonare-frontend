#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
}

load_nvm
nvm use 22 2>/dev/null

echo "=== Installing the git hooks (husky + lint-staged) ==="
cd "$SCRIPT_DIR" && npm install

echo ""
echo "=== Installing mobile (React Native) packages ==="
cd "$SCRIPT_DIR/mobile" && npm install

echo ""
echo "=== Installing desktop (React + TypeScript + NeutralinoJS) packages ==="
cd "$SCRIPT_DIR/desktop" && npm install

echo ""
echo "=== Downloading NeutralinoJS binaries ==="
npx neu update

echo ""
echo "=== Building desktop once (creates resources/, needed for app + tray icons) ==="
npm run build

echo ""
echo "All packages installed."
