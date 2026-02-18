

# Fix iOS Safe Area and Layout Overlaps

## Problem

The app layout overlaps on iOS devices with notch/home indicator because:
1. The viewport meta tag is missing `viewport-fit=cover` (required for iOS safe area insets to work)
2. `100vh` / `h-screen` is used, which on iOS includes the area behind the notch and home indicator
3. The bottom navigation bar has no safe-area bottom padding
4. The map header has no safe-area top padding
5. Floating buttons on the map overlap with the bottom nav

## Changes

### File 1: `index.html`
- Add `viewport-fit=cover` to the viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
- This is **required** for `env(safe-area-inset-*)` CSS values to return non-zero values on iOS

### File 2: `src/index.css`
- Add a CSS custom property `--app-vh` using `100dvh` with `100vh` fallback for iOS
- Add a utility class `.h-screen-safe` that uses `100dvh` with fallback
- Update the mobile `html, body` rule to use `100dvh` instead of `100%`

### File 3: `src/components/Layout.tsx`
- Replace `h-screen` with dynamic viewport height using `100dvh` style
- Add `pt-safe` class to the root container for top safe area (notch)
- Update bottom padding from hardcoded `pb-[72px]` to `pb-[calc(72px+env(safe-area-inset-bottom,0px))]`

### File 4: `src/components/BottomNavigation.tsx`
- Add `pb-safe` (safe-area-inset-bottom) to the nav element instead of the fixed `pb-2`
- This pushes the tab bar content above the home indicator on iPhone X+

### File 5: `src/components/InteractiveMap.tsx`
- Replace `h-[calc(100vh-72px)]` with a style that accounts for safe areas: `calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))`
- Add `pt-safe` or `padding-top: env(safe-area-inset-top)` to the map header so it sits below the notch
- Adjust the bottom floating buttons (`bottom-4`) to account for the bottom safe area

### File 6: `src/components/SearchHeader.tsx`
- Add `pt-safe` to the sticky header so the search bar doesn't overlap with the notch area

## Technical Details

### Why `100dvh` instead of `100vh`
On iOS Safari and iOS WebView (Capacitor), `100vh` equals the **largest** possible viewport height (ignoring the URL bar and home indicator). `100dvh` (dynamic viewport height) equals the **current** visible viewport, which is what we actually want. It has excellent browser support (iOS 15.4+, all modern browsers).

### CSS fallback strategy
```css
height: 100vh; /* fallback */
height: 100dvh; /* modern browsers */
```

### Safe area pattern
```css
padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
```
The `env()` function returns `0px` on devices without a home indicator, so nothing changes on Android or older iPhones.

## Files Summary

| File | Change |
|------|--------|
| `index.html` | Add `viewport-fit=cover` to viewport meta |
| `src/index.css` | Add `100dvh` utility, update mobile rules |
| `src/components/Layout.tsx` | Use `dvh` + safe area padding |
| `src/components/BottomNavigation.tsx` | Add bottom safe area padding |
| `src/components/InteractiveMap.tsx` | Fix map height + header/button safe areas |
| `src/components/SearchHeader.tsx` | Add top safe area padding |

