#!/bin/zsh

set -euo pipefail

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
BUNDLE_ID="dev.lightlist"
APP_NAME="Lightlist.app"

cd "$ROOT_DIR"

xcodegen generate
xcodebuild -project Lightlist.xcodeproj \
  -scheme Lightlist \
  -configuration Debug \
  -derivedDataPath build \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build

APP_PATH=$(find "$ROOT_DIR/build" -path "*Debug-iphonesimulator/$APP_NAME" -print -quit 2>/dev/null || true)

if [[ -z "$APP_PATH" ]]; then
  echo "Built app not found after build: $APP_NAME"
  exit 1
fi

open -a Simulator

BOOTED_DEVICE=$(xcrun simctl list devices available | awk -F '[()]' '/Booted/ {print $2; exit}')
if [[ -z "$BOOTED_DEVICE" ]]; then
  BOOTED_DEVICE=$(xcrun simctl list devices available | awk -F '[()]' '/iPhone/ && /Shutdown/ {print $2; exit}')
  if [[ -z "$BOOTED_DEVICE" ]]; then
    echo "No available iPhone simulator found."
    exit 1
  fi
  xcrun simctl boot "$BOOTED_DEVICE"
fi

xcrun simctl bootstatus "$BOOTED_DEVICE" -b
xcrun simctl install "$BOOTED_DEVICE" "$APP_PATH"
xcrun simctl launch "$BOOTED_DEVICE" "$BUNDLE_ID"

echo "Built and launched $BUNDLE_ID on simulator $BOOTED_DEVICE"
