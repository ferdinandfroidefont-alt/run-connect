

## Problem

Edge function logs show every `get-key` request as `platform=web, native=false` — including from iOS. The browser-restricted API key is returned, which fails in WKWebView (no HTTP referrer).

**Root cause**: `isReallyNative()` in `nativeDetection.ts` only checks Capacitor flags and `AndroidBridge`. iOS WKWebView loading the hosted web URL has none of these, so it's detected as "web".

## Fix

### 1. Enhance `nativeDetection.ts` — add iOS WebView detection via User-Agent

Add UA-based fallback detection for iOS (standalone WKWebView without Capacitor):
- Check `navigator.userAgent` for `iPhone`/`iPad` combined with non-Safari indicators (e.g., no `Safari/` token, or presence of `Mobile/` without `CriOS`/`FxiOS` — typical of in-app WebViews)
- Also check `window.navigator.standalone` (iOS home screen apps)

Update `getPlatform()` to return `'ios'` or `'android'` based on UA when Capacitor detection fails.

### 2. Files modified

| File | Change |
|---|---|
| `src/lib/nativeDetection.ts` | Add UA-based iOS WebView detection in `isReallyNative()` and `getPlatform()` |

No other files need changes — `getKeyBody()` already calls these functions, and all 8 map components already use `getKeyBody()`.

### 3. Detection logic

```text
isReallyNative():
  1. window.CapacitorForceNative → true
  2. Capacitor.isNativePlatform() → true
  3. window.AndroidBridge → true
  4. window.fcmToken → true
  5. NEW: iOS standalone mode (navigator.standalone) → true
  6. NEW: UA = iPhone/iPad + NOT regular Safari browser → true
     (WKWebView apps don't include "Safari/" in UA)
  7. NEW: UA = Android + "wv" flag → true (Android WebView)

getPlatform():
  1. Capacitor.getPlatform() if native
  2. NEW: UA fallback → 'ios' if iPhone/iPad, 'android' if Android+wv
  3. Default: 'web'
```

This is a single-file change that will make the proxy return the unrestricted server key for native apps.

