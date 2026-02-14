

# Fix: Profile Creation Loop - Account Created but App Inaccessible

## Problem Analysis

After creating a profile via `ProfileSetupDialog` in `Auth.tsx`, the user sees "Profil cree !" toast but the app fails to redirect to the main page. The profile setup dialog either stays visible or re-appears, trapping the user in a loop.

**Root cause identified**: Two interacting issues:

1. **Redirect race condition in Auth.tsx**: The `onComplete` callback calls `setShowProfileSetup(false)` (a React state update) immediately followed by `window.location.href = '/'` (a full page reload). React may re-render the component between these two operations, potentially re-triggering dialog state before the navigation completes.

2. **Double ProfileSetupDialog**: After successful redirect to `/`, the `Index.tsx` page also renders a `ProfileSetupDialog` via `useOnboarding`. Even though there's a 30-second localStorage guard, the `useOnboarding` hook queries the database asynchronously. If the query resolves before the localStorage check prevents it (or if the user ID doesn't match between contexts), the dialog re-appears.

3. **Fragile redirect mechanism**: `window.location.href = '/'` in a WebView/Capacitor context can be unreliable. The redirect may silently fail or be delayed, leaving the user on the Auth page.

## Solution

### Step 1: Make Auth.tsx onComplete redirect bulletproof

Replace the current `onComplete` with a robust mechanism:
- Add a small delay before redirect to ensure React state settles
- Use `window.location.replace('/')` instead of `href` to prevent back-button loops
- Add a fallback timer that retries the redirect if the page is still on `/auth`

```tsx
// Auth.tsx - ProfileSetupDialog onComplete
onComplete={() => {
  console.log('Profile created - redirecting to /');
  setShowProfileSetup(false);
  
  // Set flags BEFORE redirect
  localStorage.setItem('profileCreatedSuccessfully', 'true');
  localStorage.setItem('profileCreatedAt', Date.now().toString());
  
  // Small delay to let React state settle, then redirect
  setTimeout(() => {
    window.location.replace('/');
  }, 300);
  
  // Fallback: if still on auth after 2s, force redirect
  setTimeout(() => {
    if (window.location.pathname.includes('auth')) {
      console.log('Fallback redirect triggered');
      window.location.href = '/';
    }
  }, 2000);
}}
```

### Step 2: Strengthen useOnboarding localStorage guard

Currently the guard only works for 30 seconds and checks a timestamp. Make it more robust:
- Extend the guard window to 60 seconds
- Also check the `profileCreatedSuccessfully` flag from Auth.tsx
- Clean up BOTH flags once profile is confirmed complete from DB

### Step 3: Prevent ProfileSetupDialog from re-appearing in Index.tsx after fresh creation

In `Index.tsx`, add a check: if `profileCreatedSuccessfully` localStorage flag exists, skip showing the ProfileSetupDialog entirely and let `useOnboarding` settle.

### Step 4: Fix ProfileSetupDialog.handleSubmit to not call onComplete if already redirecting

Add a guard (`isRedirecting` ref) to prevent double-calling `onComplete` if the submit button is clicked twice or if React re-renders during the transition.

## Technical Details

**Files to modify:**
- `src/pages/Auth.tsx` (lines 856-860): Robust onComplete with delayed redirect and fallback
- `src/hooks/useOnboarding.tsx` (lines 20-30): Extend guard window, check both localStorage flags  
- `src/components/ProfileSetupDialog.tsx` (lines 467-476): Add isRedirecting guard to prevent double-fire
- `src/pages/Index.tsx` (lines 69-78): Skip ProfileSetupDialog rendering when profileCreatedSuccessfully flag exists

