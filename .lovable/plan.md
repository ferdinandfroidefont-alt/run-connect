

# Fix iOS Crash: Remove AdMob Native SDK

## Root Cause (Confirmed by Crash Log)

The crash happens on **Thread 7** at `GADApplicationVerifyPublisherInitializedCorrectly`. This is the Google Mobile Ads SDK verifying the publisher App ID at native startup -- before any JavaScript or WebView loads. Since the AdMob IDs in the code are placeholders (`ca-app-pub-XXXXXXXXXXXXXXX~XXXXXXXXXX`), the SDK calls `abort()` and kills the app instantly.

**Why JS guards don't work**: The `@capacitor-community/admob` npm package auto-registers its native iOS plugin during `npx cap sync ios`. The Google SDK runs its verification check at native app launch, completely independent of any JavaScript code.

## Fix

**Remove `@capacitor-community/admob` from `package.json`**. This prevents the AdMob CocoaPod from being included in the iOS build during `npx cap sync ios`. The `useAdMob.tsx` hook already uses dynamic imports with try/catch, so it will gracefully do nothing when the package is absent.

When you have real AdMob IDs in the future, you can re-add the package and configure `GADApplicationIdentifier` in Info.plist.

## Files to Change

| File | Change |
|------|--------|
| `package.json` | Remove `@capacitor-community/admob` from dependencies |
| `src/hooks/useAdMob.tsx` | Add extra safety: return no-op immediately if placeholder IDs detected (belt and suspenders) |
| `src/components/AdMobInitializer.tsx` | Add early return if AdMob package is unavailable |

## After These Changes

You must trigger your GitHub Actions iOS workflow to rebuild. The new build will NOT include the Google Mobile Ads SDK in the binary, eliminating the crash entirely.

