

## Diagnostic

Le probleme fondamental : le flux PKCE est **incompatible** avec SFSafariViewController.

1. `signInWithOAuth` est appelé dans le WKWebView → le `code_verifier` est stocké dans le localStorage du WKWebView
2. Google redirige vers `https://run-connect.lovable.app/auth/callback?code=XXX`
3. Cette page charge **toute l'app React**, y compris le client Supabase avec `detectSessionInUrl: true`
4. Le client Supabase dans SFSafariViewController détecte le `?code=` et tente automatiquement `exchangeCodeForSession` → **ECHOUE** car pas de `code_verifier` dans ce contexte
5. Le code est **invalide coté serveur** (usage unique) → le deep link arrive trop tard, le code est mort

**C'est pour ça que le fix précédent ne marche pas** : même en capturant le code au niveau module, le client Supabase (initialisé globalement dans `client.ts`) le consomme avant que le composant React ne monte.

## Solution : Edge Function de redirection serveur (approche Instagram/Strava/Nike)

Au lieu de charger une page web qui initialise le client Supabase, on redirige le callback vers une **Edge Function** qui fait un simple 302 redirect vers le deep link. Aucun JavaScript client n'est exécuté, le code n'est jamais consommé.

```text
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────────┐     ┌──────────┐
│  WKWebView│────►│  Google  │────►│ Supabase │────►│ Edge Function    │────►│  WKWebView│
│ (app)     │     │  OAuth   │     │ Auth     │     │ ios-auth-callback│     │  (app)    │
│           │     │          │     │ /callback│     │ 302 → deep link  │     │ exchange  │
└──────────┘     └──────────┘     └──────────┘     └──────────────────┘     └──────────┘
                                                    PAS de JS client !       code_verifier
                                                    PAS de Supabase init     ✅ disponible
```

## Plan d'implementation

### 1. Créer l'Edge Function `ios-auth-callback`

Fonction minimale : reçoit `?code=XXX` → redirige 302 vers `app.runconnect://auth?code=XXX`. Aucune logique, aucun SDK, juste un redirect HTTP. Gère aussi le cas d'erreur (pas de code → redirige vers l'app avec `?error=...`).

### 2. Modifier `Auth.tsx` — flux iOS

Pour iOS uniquement, changer le `redirectTo` de :
- `https://run-connect.lovable.app/auth/callback`
vers :
- `https://dbptgehpknjsoisirviz.supabase.co/functions/v1/ios-auth-callback`

Le code arrivera directement dans l'app via deep link, et le `exchangeCodeForSession` fonctionnera car le `code_verifier` est dans le localStorage du WKWebView.

### 3. Ajouter l'URL de l'Edge Function aux Redirect URLs autorisées dans Supabase

L'URL `https://dbptgehpknjsoisirviz.supabase.co/functions/v1/ios-auth-callback` doit être ajoutée dans **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**.

### 4. Nettoyer `AuthCallback.tsx`

Simplifier la page AuthCallback pour ne garder que le flux web standard (desktop/navigateur mobile). Supprimer la logique iOS devenue inutile (le flux iOS ne passera plus par cette page).

### Fichiers modifiés
- `supabase/functions/ios-auth-callback/index.ts` — **nouveau** : Edge Function de redirection
- `src/pages/Auth.tsx` — Modifier le `redirectTo` pour iOS
- `src/pages/AuthCallback.tsx` — Simplifier (supprimer logique iOS)

### Action manuelle requise
- Ajouter `https://dbptgehpknjsoisirviz.supabase.co/functions/v1/ios-auth-callback` dans Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

