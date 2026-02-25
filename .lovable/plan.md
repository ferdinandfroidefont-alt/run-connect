

## Diagnostic

Le probleme est dans le flux Google OAuth iOS. Voici ce qui se passe :

1. L'app appelle `supabase.auth.signInWithOAuth` avec `redirectTo: 'app.runconnect://auth'`
2. Le client Supabase est configure en `flowType: 'pkce'` (ligne 26 de `client.ts`)
3. Avec PKCE, apres l'auth Google, le serveur Supabase fait une redirection HTTP 302 vers `app.runconnect://auth?code=XXXX`
4. Safari/SFSafariViewController ne peut pas "ouvrir" un custom scheme comme une page web → **"Safari ne peut pas ouvrir la page car l'adresse n'est pas valide"**
5. Meme si le deep link arrive dans l'app, le code actuel (lignes 279-280) cherche `access_token` et `refresh_token` dans le fragment URL (`#`), mais avec PKCE il n'y a qu'un parametre `code` dans la query string (`?`) → les tokens ne sont jamais trouves

**Deux bugs combines :**
- Le custom scheme comme redirect URL pose probleme avec PKCE sur iOS
- Le handler ne gere pas l'echange de code PKCE

## Plan de correction

### Fichier : `src/pages/Auth.tsx`

**A. Changer la strategie de redirect pour iOS**

Remplacer `redirectTo: 'app.runconnect://auth'` par `redirectTo: 'https://run-connect.lovable.app/auth/callback'` (URL web).

Apres l'auth Google, Supabase redirige vers cette URL web. La page web dans SFSafariViewController va charger, et `detectSessionInUrl: true` du client Supabase va automatiquement echanger le code PKCE. Ensuite, on redirige vers le custom scheme pour revenir dans l'app.

**B. Ajouter la gestion du code PKCE dans le deep link handler**

Dans le listener `appUrlOpen`, en plus de chercher `access_token`/`refresh_token`, verifier la presence d'un parametre `code` et appeler `supabase.auth.exchangeCodeForSession(code)` pour etablir la session.

**C. Creer une route `/auth/callback` qui redirige vers l'app native**

Ajouter un composant `AuthCallback` qui :
1. Laisse Supabase echanger le code PKCE automatiquement (via `detectSessionInUrl`)
2. Detecte que la session est etablie
3. Redirige vers `app.runconnect://` pour que SFSafariViewController renvoie dans l'app
4. Si on est deja dans l'app native (pas dans SFSafariViewController), navigate vers `/`

### Fichier : `src/App.tsx`

**D. Ajouter la route `/auth/callback`**

Ajouter `<Route path="/auth/callback" element={<AuthCallback />} />` dans le router.

### Fichier : `src/pages/AuthCallback.tsx` (nouveau)

**E. Composant AuthCallback**

```
- Au mount, detecter si on a un `code` dans l'URL
- Laisser Supabase echanger via detectSessionInUrl
- Ecouter onAuthStateChange pour detecter la session
- Si sur iOS natif en SFSafariViewController : rediriger vers app.runconnect://auth?session=ok
- Sinon : navigate vers /
```

### Resume des modifications

```text
src/pages/Auth.tsx
├── ~ ligne 245: redirectTo → 'https://run-connect.lovable.app/auth/callback'
├── ~ lignes 268-280: ajouter gestion du param 'code' + exchangeCodeForSession
└── ~ deep link handler: gerer aussi les URLs https://run-connect.lovable.app/auth/callback

src/pages/AuthCallback.tsx (nouveau)
├── Echange code PKCE via detectSessionInUrl
├── Redirection vers custom scheme pour retour dans l'app
└── Fallback navigate('/') si deja dans l'app

src/App.tsx
└── + Route /auth/callback → AuthCallback
```

### Configuration Supabase requise

Verifier que `https://run-connect.lovable.app/auth/callback` est dans les Redirect URLs autorisees dans Supabase Dashboard > Authentication > URL Configuration. C'est probablement deja couvert par `https://run-connect.lovable.app/*` mais a confirmer.

### Pourquoi ca resout le probleme

- Safari peut ouvrir une URL `https://` sans erreur
- Le code PKCE est echange cote serveur/client correctement
- Le retour dans l'app se fait via un lien `app.runconnect://` depuis la page callback
- L'utilisateur arrive dans l'app connecte, pas sur le site web

