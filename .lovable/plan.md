

## Plan: Fix scroll on Leaderboard page

### Problem
The page uses `fixed inset-0 flex flex-col` with a `shrink-0` fixed section (header + user card + filters + search). On most screen sizes, this fixed section consumes too much vertical space, leaving the leaderboard block with little or no visible height. The outer container doesn't scroll, so the user is stuck.

### Solution
Change the layout from a split fixed/scrollable approach to a **single scrollable page**. The entire page content scrolls naturally. The leaderboard list gets a `min-height` to ensure it's always usable.

### Changes — `src/pages/Leaderboard.tsx`

1. **Outer container**: Replace `fixed inset-0 flex flex-col` with `fixed inset-0 flex flex-col` but wrap everything below the header in a single `overflow-y-auto` scrollable div.

2. **Structure**:
   - Header stays `shrink-0` (truly fixed at top)
   - Everything else (user card, filters, season reward, search, leaderboard block) goes inside one scrollable `div` with `flex-1 overflow-y-auto`
   - The leaderboard block loses its internal scroll — it renders all items naturally inside the scrollable parent
   - The `scrollContainerRef` moves to the outer scrollable wrapper
   - The sentinel for infinite scroll stays at the bottom of the list

3. **Leaderboard block styling**: Keep the rounded card appearance (`rounded-xl bg-card border`) but remove `overflow-hidden flex flex-col` and `h-full`. It becomes a normal block inside the scroll flow.

This gives the user a natural top-to-bottom scroll through the entire page content.

