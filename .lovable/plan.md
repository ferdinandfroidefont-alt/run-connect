

## Fix: Google Sign-In sur iOS reste dans l'app (comme Android)

### Probleme
Sur Android, Google Sign-In ouvre une popup native dans l'app. Sur iOS, `signInWithOAuth` ouvre Safari externe, ce qui fait quitter l'app.

### Solution
Utiliser `@capgo/inappbrowser` sur iOS pour ouvrir le flux OAuth Google dans un navigateur integre (SFSafariViewController), sans quitter l'app. Le flux sera:

1. Generer l'URL OAuth Google via `signInWithOAuth` avec `skipBrowserRedirect: true`
2. Ouvrir cette URL dans l'InAppBrowser (reste dans l'app)
3. Ecouter la redirection de callback pour capturer les tokens
4. Fermer l'InAppBrowser et creer la session Supabase

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/Auth.tsx` | Ajouter la logique iOS: detecter la plateforme, utiliser InAppBrowser pour le flux OAuth au lieu de la redirection externe |
| `src/lib/googleSignIn.ts` | Ajouter `isNativeIOSGoogleSignInAvailable()` pour detecter iOS natif |

### Details techniques

**`src/lib/googleSignIn.ts`**
- Ajouter une fonction `isNativeIOS()` qui retourne `true` si on est sur iOS natif (via `Capacitor.getPlatform() === 'ios'`)

**`src/pages/Auth.tsx`** - dans `handleGoogleAuth`:
- Apres le check `isNativeAvailable` (Android), ajouter un check iOS
- Si iOS natif:
  1. Appeler `signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } })` pour obtenir l'URL OAuth
  2. Ouvrir cette URL avec `InAppBrowser.openInWebView()` de `@capgo/inappbrowser`
  3. Ecouter l'evenement `urlChangeEvent` pour detecter quand l'URL contient le callback Supabase (contient `access_token` ou `code`)
  4. Extraire les tokens de l'URL de callback
  5. Fermer l'InAppBrowser avec `InAppBrowser.close()`
  6. Appeler `supabase.auth.setSession()` ou echanger le code pour etablir la session
- Sinon (web), garder le comportement actuel avec redirection

### Flux sur iOS apres le fix

```text
Utilisateur tape "Se connecter avec Google"
        |
        v
InAppBrowser s'ouvre (dans l'app)
        |
        v
Page de connexion Google s'affiche
        |
        v
Utilisateur selectionne son compte
        |
        v
Redirection vers callback Supabase detectee
        |
        v
InAppBrowser se ferme automatiquement
        |
        v
Session creee, utilisateur connecte
```

