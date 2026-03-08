

# Enhanced Training Mode -- Komoot-inspired activity screen

## What changes

### 1. Hook enhancement: `src/hooks/useTrainingMode.ts`

Add tracking for activity stats that the UI needs:

- **`distanceTraveled`**: accumulated haversine distance between successive GPS positions (already have `prevPositionRef`)
- **`elevationGain`**: track via altitude from GPS (`coords.altitude`) -- accumulate only positive deltas
- **`averageSpeed`**: `distanceTraveled / elapsedTime` computed in the timer interval
- **`activityType`**: load from session's `activity_type` field (default `'running'`) to know whether to show speed vs just distance
- **`traveledPath`**: array of `Coord` positions recorded during activity -- for drawing the "traveled" polyline on the map

Changes in `TrainingState`:
```ts
distanceTraveled: number;    // meters
elevationGain: number;       // meters
averageSpeed: number;        // km/h
activityType: string;        // 'running' | 'cycling' | 'trail' | ...
traveledPath: Coord[];       // GPS breadcrumb
```

In `handlePosition`: accumulate distance from prev position, track altitude delta, push to traveledPath.
In timer interval: compute `averageSpeed = (distanceTraveled / 1000) / (elapsedTime / 3600)`.
In data loading: fetch `activity_type` from sessions table when loading by sessionId.

### 2. UI overhaul: `src/pages/TrainingMode.tsx`

Complete visual redesign of the overlay UI while keeping the exact same map init, marker, and GPS logic.

**Direction banner (top)** -- enhanced:
- Larger turn icon area with colored background circle
- Distance to next turn in big bold text (28px)
- Turn instruction text below
- Street name placeholder row (shows route name as fallback)
- When no route: "Suivi de seance / GPS actif"
- When paused: clean pause state with pulsing icon

**Stats panel (new)** -- glassmorphism card above controls:
- 2x2 grid for cycling: Distance | Time | Speed | Elevation
- 2-column for running: Distance | Time | Elevation (no pace per requirement)
- Large readable numbers (28-32px), small labels (12px)
- Semi-transparent backdrop-blur background
- Rounded corners, subtle shadow

**Controls (bottom)** -- redesigned:
- Three buttons: Stop (red, left) | Pause/Resume (large center, 72px) | Re-center (right)
- Stop button: red circle with square icon
- Pause: large glassmorphism circle, prominent
- Re-center: small utility button to re-center map on user
- Safe area bottom padding preserved

**Traveled path polyline** (new):
- Draw a green/teal dashed polyline for the path the user has already covered
- Update on each GPS position
- Distinct from the blue route polyline

**Participant nearby overlay** (bonus):
- If `sessionId` is provided, query `live_tracking_points` for other participants
- Show small floating chips at bottom-left: "Pierre -- 120 m" with avatar
- Maximum 3 shown, sorted by distance
- Only if session has live tracking active

**Off-route banner** -- improved:
- Wider, more visible with subtle animation
- Icon + text + distance off route

### 3. Visual design tokens

- Stats panel bg: `rgba(255,255,255,0.85)` with `backdrop-blur-xl` (light) or `rgba(0,0,0,0.7)` (could be forced light since outdoor)
- Font sizes: turn distance 28px bold, stats numbers 28px semibold, labels 12px medium uppercase
- Control buttons: stop 52px red, pause 72px dark glassmorphism, recenter 44px
- Border radius: 20px for stats panel, full for buttons
- Shadows: `0 4px 20px rgba(0,0,0,0.12)`

### 4. Files to modify

1. **`src/hooks/useTrainingMode.ts`** -- add `distanceTraveled`, `elevationGain`, `averageSpeed`, `activityType`, `traveledPath` to state + computation logic
2. **`src/pages/TrainingMode.tsx`** -- full UI redesign of overlays (banner, stats, controls, traveled path polyline, nearby participants)

### 5. What stays unchanged

- Google Maps initialization, API key fetch, map styles
- Directional marker (blue dot with heading arrow)
- GPS watch start/stop/pause logic
- Route loading from Supabase
- Turn detection algorithm
- Off-route detection logic
- Wake lock, compass, vibration
- All navigation/routing (`/training/:sessionId`, `/training/route/:routeId`)

