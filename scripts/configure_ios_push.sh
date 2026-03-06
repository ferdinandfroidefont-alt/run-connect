#!/usr/bin/env bash
set -euo pipefail

DELEGATE="ios/App/App/AppDelegate.swift"

if [ ! -f "$DELEGATE" ]; then
  echo "⚠️ AppDelegate.swift not found"
  exit 0
fi

if ! grep -q "FirebaseCore" "$DELEGATE"; then
  # Add imports (include Capacitor for CAPBridgeViewController)
  sed -i '' 's/import UIKit/import UIKit\nimport FirebaseCore\nimport FirebaseMessaging\nimport Capacitor/' "$DELEGATE"

  # Add MessagingDelegate protocol conformance
  sed -i '' 's/class AppDelegate: UIResponder, UIApplicationDelegate/class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate/' "$DELEGATE"

  # Add FirebaseApp.configure() + Messaging delegate
  sed -i '' '/super.application.*didFinishLaunchingWithOptions/a\
    FirebaseApp.configure()\
    Messaging.messaging().delegate = self
  ' "$DELEGATE"

  # Inject APNs + FCM methods with WebView JS bridge
  python3 scripts/inject_ios_push.py --mode fresh

  echo "✅ Firebase + APNs + FCM WebView bridge configured in AppDelegate"
else
  echo "ℹ️ Firebase already configured in AppDelegate"

  # Still check if WebView bridge is missing
  if ! grep -q "injectFCMTokenIntoWebView" "$DELEGATE"; then
    echo "⚠️ WebView bridge missing, re-injecting..."

    # Add Capacitor import if missing
    if ! grep -q "import Capacitor" "$DELEGATE"; then
      sed -i '' 's/import FirebaseMessaging/import FirebaseMessaging\nimport Capacitor/' "$DELEGATE"
    fi

    # Add MessagingDelegate conformance if missing
    if ! grep -q "MessagingDelegate" "$DELEGATE"; then
      sed -i '' 's/class AppDelegate: UIResponder, UIApplicationDelegate/class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate/' "$DELEGATE"
    fi

    # Remove old APNs methods and re-inject with WebView bridge
    python3 scripts/inject_ios_push.py --mode update
  fi
fi
