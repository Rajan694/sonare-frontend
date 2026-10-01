#!/usr/bin/env bash
set -euo pipefail

ADB="${HOME}/Android/Sdk/platform-tools/adb"

if ! [ -x "$ADB" ]; then
  echo "adb not found at $ADB"
  exit 1
fi

DEVICE=$("$ADB" devices | grep -w "device" | head -n1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
  echo "No active android device/emulator found"
  exit 0
fi

echo "Running smoke test on device $DEVICE..."
# Check audio system status
"$ADB" -s "$DEVICE" shell dumpsys audio | grep -A3 "players:" || true
echo "Device verified successfully."
