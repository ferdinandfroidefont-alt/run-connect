

## Problem

Clicking a profile in search results calls `useProfileNavigation` which tries to open a `ProfilePreviewDialog` as an inline dialog. This dialog conflicts with the Search page's full-screen overlay (z-index 60), causing it to appear behind or be dismissed immediately.

## Solution

Replace the dialog-based approach with direct navigation to `/profile/:userId`. The Profile page already handles other users correctly -- it renders `ProfilePreviewDialog` with `onClose={() => navigate(-1)}` (line 636-644 of Profile.tsx). This means the user will:

1. Click a profile in search results
2. Navigate to `/profile/:userId`
3. See the ProfilePreviewDialog (with follow button, stats, etc.)
4. Press "back" to return to search

## Changes

### `src/components/search/ProfilesTab.tsx`
- Remove `useProfileNavigation` hook import and usage
- Remove `ProfilePreviewDialog` component and its rendering
- Replace `handleProfileClick` with `navigate(`/profile/${userId}`)` using react-router
- Keep all other functionality (search, loading states, etc.)

This is a minimal, clean fix -- 3 lines removed, 1 line changed.

