

## Plan: Refactoring the "Déjà inscrit" Sign-In Page

### Current State
- The **landing** page has 3 buttons: Google, Apple, Email → this is the signup flow
- Clicking "Déjà inscrit ? Se connecter" goes to `email-signin` which shows email/password form + OTP — no Google/Apple options
- The user wants the sign-in page to mirror the landing page structure: 3 options (Google, Apple, Email) but with "Vous n'avez pas de compte ?" at the bottom instead

### Changes to `src/pages/Auth.tsx`

**Refactor `renderEmailSignin()`** to become a sign-in landing page:

1. **Replace the current email-signin view** with a layout similar to `renderLanding()`:
   - Header with back arrow + "Connexion" title
   - 3 buttons: "Se connecter avec Google", "Se connecter avec Apple", "Se connecter avec e-mail"
   - Google button calls `handleGoogleAuth`
   - Apple button calls `handleAppleAuth`
   - Email button navigates to a new view `email-signin-form` that contains the current email/password + OTP form
   - Bottom link: "Vous n'avez pas de compte ? S'inscrire" → goes to `email-signup`

2. **Add a new AuthView value** `'email-signin-form'` to the type:
   - `type AuthView = 'landing' | 'email-signin' | 'email-signin-form' | 'email-signup' | 'otp' | 'reset'`

3. **Move current email-signin form content** into `renderEmailSigninForm()`:
   - Same password login + OTP sections as today
   - Back button goes to `email-signin` (the new 3-button page)
   - Bottom link: "Vous n'avez pas de compte ? S'inscrire"

4. **Update the landing page** bottom link text:
   - Change "Déjà inscrit ? Se connecter" to navigate to the new `email-signin` view (already does this)

5. **Update main render** to include the new `email-signin-form` view.

### Summary of Flow
```text
Landing (signup)                  Sign-in landing
┌──────────────────┐             ┌──────────────────┐
│  Google           │             │  ← Connexion     │
│  Apple            │             │  Google           │
│  Email    ────────┼──signup──►  │  Apple            │
│                   │             │  Email ───► form  │
│ Déjà inscrit? ───┼────────────►│                   │
│                   │             │ Pas de compte? ──►│ signup
└──────────────────┘             └──────────────────┘
```

