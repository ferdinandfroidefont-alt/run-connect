
# Fix iOS Crash on Launch -- RunConnect

## Root Causes Identified

### 1. Automatic permission checking at startup (CRITICAL)
In `main.tsx` (lines 130-137), `Geolocation.checkPermissions()` and `Camera.checkPermissions()` are called just 1 second after app launch via `setTimeout`. On iOS, calling these before the WebView/Capacitor bridge is fully initialized causes an immediate crash.

### 2. `requestPermissions: true` in Capacitor config (CRITICAL)
`capacitor.config.ts` has `Geolocation: { requestPermissions: true }` and `Camera: { requestPermissions: true }` in the plugins section. On iOS, this can trigger the native permission dialog automatically when the plugin loads, before the app UI is ready -- which Apple rejects and may crash.

### 3. Missing Info.plist usage descriptions (HIGH)
The CI workflow is missing two required keys:
- `NSMicrophoneUsageDescription` (needed if any audio API is accessed)
- `NSUserTrackingUsageDescription` (needed if AdMob/tracking is ever enabled)

If iOS encounters a permission request without the corresponding usage description, it crashes instantly.

### 4. `require()` call in useAdMob (MEDIUM)
`useAdMob.tsx` line 45 uses `require('@capacitor/core')` which is a CommonJS call inside a Vite ESM build. This can throw a runtime error on iOS where the module system is stricter.

## Fixes

### File 1: `src/main.tsx`
- Remove the early `Geolocation.checkPermissions()` and `Camera.checkPermissions()` calls from `initializeCapacitorPlugins`
- Only preload the plugin modules (dynamic import) without calling any permission APIs
- Permissions should only be checked/requested when the user triggers a feature (camera button, map, etc.)

### File 2: `capacitor.config.ts`
- Remove `requestPermissions: true` from both Geolocation and Camera plugin configs
- These flags tell Capacitor to auto-request permissions on plugin load, which crashes iOS if the WebView isn't ready or if Info.plist keys are missing

### File 3: `src/hooks/useAdMob.tsx`
- Replace `require('@capacitor/core')` with a proper check using the already-available `window.Capacitor` or a dynamic import
- This avoids a potential runtime error in Vite's ESM bundle on iOS

### File 4: `.github/workflows/ios-appstore.yml`
- Add `NSMicrophoneUsageDescription` to Info.plist configuration step
- Add `NSUserTrackingUsageDescription` to Info.plist configuration step
- These prevent crashes if any code path triggers these permission dialogs

## Summary

| File | Change |
|------|--------|
| `src/main.tsx` | Remove early permission checks, keep only plugin preload |
| `capacitor.config.ts` | Remove `requestPermissions: true` from Geolocation and Camera |
| `src/hooks/useAdMob.tsx` | Replace `require()` with proper ESM-compatible check |
| `.github/workflows/ios-appstore.yml` | Add missing NSMicrophoneUsageDescription and NSUserTrackingUsageDescription |

After these changes, you will need to rebuild and re-upload to TestFlight using your GitHub Actions workflow.
