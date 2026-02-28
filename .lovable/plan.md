

## Problème

Google bloque les WebViews (WKWebView/InAppBrowser) pour OAuth sur iOS. Il exige `ASWebAuthenticationSession` ou `SFSafariViewController`. Le plugin `@capacitor/browser` utilise exactement `SFSafariViewController` sur iOS — c'est la solution conforme.

## Plan

### 1. Edge function `ios-auth-callback` — Redirect vers deep link

Remplacer toutes les redirections HTTPS par le scheme `runconnect://` :

- Succès : `runconnect://auth/callback?code=XXX`
- Erreur : `runconnect://auth/callback?error=XXX&error_description=XXX`
- No code : `runconnect://auth/callback?error=no_code&error_description=...`

**Fichier** : `supabase/functions/ios-auth-callback/index.ts`

### 2. Auth.tsx — Remplacer InAppBrowser par Browser + App listener

Dans le bloc iOS (`isNativeIOS()`), remplacer tout le code InAppBrowser par :

- Import `Browser` from `@capacitor/browser`
- Import `App` from `@capacitor/app`
- `App.addListener('appUrlOpen', ...)` pour intercepter `runconnect://auth/callback`
- `Browser.open({ url: oauthData.url })` (ouvre SFSafariViewController, conforme Google)
- Dans le listener : extraire `code`, `Browser.close()`, `exchangeCodeForSession(code)`, navigation
- Supprimer import `InAppBrowser` de `@capgo/inappbrowser`
- Supprimer `urlChangeEvent`, `openWebView`, `InAppBrowser.close()`

**Fichier** : `src/pages/Auth.tsx`

### 3. Capacitor config — Ajouter scheme `runconnect`

Modifier `capacitor.config.ts` pour ajouter/mettre à jour le scheme iOS :

```typescript
ios: {
  scheme: 'runconnect',  // au lieu de 'app.runconnect'
  // ... reste inchangé
}
```

**Fichier** : `capacitor.config.ts`

### 4. Instructions post-deploy pour l'utilisateur

Après implémentation :
- `git pull` + `npx cap sync`
- Vérifier dans Xcode : **Info** → **URL Types** → scheme `runconnect` présent
- Si absent, l'ajouter manuellement : Identifier = `runconnect`, URL Schemes = `runconnect`
- Rebuild iOS
- Ajouter `runconnect://auth/callback` dans Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

### Fichiers modifiés
- `supabase/functions/ios-auth-callback/index.ts`
- `src/pages/Auth.tsx`
- `capacitor.config.ts`

### Flux final
```text
Clic Google → Browser.open(oauthUrl) → SFSafariViewController (conforme Google)
→ Google login → Supabase → Edge function ios-auth-callback
→ 302 vers runconnect://auth/callback?code=XXX
→ iOS ouvre l'app via deep link → appUrlOpen listener
→ Browser.close() → exchangeCodeForSession(code) → navigation Home
```

