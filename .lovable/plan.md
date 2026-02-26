

## Diagnostic

Le problème est dans le flux iOS PKCE Google Sign-In :

1. L'app ouvre SFSafariViewController → Google OAuth → redirige vers `https://run-connect.lovable.app/auth/callback?code=XXX`
2. La page AuthCallback se charge dans SFSafariViewController
3. **Bug** : Le client Supabase a `detectSessionInUrl: true` et `flowType: 'pkce'`. À l'initialisation globale du client, il détecte le `?code=` dans l'URL et tente d'échanger le code automatiquement. Mais le `code_verifier` PKCE est stocké dans le localStorage du WKWebView de l'app, pas dans SFSafariViewController → **l'échange échoue silencieusement** et le code est consommé/supprimé de l'URL
4. Quand le `useEffect` du composant AuthCallback s'exécute, `urlParams.get('code')` retourne `null` (code déjà consommé), ou l'échange échoue → "Erreur d'authentification. Réessayez."

Le deep link `app.runconnect://auth?code=${code}` ne se déclenche jamais car le `code` a été consommé avant que la détection iOS ne puisse agir.

## Plan de correction

### 1. Capturer le code IMMÉDIATEMENT au niveau module (AuthCallback.tsx)

Extraire le `code` de l'URL **avant** toute initialisation React/Supabase, en déclarant une constante au niveau du module :

```typescript
// Capture AVANT que Supabase detectSessionInUrl ne consomme le code
const INITIAL_URL_PARAMS = new URLSearchParams(window.location.search);
const INITIAL_CODE = INITIAL_URL_PARAMS.get('code');
const INITIAL_FULL_URL = window.location.href;
```

### 2. Prioriser la détection iOS et le deep link AVANT l'échange

Dans le `useEffect`, utiliser `INITIAL_CODE` au lieu de `urlParams.get('code')`. S'assurer que la redirection deep link iOS se fait en premier, AVANT tout appel à `exchangeCodeForSession`.

### 3. Ajouter un fallback : si le deep link échoue, afficher un bouton "Ouvrir l'app"

Au lieu de rester bloqué sur "Erreur d'authentification", ajouter un bouton explicite pour retenter le deep link, avec le code passé en paramètre.

### 4. Ajouter des logs pour chaque étape

Logs détaillés pour `INITIAL_CODE`, `isIOSNative`, et le résultat de chaque étape, afin de diagnostiquer si le problème persiste.

### Fichiers modifiés
- `src/pages/AuthCallback.tsx` — Capture du code au niveau module, priorisation du deep link iOS, fallback UX

