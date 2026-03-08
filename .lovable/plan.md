

# Fix iOS SIGABRT Crash — Firebase Double-Init

## Root Cause
The crash report shows `+[FIRApp configure]` (FIRApp.m:110) throwing `SIGABRT` at launch (0.065s after start). This line in Firebase source throws `NSException` when `configure()` is called and `sDefaultApp` already exists.

The `configure_ios_push.sh` script injects a nil guard (`if FirebaseApp.app() == nil`), but this isn't sufficient because:
1. Firebase/Messaging pod (from `@capacitor/push-notifications` podspec) may auto-initialize via `GoogleService-Info.plist` before `didFinishLaunchingWithOptions` runs
2. The `sed` injection might produce timing issues where `app()` returns nil but configure still races

## Fix
Make the Firebase initialization **crash-proof** by wrapping it in a `@objc` safety pattern. Two changes in `scripts/configure_ios_push.sh`:

### Change 1: Replace nil guard with try-catch equivalent
Swift doesn't have try-catch for NSExceptions, so use `@objc` interop. The safest approach: keep the nil guard AND add a secondary check using `objc_try_catch` pattern, or more practically — just check BOTH `FirebaseApp.app()` and wrap in a redundant guard:

```swift
if FirebaseApp.app() == nil {
    FirebaseApp.configure()
} 
// If configure was called elsewhere, this is fine — we skip it
Messaging.messaging().delegate = self
```

But since this EXACT code is what's crashing, the issue is that `FirebaseApp.app()` returns nil even though Firebase auto-init has partially started. The real fix:

**Remove `FirebaseApp.configure()` from AppDelegate entirely** and let the Firebase pod auto-configure via `GoogleService-Info.plist`. Since `FirebaseAppDelegateProxyEnabled` is false, the proxy is disabled but auto-init still works. We only need to set the Messaging delegate.

### Changes to `scripts/configure_ios_push.sh`
- Replace the Firebase configure block: instead of calling `FirebaseApp.configure()`, just set `Messaging.messaging().delegate = self` 
- Add a delayed check that logs whether Firebase auto-initialized
- Keep the nil guard as a FALLBACK only after a delay (not at launch)

### Changes to `.github/workflows/ios-appstore.yml`  
- Change `FirebaseAppDelegateProxyEnabled` to keep it `false` (unchanged)
- Ensure `GoogleService-Info.plist` is placed correctly (unchanged)

### Concrete implementation

In `configure_ios_push.sh`, the sed injection block (lines 36-45) changes from:
```swift
if FirebaseApp.app() == nil {
    FirebaseApp.configure()
}
Messaging.messaging().delegate = self
```
To:
```swift
// Firebase auto-configures via GoogleService-Info.plist
// Manual configure() removed to prevent double-init SIGABRT
DispatchQueue.main.async {
    if FirebaseApp.app() == nil {
        FirebaseApp.configure()
        print("[PUSH][IOS] FirebaseApp.configure() called manually (auto-init failed)")
    } else {
        print("[PUSH][IOS] FirebaseApp already configured (auto-init OK)")
    }
    Messaging.messaging().delegate = self
    print("[PUSH][IOS] MessagingDelegate set")
}
```

By deferring to `DispatchQueue.main.async`, the code runs AFTER all `+load` methods and framework initialization complete, ensuring the nil guard accurately reflects Firebase's state. The Messaging delegate is also set in the same async block to maintain ordering.

### Files to edit
1. `scripts/configure_ios_push.sh` — defer Firebase init to async block

