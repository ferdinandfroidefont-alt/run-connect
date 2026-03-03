

## Diagnostic

Le screenshot montre clairement que **SFSafariViewController affiche le HTML comme du texte brut** au lieu de le rendre. Le `Content-Type: text/html` que nous definissons dans l'edge function est **ecrase par le proxy/gateway de Supabase Edge Functions** en `text/plain`. Le JavaScript `window.location.href = 'runconnect://...'` n'est donc jamais execute.

## Solution

Contourner le probleme en hebergeant une **page HTML statique** sur le domaine de l'app (ou le Content-Type est garanti correct par le serveur web), et faire en sorte que l'edge function redirige vers cette page.

```text
Flux corrige :
  Edge function → 302 vers https://run-connect.lovable.app/ios-callback.html?code=XXX
  → SFSafariViewController charge la page statique (Content-Type correct)
  → JS: window.location.href = 'runconnect://auth/callback?code=XXX'
  → iOS intercepte le scheme → appUrlOpen → echange PKCE → session
```

## Fichiers modifies

### 1. Creer `public/ios-callback.html`

Page HTML statique qui :
- Lit les parametres `code`, `error`, `error_description` de l'URL
- Construit le deep link `runconnect://auth/callback?...`
- Execute `window.location.href` pour declencher le scheme
- Affiche un lien fallback apres 2 secondes

### 2. Modifier `supabase/functions/ios-auth-callback/index.ts`

Remplacer la generation HTML par un simple **302 redirect** vers `https://run-connect.lovable.app/ios-callback.html?code=XXX` (ou `?error=...`). Le serveur web de l'app servira la page avec le bon Content-Type.

### 3. Aucun autre fichier a modifier

- App.tsx : deja correct (listener `appUrlOpen`)
- Auth.tsx : deja correct (`redirectTo` vers l'edge function)
- Workflow iOS : deja correct

## Apres le deploy

- L'edge function sera re-deployee automatiquement
- La page statique sera deployee avec le prochain build web
- **Pas besoin de rebuild iOS** — seul le contenu serveur change
- Tester directement avec la build TestFlight actuelle

