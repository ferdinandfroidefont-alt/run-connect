

## Diagnostic: Root Causes Identified

### Cause #1 (CRITICAL): `FirebaseApp.configure()` never injected

In `scripts/configure_ios_push.sh` line 34:
```bash
sed -i '' '/super.application.*didFinishLaunchingWithOptions/a\
```

This pattern matches `super.application(application, didFinishLaunchingWithOptions:...)`. But **Capacitor's default AppDelegate.swift does NOT call `super.application(...)`**. It just has:

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: ...) -> Bool {
    return true
}
```

The `sed` silently fails → `FirebaseApp.configure()` is never added → Firebase is never initialized → no FCM token exchange → `messaging(didReceiveRegistrationToken)` never fires → `fcmTokenReady` never dispatched → WebView only gets raw APNs token.

### Cause #2: Frontend saves APNs token via direct Supabase client

The previous fix removed `isRawApnsToken` filtering. Now the `registration` event saves the hex-64 APNs token via `supabase.from('profiles').update(...)` (line 246), which has NO APNs filter. The edge function rejects it (422), but the direct client save succeeds first. Then `send-push-notification` sends this to FCM → UNREGISTERED → cleanup → null.

### Cause #3: No post-injection assertion for FirebaseApp.configure()

The script prints "✅ FirebaseApp.configure() added" even when the sed didn't match.

---

## Fix Plan

### 1. Fix `scripts/configure_ios_push.sh` — Firebase initialization injection

Replace the `sed` pattern to match Capacitor's actual AppDelegate structure. Instead of looking for `super.application`, match `didFinishLaunchingWithOptions` and inject after `return true` or after the function opening:

```bash
# Replace the broken sed with a robust approach:
# Insert FirebaseApp.configure() at the START of didFinishLaunchingWithOptions
sed -i '' '/func application.*didFinishLaunchingWithOptions.*-> Bool {/a\
        FirebaseApp.configure()\
        Messaging.messaging().delegate = self\
        print("[PUSH][IOS] Firebase configured + MessagingDelegate set")
' "$DELEGATE"
```

Add a **hard assertion** after injection:
```bash
if ! grep -q "FirebaseApp.configure" "$DELEGATE"; then
  echo "❌ FATAL: FirebaseApp.configure() injection FAILED"
  cat "$DELEGATE"
  exit 1
fi
```

### 2. Fix `src/hooks/usePushNotifications.tsx` — Re-add iOS APNs filter

On iOS, the `registration` event gives the raw APNs hex token. This must NOT be saved to the DB because FCM will reject it. Re-add the filter specifically for iOS:

- In the `registration` listener: if platform is `ios` and token is hex-64, mark `apnsHexDetected=true`, store in `pendingTokenRef` but do NOT call `savePushToken()`. Wait for `fcmTokenReady`.
- The `fcmTokenReady` listener remains the primary save path for iOS.
- For Android, save any token immediately (existing behavior).
- Remove all direct Supabase client saves for iOS — always use edge function (which has the APNs hex guard).

### 3. Fix `scripts/inject_ios_push.py` — No changes needed

The Swift methods are correct. The issue was never the injected methods themselves — it was that Firebase was never initialized, so they never fired.

### 4. Verify bundle ID consistency

Already confirmed: `com.ferdi.runconnect` is consistent across `capacitor.config.ts`, workflow ExportOptions, and provisioning profiles.

### 5. `supabase/functions/save-push-token/index.ts` — No changes needed

Already has APNs hex-64 rejection (422). The issue was the frontend bypassing it via direct client save.

### 6. `.github/workflows/ios-appstore.yml` — No changes needed

`FirebaseAppDelegateProxyEnabled` is already set to `false`.

---

### Files to modify
- `scripts/configure_ios_push.sh` — Fix FirebaseApp.configure() injection pattern + hard assertion
- `src/hooks/usePushNotifications.tsx` — Re-add iOS APNs hex filter, only save FCM tokens on iOS

### Expected outcome after fix
1. CI injects `FirebaseApp.configure()` successfully (verified by assertion)
2. iOS app initializes Firebase → exchanges APNs token for FCM token
3. `messaging(didReceiveRegistrationToken)` fires → bridge injects FCM token into WebView
4. Frontend receives `fcmTokenReady` with real FCM token → saves via edge function
5. `send-push-notification` uses valid FCM token → push delivered

### Test protocol
1. Trigger CI build, verify logs show `FirebaseApp.configure()` assertion passing
2. Install on iPhone via TestFlight
3. Open Settings > Notifications > Debug section
4. Verify: `fcmTokenReady = true`, `FCM token length > 100`, `save response = 200`
5. Tap "Tester les notifications" — should show "Notification envoyée" (not "Token invalide")

