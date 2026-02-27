
Do I know what the issue is? Oui: le flux iOS reste dans le WebView car la redirection HTTPS `/ios-complete` charge la web app (NotFound/auth) au lieu de renvoyer de façon fiable vers le contexte natif. Le callback doit revenir via deep link natif puis être traité par `App.addListener('appUrlOpen')`.

### Plan d’implémentation (court)

1. **Basculer le callback iOS vers deep link natif**
   - Fichier: `supabase/functions/ios-auth-callback/index.ts`
   - Remplacer les redirections `https://run-connect.lovable.app/ios-complete?...` par `app.runconnect://ios-complete?...` (succès + erreurs).

2. **Gérer explicitement le retour deep link dans Auth iOS**
   - Fichier: `src/pages/Auth.tsx`
   - Ajouter un listener temporaire `App.addListener('appUrlOpen', ...)` au lancement du flow Google iOS.
   - Si URL contient `app.runconnect://ios-complete`, parser `code`/`error`, fermer `InAppBrowser`, faire `supabase.auth.exchangeCodeForSession(code)`, puis navigation/profile setup.
   - Nettoyer systématiquement listener + timeout (succès, erreur, annulation).

3. **Garder un fallback robuste**
   - Conserver `urlChangeEvent` pour intercepter aussi `/ios-complete` si jamais un flux HTTPS est encore reçu.
   - Unifier le traitement callback dans une seule fonction interne (`handleOAuthCallbackUrl(url)`), appelée par `appUrlOpen` + `urlChangeEvent`.

4. **Durcir la stabilité du flow**
   - Ajouter garde anti double-traitement (flag `callbackHandledRef`) pour éviter double exchange.
   - Ajouter logs ciblés pour distinguer clairement:
     - callback reçu via deep link natif
     - callback reçu via webview URL change
     - aucun callback (timeout).

### Détails techniques (section dédiée)

- **Fichiers touchés**
  - `supabase/functions/ios-auth-callback/index.ts`
  - `src/pages/Auth.tsx`
- **Événements utilisés**
  - `App.addListener('appUrlOpen', ...)` (principal iOS natif)
  - `InAppBrowser.addListener('urlChangeEvent', ...)` (fallback)
- **Flux final visé**
```text
Google OAuth -> edge function ios-auth-callback -> app.runconnect://ios-complete?code=...
-> appUrlOpen (dans l’app native) -> close webview -> exchangeCodeForSession -> navigation app
```

### Vérification après implémentation

1. Tester Google login sur iPhone réel:
   - ouverture Google
   - retour automatique dans l’app native (pas de page web run-connect)
   - session active dans l’app
   - redirection vers `/` ou setup profil.
2. Tester chemin erreur OAuth (`error`, `error_description`).
3. Confirmer absence de boucle/NotFound web.
4. Après pull des changements natifs: `git pull` puis `npx cap sync` avant rebuild iOS.
5. Relire aussi le billet Capacitor recommandé pour les flows OAuth natifs avant release.
