

# Redesign Loading Screen "R" to Match Reference

## What needs to change

The current SVG `R_PATH` produces a thin, simple cursive R. The reference image shows a much more **fluid, swooping, calligraphic R** with:
- A wide sweeping curve starting from the top, flowing down-left where the GPS pin sits
- A large round bowl curving right and up
- A bold diagonal leg sweeping to the bottom-right
- **Variable stroke width** feel (thick in the middle, thin at tips)
- Deep navy-to-bright-blue gradient with white shine streaks
- The GPS pin integrated at the start point of the curve (left side, mid-height)

## Changes — `src/components/LoadingScreen.tsx`

1. **Redesign `R_PATH`**: New SVG path that mimics the reference's swooping calligraphic shape — starts top-right, sweeps left-down to the pin position, curves into a wide bowl right, then kicks down into a diagonal leg.

2. **Multi-layer stroke for depth**: Instead of one stroke + one glow, use 3 layers:
   - Wide blur layer (soft glow, ~14px, light blue)
   - Medium main stroke (~7px, gradient dark-to-light blue)  
   - Thin bright highlight stroke (~2px, white/light blue, offset) for the "shine" effect

3. **Gradient update**: Use a richer gradient from `#0033AA` (navy) → `#0066FF` (blue) → `#66AAFF` (sky) to match the reference's color depth.

4. **Pin repositioned**: Move the GPS pin to the new path's start point (left side of the curve, roughly mid-height), matching the reference where the pin sits at the inner curl.

5. **SVG viewBox enlarged**: Increase to ~200×220 to accommodate the wider, more expressive shape.

6. **Light sweep preserved**: Keep the existing shine animation but make it slightly more prominent.

All animation phases (pin → trace → glow → loading) stay the same — only the visual shape and rendering change.

