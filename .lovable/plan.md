

## Root Cause

The current AppDelegate injection posts an FCM token **String** to `NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: fcmToken)`.

**This is the bug.** Capacitor's `PushNotificationsHandler` expects a **`Data`** object (the raw APNs device token) on that notification. When it receives a String instead:
- Capacitor tries to cast `notification.object` as `Data` → fails
- The `registration` JS event never fires, OR fires with garbage
- Front-end never gets a token → `push_token = null`

## Correct Architecture

```text
┌─────────────────────────────────────────────────────────┐
│ iOS Native (AppDelegate.swift)                          │
│                                                         │
│  didRegisterForRemoteNotificationsWithDeviceToken       │
│    ├─ Post raw deviceToken (Data) to Capacitor          │
│    │   → .capacitorDidRegisterForRemoteNotifications    │
│    │   (Capacitor converts to hex → registration event) │
│    │                                                    │
│    ├─ Give deviceToken to Firebase:                     │
│    │   Messaging.messaging().apnsToken = deviceToken    │
│    │                                                    │
│    └─ Fetch FCM token, inject into WebView via JS:      │
│        evaluateJavaScript("window.dispatchEvent(        │
│          new CustomEvent('fcmTokenReady', ...))")        │
│                                                         │
│  messaging(_:didReceiveRegistrationToken:)               │
│    └─ Same: inject FCM token into WebView via JS        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Front-end (usePushNotifications.tsx)                     │
│                                                         │
│  registration listener → receives hex APNs token        │
│    └─ Detects hex-64 → IGNORES (waits for FCM)          │
│                                                         │
│  fcmTokenReady listener → receives real FCM token       │
│    └─ Saves to DB via savePushToken()                   │
│       ✅ Token > 100 chars, valid FCM format            │
└─────────────────────────────────────────────────────────┘
```

The front-end **already has** a `fcmTokenReady` event listener (useEffect #5, line 621). It just never fires because AppDelegate never injects JS into the WebView.

## Changes

### 1. `.github/workflows/ios-appstore.yml` — Fix AppDelegate injection

Both Python blocks must be rewritten. The new AppDelegate methods:

- **`didRegisterForRemoteNotificationsWithDeviceToken`**: 
  - Posts raw `deviceToken` (Data) to `.capacitorDidRegisterForRemoteNotifications` (standard Capacitor flow)
  - Sets `Messaging.messaging().apnsToken = deviceToken`
  - Calls `Messaging.messaging().token(completion:)` → on success, injects FCM token into WebView via `evaluateJavaScript`
  
- **`didFailToRegisterForRemoteNotificationsWithError`**: Posts error to Capacitor (unchanged)

- **`messaging(_:didReceiveRegistrationToken:)`**: Injects refreshed FCM token into WebView via `evaluateJavaScript`

JS injection helper method:
```swift
private func injectFCMToken(_ token: String) {
    DispatchQueue.main.async {
        if let vc = UIApplication.shared.windows.first?.rootViewController,
           let bridge = vc as? CAPBridgeViewController {
            let js = "window.fcmToken='\(token)';window.dispatchEvent(new CustomEvent('fcmTokenReady',{detail:{token:'\(token)',platform:'ios'}}))"
            bridge.webView?.evaluateJavaScript(js)
        }
    }
}
```

### 2. `src/hooks/usePushNotifications.tsx` — Minor refinements

- In `registration` listener (line 239): when receiving a hex-64 APNs token on iOS, log it clearly and DO NOT save — just wait for `fcmTokenReady`. Currently it tries to save and fails silently; make the log explicit.
- The existing `fcmTokenReady` listener (useEffect #5) already handles the real FCM token correctly — no change needed there.
- Add a fallback: if `fcmTokenReady` doesn't fire within 10s after registration, re-call `PushNotifications.register()`.

### 3. Edge functions — No changes needed

`save-push-token` and `send-push-notification` already have the correct guards.

## Flow Summary

1. App launches → `PushNotifications.register()` → iOS calls `didRegisterForRemoteNotificationsWithDeviceToken`
2. AppDelegate posts raw Data to Capacitor (standard) AND gives token to Firebase
3. Capacitor fires `registration` with hex-64 APNs token → front-end detects hex-64, ignores
4. Firebase exchanges APNs token for FCM token → AppDelegate injects via `evaluateJavaScript`
5. Front-end receives `fcmTokenReady` event → saves FCM token to DB
6. "Tester les notifications" shows valid token, push works

## Test Points (iPhone TestFlight)

1. Open app, grant notification permission
2. Check Safari Web Inspector console for `[PUSH] fcmTokenReady received`
3. Check Supabase `profiles.push_token` — should be a long FCM token (100+ chars), NOT hex-64
4. Put app in background, tap "Tester les notifications" → real push banner appears
5. Kill app, test via Supabase dashboard → push arrives in Notification Center

