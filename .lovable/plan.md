

## Plan: Fix iOS Crash — Versioned AppDelegate + Strict CI

### Root Cause (Refined)

The crash at `+[FIRApp configure]` line 13 persists because the sed-based injection into a Capacitor-generated AppDelegate is inherently fragile. Capacitor 8 alpha may generate a different AppDelegate structure than expected, causing malformed Swift or unexpected initialization order. The `FirebaseAutoConfigEnabled` key set in the workflow is NOT a real Firebase iOS SDK key — it does nothing.

The only reliable fix: **stop injecting code into an unknown template**. Version the complete AppDelegate.swift directly.

### Changes

#### 1. Create `ios-source/AppDelegate.swift` (NEW FILE)

A complete, production-ready AppDelegate.swift with:
- All imports (UIKit, FirebaseCore, FirebaseMessaging, Capacitor)
- `MessagingDelegate` conformance
- Safe Firebase init: `if FirebaseApp.app() == nil { FirebaseApp.configure() }`
- `Messaging.messaging().delegate = self`
- All push methods (APNs registration, FCM token exchange, WebView bridge)
- Extensive `[PUSH][IOS]` logging

This file is the single source of truth. No more sed injection.

#### 2. Rewrite `scripts/configure_ios_push.sh`

Replace all the sed-injection logic with a simple copy + assertion:

```text
1. Copy ios-source/AppDelegate.swift → ios/App/App/AppDelegate.swift
2. Assert FirebaseApp.configure appears exactly ONCE
3. Assert didFinishLaunchingWithOptions appears exactly ONCE
4. Assert all push markers present
5. Print full file to CI logs for proof
```

Remove `inject_ios_push.py` call — all code is already in the versioned file.

#### 3. Update `.github/workflows/ios-appstore.yml`

- Remove the `FirebaseAutoConfigEnabled` line (not a real Firebase key)
- Keep `FirebaseAppDelegateProxyEnabled = false`
- Add a dedicated blocking assertion step that counts occurrences across ALL Swift files:
  ```bash
  grep -rn "FirebaseApp.configure" ios/ | wc -l  # must be exactly 1
  grep -rn "didFinishLaunchingWithOptions" ios/ | wc -l  # verify
  ```

#### 4. `scripts/inject_ios_push.py` — Mark as no longer needed

The push methods are now part of the versioned AppDelegate. Keep the file for reference but it won't be called.

### Files to create/modify
- `ios-source/AppDelegate.swift` — NEW: complete versioned AppDelegate
- `scripts/configure_ios_push.sh` — Rewrite: copy + assertions only
- `.github/workflows/ios-appstore.yml` — Add blocking assertions, remove fake key

### Final AppDelegate.swift structure

```text
import UIKit
import FirebaseCore
import FirebaseMessaging
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    func application(didFinishLaunchingWithOptions) -> Bool {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        Messaging.messaging().delegate = self
        return true
    }

    func application(didRegisterForRemoteNotifications) { ... }
    func application(didFailToRegisterForRemoteNotifications) { ... }
    func messaging(didReceiveRegistrationToken) { ... }
    private func injectFCMTokenIntoWebView() { ... }
}
```

### CI assertion step

```bash
# BLOCKING: exactly 1 FirebaseApp.configure in entire ios/ tree
COUNT=$(grep -rn "FirebaseApp.configure" ios/ | grep -v "//.*FirebaseApp" | wc -l | tr -d ' ')
if [ "$COUNT" -ne 1 ]; then
  echo "❌ FATAL: Found $COUNT occurrences of FirebaseApp.configure()"
  grep -rn "FirebaseApp.configure" ios/
  exit 1
fi

# BLOCKING: exactly 1 didFinishLaunchingWithOptions implementation
DFLO=$(grep -rn "didFinishLaunchingWithOptions.*-> Bool" ios/App/App/AppDelegate.swift | wc -l | tr -d ' ')
if [ "$DFLO" -ne 1 ]; then
  echo "❌ FATAL: Found $DFLO didFinishLaunchingWithOptions"
  exit 1
fi
```

### Why this will work
- No more sed pattern matching against unknown Capacitor templates
- No more risk of double injection from script re-runs
- The AppDelegate is fully controlled and tested
- CI assertions block the build if ANY duplication exists
- `FirebaseApp.app() == nil` check is belt-and-suspenders safety

