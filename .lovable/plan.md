

## Plan: Fix iOS Push Notification Token Flow

### Root Cause Analysis

After reading the code, there are 3 concrete bugs preventing the FCM token from reaching the database:

1. **Front-end rejects APNs tokens** (`isRawApnsToken` filter in `usePushNotifications.tsx` lines 116-118, 206-210, 338-342). On iOS, Capacitor's `registration` event fires with the APNs hex token. The code rejects it and waits for `fcmTokenReady` — but if the native bridge fails to inject, no token is ever saved.

2. **`FirebaseAppDelegateProxyEnabled = true`** (workflow line 92-94). With a custom AppDelegate that manually handles `didRegisterForRemoteNotificationsWithDeviceToken` and `MessagingDelegate`, enabling the proxy causes Firebase to intercept callbacks, creating a conflict. Must be `false`.

3. **Token length filter too aggressive**. Multiple places check `token.length > 50` (lines 477, 588, 634, 709, 732). APNs hex tokens are exactly 64 chars — they pass this check but get caught by `isRawApnsToken`. If we remove the APNs filter, these tokens flow through correctly to `save-push-token` which has the proper backend guard.

### Changes

#### 1. `src/hooks/usePushNotifications.tsx`
- **Remove** `isRawApnsToken` function (line 116-118)
- **Remove** APNs hex check in `savePushToken` (lines 206-210)
- **Remove** APNs hex check in `registration` listener (lines 338-342)
- **Simplify** `registration` listener: accept ANY token, save immediately
- Keep `fcmTokenReady` listener as secondary path (native bridge)
- Keep all debug state and logging
- Remove `isRawApnsToken` from `useCallback` deps

#### 2. `.github/workflows/ios-appstore.yml`
- Line 92-94: Change `FirebaseAppDelegateProxyEnabled` from `true` to `false`

#### 3. `scripts/inject_ios_push.py` — No changes needed
The Swift injection code is correct: it posts raw `deviceToken` to Capacitor, assigns to Firebase, fetches FCM token, and bridges to WebView. No modifications required.

#### 4. `scripts/configure_ios_push.sh` — No changes needed
Already forces re-injection and has assertions.

#### 5. `supabase/functions/save-push-token/index.ts` — No changes needed
Backend correctly rejects APNs hex-64 tokens with a 422 response. This is the right place for this guard.

### Flow After Fix

```text
iOS App Launch
  → PushNotifications.register()
  → iOS calls didRegisterForRemoteNotifications
  → AppDelegate posts raw Data to Capacitor
  → Capacitor fires "registration" with hex APNs token (64 chars)
  → Front saves immediately via savePushToken()
    → Supabase client UPDATE (succeeds with APNs token)
    → OR edge function (rejects hex-64 with 422, front retries later)
  
  Meanwhile:
  → AppDelegate gives token to Firebase
  → Firebase exchanges for FCM token
  → AppDelegate injects via evaluateJavaScript → fcmTokenReady
  → Front receives fcmTokenReady with real FCM token
  → Front saves FCM token (overwrites APNs token in DB)
  → save-push-token accepts FCM token (200 OK)
```

The key insight: by removing the front-end APNs filter, we ensure *something* always gets saved. The FCM token arrives shortly after via the native bridge and overwrites it. Even if the bridge fails, at minimum the Supabase client save will store the APNs token (which won't work for FCM push but proves the save path works — making debugging trivial).

### Files Modified
- `src/hooks/usePushNotifications.tsx` — Remove isRawApnsToken and all hex-64 guards
- `.github/workflows/ios-appstore.yml` — Set FirebaseAppDelegateProxyEnabled to false

### Test Protocol (TestFlight)
1. Build and deploy to TestFlight with these changes
2. Install fresh on iPhone, grant notifications
3. Go to Settings > Notifications
4. Check debug section: permission should be `granted`, token should be non-null
5. Check Supabase `profiles.push_token` — should contain a token
6. If token is hex-64 (APNs), the native bridge isn't working — check Xcode logs for `[PUSH][IOS]`
7. If token is long FCM format, tap "Tester les notifications" — push should arrive

