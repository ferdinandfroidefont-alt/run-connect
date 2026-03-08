

# Fix iOS Push: FCM token never received after removing `FirebaseApp.configure()`

## Diagnostic

The push debug shows:
- `apnsHexDetected: true` — APNs token received correctly
- `fcmTokenEventReceived: false` — FCM token **never** arrives
- `backendProfilePushToken` = raw APNs hex (64 chars) — wrong token in DB
- Error: "No fcmTokenReady after 15s"

**Root cause**: We removed `FirebaseApp.configure()` entirely to fix the SIGABRT crash, but this means Firebase Messaging is never properly initialized, so `Messaging.messaging().token` never returns an FCM token. The APNs-to-FCM exchange simply doesn't happen.

## Why the original crash happened

The build 231 crash was from a version that called `FirebaseApp.configure()` **without** a nil guard. The `Firebase/Messaging` pod auto-initializes Firebase via the plist, then our manual `configure()` call triggered a double-init exception.

## Fix

Add back `FirebaseApp.configure()` **with a proper nil guard** in `scripts/configure_ios_push.sh`:

```swift
if FirebaseApp.app() == nil {
    FirebaseApp.configure()
    print("[PUSH][IOS] FirebaseApp.configure() called")
} else {
    print("[PUSH][IOS] FirebaseApp already configured (auto-init via plist)")
}
Messaging.messaging().delegate = self
```

### Changes

**`scripts/configure_ios_push.sh`** (lines 32-43):
- Replace the current "no configure" block with the guarded `FirebaseApp.configure()` + `Messaging.messaging().delegate = self`
- The `if FirebaseApp.app() == nil` check prevents the double-init crash
- If auto-init already happened, it skips configure and just sets the delegate

This is the standard Firebase iOS pattern recommended by Google for apps that might have auto-init enabled.

