
Make the structure badge (e.g. "6×400") larger and more prominent in the session share artboard.

Currently in `SessionShareArtboard.tsx`, the structure badge built from `buildStructureBadge` is rendered as a small chip near the activity header. I'll bump its font size and padding to make it stand out as a key visual element.

## Changes

**`src/components/session-share/SessionShareArtboard.tsx`**
- Locate the structure badge rendering (small pill showing things like "6×400", "10 km").
- Increase font size from current ~14-16px to ~28-32px.
- Increase padding (e.g. `padding: '8px 16px'`), `borderRadius`, and `fontWeight: 800`.
- Ensure it sits on its own line (or with proper spacing) so it doesn't crowd the title.
- Apply consistently across `light_pin`, `light_route`, `dark_premium` templates; scale slightly down for `minimal` / `instagram_story` if needed.

No other files affected.
