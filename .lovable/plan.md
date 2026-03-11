

# Plan: Fix iOS Push Token NULL — App Store Build

## Diagnostic summary

The user's detailed analysis is accurate. The core issue: on iOS App Store builds, `profiles.push_token` stays NULL because the FCM token never reaches the JS layer. Three fixes are needed, ordered by priority.

## Fix 1 (P0): Robustify WebView injection — rootVC retry when missing

**File**: `scripts/inject_ios_push.py`

The `injectFCMTokenIntoWebView` Swift method currently gives up immediately if `rootViewController` is nil (no retry for that case — only retries when bridge is not found). Also uses deprecated `UIApplication.shared.windows`.

Changes to the `SWIFT_METHODS` constant:
- Replace `UIApplication.shared.windows.first` with a Scene-aware `keyWindowRootVC()` helper that uses `UIApplication.shared.connectedScenes`
- Add retry when `rootVC` is nil (currently returns immediately — must retry like the bridge-not-found case)
- Increase max attempts from 5 to 8, reduce initial delay to 1s
- Also store FCM token in `UserDefaults` as a fallback for later retrieval

## Fix 2 (P0): Add native fallback "pull" for FCM token on iOS

**File**: `src/hooks/usePushNotifications.tsx`

Currently, if `fcmTokenReady` never fires (race condition), there's only a 15s warning log. Add an active fallback:

- In the iOS 15s fallback timeout (line ~828), instead of just logging, try `PushNotifications.register()` one more time
- Also check `window.fcmToken` and `window.__fcmTokenBuffer` one final time before giving up
- Add a new `window.addEventListener('pageshow', ...)` listener to catch tokens that arrive after page transitions

## Fix 3 (P1): Improve APNs detection — don't hardcode hex-64

**File**: `src/hooks/usePushNotifications.tsx`

Apple says APNs tokens are variable length. The current regex `^[A-Fa-f0-9]{64}$` could miss longer APNs tokens or false-positive on valid FCM tokens.

Change `isApnsHexToken` to be more robust:
```typescript
// APNs tokens are hex-only, typically 64 chars but can vary (32-128 hex chars)
// FCM tokens contain non-hex chars (colons, dashes, underscores)
const isApnsHexToken = (t: string): boolean => {
  if (t.length < 32 || t.length > 200) return false;
  // If token is ALL hex chars, it's likely APNs (FCM tokens always contain non-hex chars like : _ -)
  return /^[A-Fa-f0-9]+$/.test(t) && t.length <= 128;
};
```

## Fix 4 (P0): Store FCM token in UserDefaults + expose via Capacitor bridge

**File**: `scripts/inject_ios_push.py`

In the Swift injection code, when `messaging(didReceiveRegistrationToken:)` fires:
- Store the FCM token in `UserDefaults.standard` under key `"fcm_token"`
- In `injectFCMTokenIntoWebView`, if bridge injection fails after all attempts, store to UserDefaults so it can be retrieved later

**File**: `src/hooks/usePushNotifications.tsx`

In the iOS fallback (15s timeout), add a check that reads from native storage via Capacitor Preferences plugin:
```typescript
// Try reading stored FCM token from native UserDefaults
try {
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key: 'fcm_token' });
  if (value && value.length > 50 && !isApnsHexToken(value)) {
    // Save this token
    await saveTokenDynamic(value);
  }
} catch {}
```

Wait — Capacitor Preferences is not installed. Instead, use the native bridge injection approach: have Swift store in UserDefaults, and in `injectFCMTokenIntoWebView`, keep retrying until it succeeds (the current 8-attempt fix covers this).

## Summary of changes

| File | Change |
|------|--------|
| `scripts/inject_ios_push.py` | Scene-aware rootVC, retry on nil rootVC, store FCM in UserDefaults, increase attempts to 8 |
| `src/hooks/usePushNotifications.tsx` | Better `isApnsHexToken` (variable-length APNs), active fallback at 15s (re-register + re-check buffers), improved logging |

## Documentation note

The bundle ID mismatch (`app.runconnect` in docs vs `com.ferdi.runconnect` in code) is a config issue outside the codebase — will add a note in `IOS_SETUP_INSTRUCTIONS.md` to clarify the correct bundle ID is `com.ferdi.runconnect`.

