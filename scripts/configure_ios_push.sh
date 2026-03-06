#!/usr/bin/env bash
set -euo pipefail

DELEGATE_TARGET="ios/App/App/AppDelegate.swift"
DELEGATE_SOURCE="ios-source/AppDelegate.swift"
INFO_PLIST="ios/App/App/Info.plist"

echo "🔒 Strict Hybrid Mode: copying versioned AppDelegate.swift"

# ─── STEP 1: Copy versioned source ───
if [ ! -f "$DELEGATE_SOURCE" ]; then
  echo "❌ FATAL: $DELEGATE_SOURCE not found in repo!"
  exit 1
fi

cp "$DELEGATE_SOURCE" "$DELEGATE_TARGET"
echo "✅ Copied $DELEGATE_SOURCE → $DELEGATE_TARGET"

# ─── STEP 2: BLOCKING ASSERTION — exactly 1 FirebaseApp.configure() ───
CONFIGURE_COUNT=$(grep -c "FirebaseApp.configure()" "$DELEGATE_TARGET" || true)
if [ "$CONFIGURE_COUNT" -ne 1 ]; then
  echo "❌ FATAL: Found $CONFIGURE_COUNT occurrences of FirebaseApp.configure() in AppDelegate — expected exactly 1"
  grep -n "FirebaseApp.configure" "$DELEGATE_TARGET"
  exit 1
fi
echo "✅ FirebaseApp.configure() found exactly 1 time"

# ─── STEP 3: BLOCKING ASSERTION — exactly 1 didFinishLaunchingWithOptions ───
DFLO_COUNT=$(grep -c "didFinishLaunchingWithOptions" "$DELEGATE_TARGET" || true)
if [ "$DFLO_COUNT" -ne 1 ]; then
  echo "❌ FATAL: Found $DFLO_COUNT occurrences of didFinishLaunchingWithOptions — expected exactly 1"
  grep -n "didFinishLaunchingWithOptions" "$DELEGATE_TARGET"
  exit 1
fi
echo "✅ didFinishLaunchingWithOptions found exactly 1 time"

# ─── STEP 4: BLOCKING — check across ENTIRE ios/ tree for duplicates ───
TREE_COUNT=$(grep -rn "FirebaseApp.configure" ios/App/ | grep -v "//.*FirebaseApp" | wc -l | tr -d ' ')
if [ "$TREE_COUNT" -ne 1 ]; then
  echo "❌ FATAL: Found $TREE_COUNT occurrences of FirebaseApp.configure() across ios/App/ — expected exactly 1"
  grep -rn "FirebaseApp.configure" ios/App/
  exit 1
fi
echo "✅ FirebaseApp.configure() found exactly 1 time across ios/App/ tree"

# ─── STEP 5: Verify push markers ───
FAIL=0

if ! grep -q 'Messaging.messaging().apnsToken = deviceToken' "$DELEGATE_TARGET"; then
  echo "❌ ASSERTION FAILED: Messaging.messaging().apnsToken = deviceToken NOT FOUND"
  FAIL=1
fi

if ! grep -q 'messaging(_ messaging: Messaging, didReceiveRegistrationToken' "$DELEGATE_TARGET"; then
  echo "❌ ASSERTION FAILED: messaging(didReceiveRegistrationToken) NOT FOUND"
  FAIL=1
fi

if ! grep -q 'injectFCMTokenIntoWebView' "$DELEGATE_TARGET"; then
  echo "❌ ASSERTION FAILED: injectFCMTokenIntoWebView NOT FOUND"
  FAIL=1
fi

if ! grep -q 'fcmTokenReady' "$DELEGATE_TARGET"; then
  echo "❌ ASSERTION FAILED: fcmTokenReady event NOT FOUND"
  FAIL=1
fi

if ! grep -q 'PUSH.*IOS.*traceId' "$DELEGATE_TARGET"; then
  echo "❌ ASSERTION FAILED: traceId logging NOT FOUND"
  FAIL=1
fi

if ! grep -q 'FirebaseApp.app() == nil' "$DELEGATE_TARGET"; then
  echo "❌ ASSERTION FAILED: Safe nil-check guard NOT FOUND"
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "❌ BUILD FAILED: AppDelegate verification failed"
  exit 1
fi

echo "✅ All push markers verified"

# ─── STEP 6: Print full file to CI logs for proof ───
echo ""
echo "📋 === FULL AppDelegate.swift ($(wc -l < "$DELEGATE_TARGET") lines) ==="
cat -n "$DELEGATE_TARGET"
echo "=== END AppDelegate.swift ==="

# ─── STEP 7: VERIFY UIBackgroundModes ───
if [ -f "$INFO_PLIST" ]; then
  if ! plutil -p "$INFO_PLIST" | grep -q "remote-notification"; then
    echo "⚠️ Adding UIBackgroundModes remote-notification..."
    /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" "$INFO_PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes:0 string remote-notification" "$INFO_PLIST" 2>/dev/null || \
    echo "ℹ️ remote-notification may already exist in array"
  fi
  echo "✅ UIBackgroundModes verified"
fi

echo ""
echo "✅ AppDelegate.swift configured (versioned source, strict hybrid mode)"
