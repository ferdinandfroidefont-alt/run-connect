
The user confirmed integration of the new generated card (`profile-share-card-v2.png`) as a second selectable template in the profile share carousel.

## Plan

**1. Extend template list (`src/lib/profileSharePayload.ts`)**
- Add `'generated_card'` to `ProfileShareTemplateId` union
- `templateDimensions('generated_card')` → `{ w: 1080, h: 1080 }`

**2. Render new template (`src/components/profile-share/ProfileShareArtboard.tsx`)**
- Import `profileShareCardV2` from `@/assets/profile-share-card-v2.png`
- Add a branch for `templateId === 'generated_card'`: render the PNG as full background (1080×1080), then overlay dynamic data (avatar, name, username, role line, location, sport, 4 stats, presence rate, QR code) at absolute positions matching the image's placeholders — same approach as `ProfileSharePanel.tsx` already uses for its static image.

**3. Add to carousel (`src/components/profile-share/ProfileSharePreviewCarousel.tsx`)**
- Append `{ id: 'generated_card', label: 'Carte générée' }` to `META`
- No other changes needed — existing scaling/preview logic handles new template automatically.

## Result
User can swipe in the profile share carousel between: Carte claire · Organisateur · Story minimal · **Carte générée** (new). Selecting it and exporting produces a 1080×1080 PNG using the v2 image as background with live profile data overlaid.

No changes to share/export services needed (they're template-agnostic).
