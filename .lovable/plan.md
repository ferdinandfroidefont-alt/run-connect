

## Diagnostic complet : "user_id token null" sur iOS natif

Après analyse approfondie du code, voici **toutes les causes possibles** pour lesquelles `user_id` ou `token` est `null` lors de la sauvegarde du push token sur iOS natif.

---

### Cause 1 : Race condition — le token FCM arrive AVANT l'authentification

Le bridge natif iOS (`AppDelegate.swift`) injecte `window.fcmToken` et déclenche `fcmTokenReady` dès que Firebase retourne le token. Mais à ce moment, `useAuth` n'a peut-être pas encore récupéré la session Supabase.

**Dans le code** (ligne 214 de `usePushNotifications.tsx`) :
```typescript
if (!user) {
  log('[SAVE] No user, storing token pending');
  // → user_id est null ici
}
```

Le token est stocké dans `pendingTokenRef` mais si le `useEffect #2` (ligne 607) ne se re-déclenche pas correctement quand `user` arrive, le token n'est jamais sauvegardé.

**Fix** : Dans le listener `fcmTokenReady` (ligne 726), le `user` est capturé dans la closure au moment du mount. Si `user` est `null` au mount et arrive plus tard, le listener utilise toujours l'ancien `user = null`.

---

### Cause 2 : `useAuth` n'a pas le `user` au moment du `fcmTokenReady`

Le `useEffect #5` (ligne 725) qui écoute `fcmTokenReady` dépend de `savePushToken`, qui lui-même dépend de `user`. Si `user` est `null` quand le token arrive :
- `savePushToken` ligne 214 → retourne `false`
- Le token est stocké dans `pendingTokenRef` et `window.__pendingPushToken`
- Le `useEffect #2` (ligne 607) devrait le rattraper, MAIS il a `[user, savePushToken, ...]` en dépendances. Si `user` change mais que `savePushToken` change aussi (re-créé par `useCallback`), il peut y avoir un cycle où le token pending est perdu.

---

### Cause 3 : Session Supabase non restaurée dans la WebView iOS

Sur iOS natif (Capacitor), le localStorage contenant le token Supabase (`sb-*-auth-token`) peut ne pas être immédiatement disponible au lancement de la WebView. `supabase.auth.getSession()` retourne `null`.

**Dans le code** (ligne 222) :
```typescript
const { data: sess } = await supabase.auth.getSession();
if (!sess?.session?.user) {
  log('[SAVE] Session not ready, deferring');
  // → user_id est null côté session
}
```

---

### Cause 4 : Le `userAuthenticatedWithFCMToken` event n'est PAS écouté

`useAuth.tsx` (ligne 96) dispatche `userAuthenticatedWithFCMToken` quand l'utilisateur se connecte et qu'un `fcmToken` est détecté. **Mais `usePushNotifications.tsx` n'écoute JAMAIS cet événement !** C'est un event dispatché dans le vide — il n'y a aucun listener pour `userAuthenticatedWithFCMToken`.

C'est probablement le **bug principal**.

---

### Cause 5 : `save-push-token` edge function — pas d'Authorization header

Si la session n'est pas prête, `accessToken` est `null` (ligne 128-131). L'edge function reçoit un appel sans JWT. Elle ne rejette pas (elle log un warning) mais si `user_id` dans le body est correct, elle procède quand même. Le problème est si `user.id` est lui-même `null` côté client.

---

### Cause 6 : Profil pas encore créé dans `profiles`

Le trigger `handle_new_user` crée le profil au signup. Mais sur iOS, si le token arrive avant que le trigger ait fini, `save-push-token` fait un `UPDATE profiles WHERE user_id = ...` qui ne matche rien → retourne 404 (`profile_not_found_or_not_updated`).

---

### Cause 7 : iOS `register()` retourne un APNs hex token, pas un FCM token

Si Firebase n'est pas correctement initialisé dans `AppDelegate.swift` (ex: `FirebaseApp.configure()` manquant, proxy désactivé mais callback pas implémenté), `PushNotifications.register()` retourne le token APNs brut (64 chars hex). Le code le bloque correctement (ligne 360), mais ensuite le bridge natif `fcmTokenReady` ne se déclenche jamais car Firebase ne fait pas l'échange APNs→FCM.

---

### Plan de fix

**Fichier : `src/hooks/usePushNotifications.tsx`**

1. **Ajouter un listener pour `userAuthenticatedWithFCMToken`** dans le `useEffect #5` — quand cet événement arrive, relancer `savePushToken` avec le token et le userId du detail
2. **Dans le listener `fcmTokenReady`**, récupérer `user` dynamiquement via `supabase.auth.getUser()` au lieu de dépendre de la closure React — ça élimine la race condition
3. **Dans `savePushToken`**, si `!user` mais que `supabase.auth.getSession()` retourne un user valide, utiliser ce user directement au lieu de retourner `false`
4. **Ajouter un retry dans `useEffect #2`** avec un délai de 2s après que `user` devienne disponible, pour s'assurer que les tokens pending sont bien sauvegardés

### Détails techniques

```text
Timeline iOS natif actuelle (BUG):
─────────────────────────────────────
t=0s   AppDelegate → FirebaseApp.configure()
t=0.5s APNs token arrive → échangé en FCM token
t=1s   fcmTokenReady dispatché dans WebView
t=1s   usePushNotifications listener → savePushToken(token)
t=1s   savePushToken: user = null → token stocké en pending
t=2s   supabase.auth.getSession() restaure la session
t=2s   useAuth: user = User{...}
t=2s   useEffect #2: devrait se déclencher mais...
       → savePushToken est recréé (nouvelle ref)
       → le pending token peut être "oublié"

Timeline corrigée :
─────────────────────────────────────
t=0s   AppDelegate → FirebaseApp.configure()
t=0.5s FCM token arrive → fcmTokenReady
t=1s   listener → savePushToken(token)
t=1s   user=null → getSession() directement → userId trouvé → save OK
       OU
t=2s   useAuth dispatche userAuthenticatedWithFCMToken
t=2s   nouveau listener → savePushToken(token, userId) → save OK
```

