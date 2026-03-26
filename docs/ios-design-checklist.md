# RunConnect iOS Design Checklist

## 1) Spacing and Layout
- Use `px-ios-4` for page-level horizontal gutters.
- Keep cards inset from edges; avoid full-bleed blocks unless intentional.
- Preserve safe-area on fixed top/bottom elements (`env(safe-area-inset-*)`).

## 2) Typography
- Limit visible hierarchy to 3 levels max (title, body, caption).
- Prefer `text-ios-*` classes for consistency.
- Avoid mixing too many arbitrary text sizes in one screen.

## 3) Surfaces
- Use `ios-card` / `ios-inset-group` for grouped content.
- Keep borders subtle (`border-border/60`) and shadows lightweight (`--shadow-card`).
- Avoid heavy glassmorphism unless explicitly justified.

## 4) Controls
- Minimum touch target: 44x44.
- Secondary controls should default to neutral style (white/black) when possible.
- Keep primary action color reserved for important actions.

## 5) Motion
- Use iOS easing: `cubic-bezier(0.32, 0.72, 0, 1)`.
- Keep fast interactions around `--ios-motion-duration-fast`.
- Reuse `ios-interactive` utility for tap feedback consistency.

## 6) Lists and Grouped Rows
- Prefer `ios-list-row` / `ios-list-stack` for settings/profile rows.
- Align separators with content (`ios-list-row-inset-sep`).
- Keep row icon sizing consistent (`ios-list-row-icon`).

## 7) Chips and Filters
- Use compact chips (`ios-chip`) for horizontal filter carousels.
- Active state must be explicit (`ios-chip-active`).
- Only one expandable filter panel open at once.

## 8) Overlays and Modals
- No persistent blur/overlay after close.
- Reset modal state and interaction locks on close.
- Ensure z-index stacking is deterministic.

## 9) Navigation
- Bottom navigation must remain stable (no layout jumps).
- Keep icon sizes, labels, and active states consistent across sets.
- Avoid adding accidental extra nav levels.

## 10) QA Gates
- Test on iOS/WebView and Android for touch, scroll, and safe-area behavior.
- Verify dark mode contrast and readability.
- Run lint/build after each visual batch.

