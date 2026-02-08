

# Fix: Profile Setup Loop After Creation

## Problem Identified

A database trigger (`handle_new_user`) auto-creates a minimal profile when a user signs up, containing only username and display_name derived from the email. This causes ProfileSetupDialog to show from Index.tsx (not Auth.tsx), and after submission:

1. The profile UPDATE has **zero error handling** -- if it fails, the code proceeds as if successful
2. The verification step only checks if a profile row exists (`id, user_id`), NOT if the fields were actually saved
3. The redirect uses `window.location.href = '/'` which causes a **full page reload**, destroying the React state that marks the setup as complete
4. After reload, `useOnboarding` re-queries the DB, finds empty fields again, and re-shows the dialog

## Fix Strategy

### Step 1: Add error handling to profile UPDATE/INSERT

In `ProfileSetupDialog.tsx`, capture and check the result of the update/insert operation. If it fails, show an error instead of proceeding.

### Step 2: Verify actual field values after save

Change the verification query from `SELECT id, user_id` to `SELECT id, username, display_name, avatar_url, age, phone, bio` and confirm the fields are populated.

### Step 3: Stop the unnecessary full page reload

When ProfileSetupDialog is rendered from Index.tsx (not Auth.tsx), there is no need for `window.location.href = '/'`. The page is already at `/`. Instead:
- Call `onComplete()` to set `needsProfileSetup = false`
- Close the dialog
- Only use the aggressive redirect strategy when on the Auth page

### Step 4: Add localStorage safety flag

Store a `profileSetupCompleted_{userId}` flag in localStorage after successful save. In `useOnboarding`, check this flag to avoid re-showing the dialog even if there's a brief DB read delay.

### Step 5: Re-check onboarding after completion

Add a `recheckOnboarding()` function to the `useOnboarding` hook so it can be called explicitly after profile setup, instead of relying on page reload.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ProfileSetupDialog.tsx` | Add error handling to UPDATE/INSERT, verify actual fields, use `onComplete()` instead of page reload when not on Auth page |
| `src/hooks/useOnboarding.tsx` | Add `recheckOnboarding` function, check localStorage safety flag, expose it in the return value |
| `src/pages/Index.tsx` | Pass `recheckOnboarding` to ProfileSetupDialog's `onComplete` callback |

## Technical Details

**ProfileSetupDialog.tsx changes (lines 406-475):**
- Capture `{ error }` from `.update()` and `.insert()` calls
- Throw if error exists
- Change verify query to check actual field values
- Detect if currently on Auth page (`window.location.pathname === '/auth'`) -- only do aggressive redirect in that case
- Otherwise, just call `onComplete()` and let React handle the UI update

**useOnboarding.tsx changes:**
- Expose `recheckOnboarding` (which re-runs `checkOnboardingStatus`)
- On mount, check `localStorage.getItem('profileSetupCompleted_' + user.id)` and skip showing the dialog if it's set recently (within 30 seconds)
- In `completeProfileSetup`, also set this localStorage flag

**Index.tsx changes:**
- Wire `recheckOnboarding` from useOnboarding into the ProfileSetupDialog `onComplete` callback

