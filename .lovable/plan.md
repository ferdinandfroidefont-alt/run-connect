

# Enhanced 3D Flyover — Strava-style immersive route visualization

## What changes

### File: `src/components/ElevationProfile3D.tsx` — full enhancement

**1. New state: slope computation**
- Pre-compute cumulative distances per point and slope between consecutive segments
- In animation loop, compute `currentSlope` from elevation delta / horizontal distance between adjacent points (as %)
- New state: `currentSlope: number` displayed in HUD

**2. Enhanced HUD — top horizontal bar**
Replace the current top-left card with a full-width horizontal stats bar:
```
┌──────────────────────────────────────────┐
│  3.42 km        4.2%        170 m        │
│  DISTANCE       PENTE       ALTITUDE     │
└──────────────────────────────────────────┘
```
- Glassmorphism bar: `bg-black/50 backdrop-blur-xl`, full width, safe-area-top padding
- 3 stats in a row, each with large number (24px bold) + small label (10px uppercase)
- No pace displayed (per requirement)
- Remove the separate top-left card and top-right gain/loss chips (move gain/loss into the elevation mini-profile area)

**3. Improved polyline rendering**
- **Remaining path**: light blue/white semi-transparent (`#5B7CFF` at 30% opacity, weight 6)
- **Traveled path**: vivid gradient from green to primary blue (`#22c55e` → `#5B7CFF`), weight 5, full opacity
- **Glow on traveled**: outer glow polyline weight 12 at 20% opacity for the traveled portion
- Remove the static shadow/glow polylines that currently cover the full route

**4. Enhanced marker**
- Replace the simple circle marker with a custom SVG marker: white-bordered blue arrow/chevron pointing in the direction of travel
- Rotate the marker icon based on current heading for a drone-like feel

**5. Smoother camera**
- Increase look-ahead from 8 points to 15 points for smoother heading anticipation
- Smooth tilt: vary tilt between 55° (uphill) and 70° (downhill) based on current slope — creates a more dynamic drone feel
- Smooth zoom: vary between 17 (flat) and 16.5 (steep turns) based on heading change rate
- Increase heading interpolation factor from 0.08 to 0.06 for even smoother turns

**6. Elevation mini-profile with cursor sync**
Enhance the bottom elevation bars:
- Increase height from 10 to 16 (h-16)
- Add a vertical cursor line at the current progress position (white, 2px)
- Add a small dot at the cursor position showing current elevation
- The bar coloring already tracks progress — keep that
- Add subtle gain/loss totals as small text next to the profile: `↑234m ↓89m`

**7. Controls redesign**
Keep the same 3 buttons but improve:
- Add `x3` to the speed cycle (1 → 2 → 3 → 1) instead of (1 → 2 → 4)
- Make play/pause button 60px (slightly smaller than 14/56px currently, for more map visibility)
- Add a subtle label under the speed button showing current speed text

**8. Countdown overlay**
- Keep the existing countdown but add a "3, 2, 1" count with framer-motion number transitions

### File: `src/components/ElevationProfile3DDialog.tsx` — minor tweaks

- Move the route name badge to inside the new HUD bar (as a 4th element or subtitle)
- Keep back button as-is

## Technical details

**Slope computation** (pre-computed array):
```ts
const slopes = useMemo(() => {
  const result: number[] = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const dElev = elevations[i] - elevations[i - 1];
    const dHoriz = haversine(coordinates[i-1], coordinates[i]);
    result.push(dHoriz > 0 ? (dElev / dHoriz) * 100 : 0);
  }
  return result;
}, [coordinates, elevations]);
```

**Dynamic tilt** in animation loop:
```ts
const slope = slopes[idx] || 0;
const dynamicTilt = 65 + Math.max(-10, Math.min(5, slope * 0.5));
```

**Rotated marker icon**: Use `google.maps.SymbolPath.FORWARD_CLOSED_ARROW` with `rotation: headingSmooth` to point in direction of travel.

## What stays unchanged
- Google Maps initialization, API key fetching
- All props interface (coordinates, elevations, routeStats, etc.)
- The Dialog wrapper and elevation fetching logic
- Start/end markers
- Core animation loop structure (requestAnimationFrame)

## Files modified
1. `src/components/ElevationProfile3D.tsx` — enhanced HUD, slope, camera, polylines, marker, controls
2. `src/components/ElevationProfile3DDialog.tsx` — minor: adjust top bar to not overlap new HUD

