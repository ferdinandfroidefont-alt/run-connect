

## Plan: Rewrite `light_card` template to precisely match mockup

The current implementation uses Tailwind classes which may not render correctly in the html-to-image capture context, and the proportions/colors don't match the reference. I'll rewrite the `light_card` section using **pure inline styles** (like `SessionShareArtboard` already does) for reliable rendering.

### Key visual differences to fix

1. **Map background overlay** — too opaque, map barely visible. Mockup shows map clearly through a light white veil
2. **Stats icons** — currently blue (`RC_LIGHT`), mockup shows **dark navy/slate** icons
3. **Stats numbers** — should be very dark navy, bold, large
4. **Avatar ring** — blue ring should be thicker/more visible as in mockup
5. **Footer CTA** — the "Ouvrir avec RunConnect" button should have an arrow circle icon (like in SessionShareArtboard), not a chevron
6. **Overall Tailwind→inline** — convert all Tailwind classes to inline styles for reliable image export

### Changes (single file)

**`src/components/profile-share/ProfileShareArtboard.tsx`** — lines 405-499 (the `light_card` return block):

- Rewrite entire `light_card` block using **inline styles only** (matching the pattern in `SessionShareArtboard.tsx`)
- **Map overlay**: reduce opacity to `rgba(255,255,255,0.72)` top → `rgba(255,255,255,0.15)` bottom so map is visible
- **Stats row**: change icon color from `RC_LIGHT` to `#0f172a` (dark navy like mockup), keep numbers as `#0f172a`
- **Avatar ring**: increase blue ring thickness from 4px to 6px, white inner border from 11px to 8px
- **Footer**: use arrow-circle icon like SessionShareArtboard's CtaBar, not ChevronRight
- **Presence badge**: use dark navy icon color matching mockup
- **All elements**: convert from Tailwind classes to inline `style={}` for consistent html-to-image rendering

### Also update helper components to use inline styles

- `LightCardAvatarRing` — convert from Tailwind to inline styles
- `LightCardStatsRow` — convert from Tailwind to inline styles, fix icon colors
- `LightCardFooter` — convert from Tailwind to inline styles, fix button icon

No other files need changes.

