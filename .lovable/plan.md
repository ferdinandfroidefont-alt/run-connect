

## Plan: Fix Double `FirebaseApp.configure()` Crash + Ensure Push Flow

### Root Cause

The crash at AppDelegate.swift line 13 on `+[FIRApp configure]` is caused by Firebase being configured twice:
1. **Firebase auto-initialization**: The `Firebase/Messaging` pod (which pulls in `Firebase/Core`) can auto-configure when a `GoogleService-Info.plist` exists in the bundle, even with `FirebaseAppDelegateProxyEnabled = false` (that flag only controls APNs swizzling, not auto-init).
2. **Explicit call**: The script injects a bare `FirebaseApp.configure()` — if Firebase already auto-initialized, this crashes.

### Changes

#### 1. `scripts/configure_ios_push.sh` — Safe Firebase init injection

Replace the `sed` block (lines 36-44) that injects bare `FirebaseApp.configure()` with a safe version:

```swift
if FirebaseApp.app() == nil {
    FirebaseApp.configure()
    print("[PUSH][IOS] Firebase configured")
} else {
    print("[PUSH][IOS] Firebase already configured, skipping")
}
Messaging.messaging().delegate = self
```

Also update the `grep` assertion (line 47) to match `FirebaseApp.app()` instead of just `FirebaseApp.configure`.

Add a new assertion to ensure there is **exactly one** occurrence of `FirebaseApp.configure` (not two).

#### 2. `.github/workflows/ios-appstore.yml` — Disable Firebase auto-init

Add `FirebaseAutoConfigEnabled = false` in the Info.plist step (alongside the existing `FirebaseAppDelegateProxyEnabled = false`) to prevent Firebase from auto-initializing before our code runs. This is belt-and-suspenders with the nil check.

#### 3. `src/hooks/usePushNotifications.tsx` — No changes needed

The iOS APNs filtering and `fcmTokenReady` listener are already correctly configured from previous fixes.

#### 4. `scripts/inject_ios_push.py` — No changes needed

The Swift methods injected by this script don't contain `FirebaseApp.configure()`. They handle APNs/FCM exchange and WebView bridge only.

### Files to modify
- `scripts/configure_ios_push.sh` — Safe `FirebaseApp.configure()` with nil check + single-occurrence assertion
- `.github/workflows/ios-appstore.yml` — Add `FirebaseAutoConfigEnabled = false` in Info.plist step

### Expected outcome
1. App launches without crash
2. Firebase initializes exactly once (safe guard)
3. APNs token received → exchanged for FCM token → injected into WebView
4. Frontend saves FCM token via edge function → `profiles.push_token` populated
5. "Tester les notifications" → `fcm_sent: true` → push delivered

