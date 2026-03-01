

## Diagnostic

L'erreur "Safari ne peut pas ouvrir la page car l'adresse n'est pas valide" confirme que iOS ne reconnait pas le scheme `runconnect://`. Deux causes possibles :

1. **Le dossier `ios/` n'existe pas dans le repo** (confirmé : `ios/` est vide). Donc `Info.plist` n'est pas versionné ici. Le scheme doit etre configuré manuellement dans Xcode apres `npx cap add ios`.
2. **Le redirect `302` vers `runconnect://...` est fait depuis SFSafariViewController** (navigateur externe), ce qui est correct. Le probleme est uniquement que le scheme n'est pas declaré dans `Info.plist` cote Xcode.

## Etat actuel du code

- **Edge function** : redirige vers `runconnect://auth/callback?code=...` -- OK, format correct (`scheme://host/path?query`).
- **capacitor.config.ts** : `ios.scheme = 'runconnect'` -- OK, Capacitor devrait generer le URL Type dans Info.plist lors de `npx cap sync`.
- **Auth.tsx** : ecoute `App.addListener('appUrlOpen', ...)` pour `runconnect://auth/callback` -- OK.
- **App.tsx** : pas de listener global `appUrlOpen` -- le listener est local dans Auth.tsx ce qui est un probleme si l'utilisateur n'est pas sur la page Auth quand le deep link arrive.

## Plan d'implementation

### 1. Deplacer le listener `appUrlOpen` au niveau global (App.tsx)

Le listener doit etre monte au demarrage de l'app, pas uniquement quand on est sur la page Auth. Si iOS rouvre l'app via deep link, le composant Auth pourrait ne pas etre monte.

- **Fichier** : `src/App.tsx`
- Ajouter un `useEffect` global qui ecoute `App.addListener('appUrlOpen', ...)` 
- Si URL commence par `runconnect://auth/callback`, extraire le `code`, appeler `supabase.auth.exchangeCodeForSession(code)`, fermer le browser, naviguer vers `/`
- Nettoyer le listener au unmount

### 2. Simplifier Auth.tsx

- **Fichier** : `src/pages/Auth.tsx`
- Supprimer le listener `appUrlOpen` local (lignes 261-317) et le timeout associe
- Garder uniquement `Browser.open({ url: oauthData.url })` pour lancer le flux
- Le retour deep link sera gere globalement par App.tsx

### 3. Edge function -- deja correct

- `supabase/functions/ios-auth-callback/index.ts` redirige vers `runconnect://auth/callback?code=...` -- aucun changement necessaire.

### 4. Instructions post-deploy pour l'utilisateur

Apres `git pull` + `npx cap sync ios` :
- Ouvrir Xcode, aller dans **Runner > Info > URL Types**
- Verifier qu'un URL Type avec scheme `runconnect` existe
- Si absent : ajouter manuellement (Identifier: `runconnect`, URL Schemes: `runconnect`)
- Ajouter `runconnect://auth/callback` dans Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
- Rebuild et tester

### 5. Bouton debug (bonus)

- **Fichier** : `src/pages/Auth.tsx`
- Ajouter un bouton visible uniquement sur iOS natif qui fait `Browser.open({ url: 'runconnect://test' })`
- Si iOS ne reconnait pas le scheme, c'est que Info.plist n'est pas bon

### Fichiers modifies
- `src/App.tsx` (ajout listener global appUrlOpen)
- `src/pages/Auth.tsx` (suppression listener local, ajout bouton debug)

### Flux final
```text
Clic Google -> Browser.open(oauthUrl) -> SFSafariViewController
-> Google login -> Supabase -> Edge function ios-auth-callback
-> 302 vers runconnect://auth/callback?code=XXX
-> iOS reconnait le scheme -> rouvre l'app
-> appUrlOpen listener (global dans App.tsx)
-> Browser.close() -> exchangeCodeForSession(code) -> navigation /
```

