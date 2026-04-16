

## Plan: Refine `light_card` template in ProfileShareArtboard to match mockup

The current `light_card` template (lines 402-497) is already close but needs visual refinements to precisely match the reference image.

### Changes needed (single file: `src/components/profile-share/ProfileShareArtboard.tsx`)

**1. Avatar ring** — Increase `innerSize` from 188 to ~220. The blue ring + white border thickness looks correct already.

**2. Display name + verified badge** — Increase font size from 44px to ~50px. The verified badge should be a blue circle with checkmark (matching the mockup's style), not the current gradient pill.

**3. Username** — Increase from 18px to ~22px, keep gray color.

**4. Role/club pill** — Already close. Ensure the icon is a group/users icon, text is bold blue, secondary line is slightly smaller. Looks good as-is.

**5. Location + sport line** — Already close. Keep MapPin + location, separator, sport icon + label. Increase font slightly if needed to ~17px.

**6. Stats row (critical)** — Keep 4 cards on ONE line (already the case). Refine:
   - Each card: icon on top, big bold number, small label below
   - Ensure min-height and proportions match mockup (~130px height is fine)
   - Icons should be distinct: Calendar for "Séances créées", Users for "Séances rejointes", User for "Abonnés", UserPlus for "Abonnements"

**7. Presence badge** — Already present and close. Keep the pill style with blue border.

**8. Footer CTA banner** — Already implemented as `LightCardFooter`. Refinements:
   - RunConnect icon (white/inverted) on the left with "Rejoins-moi sur" + "RunConnect" text
   - "Ouvrir avec RunConnect" button with arrow icon
   - QR code on the right with a vertical separator
   - Profile URL below QR code
   - The topo pattern in background is a nice touch, keep it

**9. Map background** — Already using `ShareMapBackdropImg` with white gradient overlay. Increase overlay opacity slightly to make it more subtle/light as in the mockup (currently 0.78 top → could go to 0.82-0.85).

### Technical details

- All changes are in **one file**: `src/components/profile-share/ProfileShareArtboard.tsx`
- Only the `light_card` branch (lines 402-497) and its helper components (`LightCardAvatarRing`, `LightCardStatsRow`, `LightCardFooter`, `VerifiedPremiumBadge`) need updates
- No payload/data model changes needed — all fields already exist in `ProfileSharePayload`
- The `useCORS` build error in `profileShareService.ts` also needs fixing (rename to valid option or remove)
- The `sessionShareService.ts` has the same `useCORS` error

### Build error fixes (bonus)

- `src/services/profileShareService.ts` line 72: remove `useCORS: true` (not a valid `html-to-image` option — the correct option is handled differently)
- `src/services/sessionShareService.ts` line 38: same fix

