

## Diagnostic

J'ai identifie **2 problemes critiques** :

### Probleme 1 : Le 302 redirect ne fonctionne PAS avec SFSafariViewController

`SFSafariViewController` sur iOS **ne suit PAS les redirections HTTP 302 vers des custom URL schemes** (`app.runconnect://`). Il ne supporte que les Universal Links (HTTPS). L'Edge Function `ios-auth-callback` fait un `302 → app.runconnect://auth?code=XXX`, et Safari l'ignore silencieusement.

**Solution** : L'Edge Function doit retourner une **page HTML avec un redirect JavaScript** au lieu d'un 302 HTTP. Le JavaScript `window.location.href = 'app.runconnect://...'` fonctionne dans SFSafariViewController.

### Probleme 2 : Pas de git pull = pas de deep link handler natif

Meme avec le fix ci-dessus, le deep link `app.runconnect://auth?code=XXX` doit etre capture par l'app iOS native. Sans git pull + rebuild Xcode, le listener `App.addListener('appUrlOpen')` et la configuration native ne sont pas a jour.

---

## Plan de correction

### 1. Modifier l'Edge Function `ios-auth-callback` - Remplacer le 302 par une page HTML

Au lieu de `return new Response(null, { status: 302, headers: { Location: deepLink } })`, retourner une page HTML qui :
- Affiche "Redirection vers RunConnect..." 
- Execute `window.location.href = 'app.runconnect://auth?code=XXX'` en JavaScript
- Affiche un bouton fallback "Ouvrir RunConnect" si le redirect auto ne marche pas apres 2s

### 2. Action manuelle requise : git pull + rebuild

Tu dois faire `git pull` puis rebuilder l'app iOS dans Xcode pour que :
- Le code Auth.tsx mis a jour soit charge
- Le deep link handler natif Capacitor soit actif
- Le scheme `app.runconnect` soit enregistre dans Info.plist

### Fichiers modifies
- `supabase/functions/ios-auth-callback/index.ts` - HTML + JS redirect au lieu de 302

