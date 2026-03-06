#!/usr/bin/env bash
set -euo pipefail

DELEGATE="ios/App/App/AppDelegate.swift"
INFO_PLIST="ios/App/App/Info.plist"

if [ ! -f "$DELEGATE" ]; then
  echo "⚠️ AppDelegate.swift not found at $DELEGATE"
  exit 0
fi

# ─── Always force re-injection for traceable builds ───
echo "🔄 Force re-injecting push methods for traceable build..."

# Add imports if missing
if ! grep -q "FirebaseCore" "$DELEGATE"; then
  sed -i '' 's/import UIKit/import UIKit\nimport FirebaseCore\nimport FirebaseMessaging\nimport Capacitor/' "$DELEGATE"
  echo "✅ Imports added"
fi

if ! grep -q "import Capacitor" "$DELEGATE"; then
  sed -i '' 's/import FirebaseMessaging/import FirebaseMessaging\nimport Capacitor/' "$DELEGATE"
  echo "✅ Capacitor import added"
fi

# Add MessagingDelegate conformance if missing
if ! grep -q "MessagingDelegate" "$DELEGATE"; then
  sed -i '' 's/class AppDelegate: UIResponder, UIApplicationDelegate/class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate/' "$DELEGATE"
  echo "✅ MessagingDelegate conformance added"
fi

# Add FirebaseApp.configure() if missing
if ! grep -q "FirebaseApp.configure" "$DELEGATE"; then
  sed -i '' '/super.application.*didFinishLaunchingWithOptions/a\
    FirebaseApp.configure()\
    Messaging.messaging().delegate = self
  ' "$DELEGATE"
  echo "✅ FirebaseApp.configure() added"
fi

# Always use update mode to replace any existing methods with instrumented version
python3 scripts/inject_ios_push.py --mode update

# ─── STRICT POST-INJECTION ASSERTIONS ───
echo ""
echo "🔍 Verifying injected code..."

FAIL=0

if ! grep -q 'Messaging.messaging().apnsToken = deviceToken' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: Messaging.messaging().apnsToken = deviceToken NOT FOUND"
  FAIL=1
fi

if ! grep -q 'messaging(_ messaging: Messaging, didReceiveRegistrationToken' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: messaging(didReceiveRegistrationToken) NOT FOUND"
  FAIL=1
fi

if ! grep -q 'injectFCMTokenIntoWebView' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: injectFCMTokenIntoWebView NOT FOUND"
  FAIL=1
fi

if ! grep -q 'fcmTokenReady' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: fcmTokenReady event NOT FOUND"
  FAIL=1
fi

if ! grep -q 'PUSH.*IOS.*traceId' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: traceId logging NOT FOUND"
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "❌ BUILD FAILED: AppDelegate injection verification failed"
  echo "--- AppDelegate.swift content ---"
  cat "$DELEGATE"
  exit 1
fi

echo "✅ All assertions passed"

# ─── SHOW INJECTED CODE IN CI LOGS (proof) ───
echo ""
echo "📋 === AppDelegate.swift push-relevant excerpt ==="
grep -n -A2 'PUSH\|fcmToken\|apnsToken\|injectFCM\|didRegister\|MessagingDelegate' "$DELEGATE" | head -60
echo "=== end excerpt ==="

# ─── VERIFY UIBackgroundModes ───
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
echo "✅ Firebase + APNs + FCM WebView bridge configured (instrumented build)"
