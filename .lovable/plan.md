

# Fix the Loading Screen "R" — Match the App Icon

## Problem
The current `R_PATH` produces an unrecognizable shape — too many overlapping curves that don't read as an "R". The reference is the RunConnect app icon visible on the auth page: a clean, modern, athletic "R" with a vertical stem, a rounded bowl at top-right, and a dynamic swooping leg.

## Approach
Replace the complex path with a **proper stylized R** that matches the app icon:

```text
  ┌──────╮
  │      │   ← rounded bowl
  │  ╭───╯
  │ ╱        ← junction
  │╱   ╲
  │     ╲    ← swooping athletic leg
  │      ╲
```

### Changes to `src/components/LoadingScreen.tsx`

1. **New `R_PATH`**: Two connected sub-paths forming a recognizable R:
   - **Vertical stem**: straight left side from top to bottom
   - **Bowl**: curves right from the top of the stem, rounds back to mid-height
   - **Leg**: from the bowl junction, swoops diagonally down-right with athletic flair (like the app icon's tail)

2. **GPS Pin repositioned**: Move to the top of the vertical stem (starting point of the trace animation) — this makes the "route starts here" metaphor work.

3. **Adjusted viewBox**: Keep 200×225 but center the new shape properly.

4. **Keep all animation layers** (glow, gradient, highlight, moving dot, light sweep) — only the path shape and pin position change.

5. **Path length recalculated** to match the new geometry for correct dash animation.

