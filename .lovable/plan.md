

## Problem

`WeeklyTrackingView` builds its athlete list **only from `coaching_participations`** for the current week. If an athlete has no session assigned this week, they simply don't exist in the list — so the search bar can never find them, regardless of normalization logic.

The user confirmed they want **all club members** visible, even those with 0 sessions.

## Solution

Refactor `loadTracking()` in `WeeklyTrackingView.tsx` to:

1. **First load all club members** from `group_members` + `profiles` (same pattern as `WeeklyPlanDialog.loadMembers`)
2. **Then load sessions & participations** for the week as before
3. **Merge**: every club member gets an `AthleteData` entry. Those with participations get their session data populated; those without show 0/0 (0%).
4. Exclude the current coach (logged-in user) from the list.

### File: `src/components/coaching/WeeklyTrackingView.tsx`

**Changes:**
- Import `useAuth` to get the current user (coach) and exclude them
- In `loadTracking()`:
  - Query `group_members` for the club → get all `user_id`s
  - Query `profiles` for those user IDs → get `display_name`, `username`, `avatar_url`
  - Build `athleteMap` from **all members** first (with empty days)
  - Then overlay participation data on top (existing logic)
  - Filter out the coach's own user ID
- Sort: athletes with sessions first (by completion), then those without (alphabetically)

```typescript
// Pseudocode for new loadTracking:
const { data: clubMembers } = await supabase
  .from("group_members")
  .select("user_id")
  .eq("conversation_id", clubId);

const allUserIds = clubMembers.map(m => m.user_id).filter(id => id !== user?.id);

const { data: profiles } = await supabase
  .from("profiles")
  .select("user_id, display_name, username, avatar_url")
  .in("user_id", allUserIds);

// Initialize athleteMap with ALL members (0 sessions)
// Then overlay participation data as before
```

No database changes needed. No other files affected.

