

## Probleme

Apres Google OAuth, l'edge function redirige vers `https://run-connect.lovable.app/auth/callback?code=XXX`. L'InAppBrowser **charge cette URL comme une vraie page web**, ce qui :
1. Affiche la page de connexion (le composant AuthCallback)
2. Le client Supabase de la page web **consomme le code PKCE** avant que `urlChangeEvent` ne puisse l'intercepter
3. Resultat : la session est creee dans l'InAppBrowser (pas dans l'app native), et l'utilisateur voit la page d'auth web

## Solution

Rediriger vers une URL "inerte" qui n'existe pas comme route React, pour que `urlChangeEvent` puisse intercepter le code **avant** qu'il soit consomme par le client web Supabase.

### Modifications

**1. `supabase/functions/ios-auth-callback/index.ts`**
- Changer la redirection de `/auth/callback?code=` vers `/ios-complete?code=`
- Cette route n'existe pas dans l'app React → la page ne chargera pas de Supabase client → le code PKCE reste intact

**2. `src/pages/Auth.tsx`**
- Mettre a jour le listener `urlChangeEvent` pour detecter `/ios-complete` au lieu de `/auth/callback`
- Le reste du flux (extract code → close browser → exchangeCodeForSession) reste identique

### Fichiers modifies
- `supabase/functions/ios-auth-callback/index.ts`
- `src/pages/Auth.tsx`

