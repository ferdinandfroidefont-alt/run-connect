

## Diagnostic iOS Push Notifications

### Etat actuel de la base de donnees
- **61 profils** au total
- **3 tokens** enregistres (tous Android)
- **0 token iOS** — ton iPhone n'a jamais reussi a sauvegarder son token APNs/FCM en base

### Erreur reproduite
Quand tu appuies sur "Tester les notifications" sur iPhone :
1. Le code cherche `push_token` dans `profiles` pour ton `user_id` → **null**
2. Il tente de recuperer un token en memoire (`window.fcmToken`, etc.) → **null** (ces variables sont Android-only)
3. → Toast "Aucun token enregistre — user_id: xxx... token: null"

### Bugs identifies (4 problemes)

**BUG 1 (CRITIQUE) : `verify_jwt = true` sur `send-push-notification`**
Le `config.toml` exige un JWT valide. Le hook `useSendNotification.ts` (utilise par 15+ composants : messages, sessions, coaching, follow, clubs) appelle `supabase.functions.invoke('send-push-notification')` **sans passer de header Authorization**. Avec le systeme signing-keys de Supabase, ca bloque silencieusement les appels. Seul `testNotification` dans `usePushNotifications.tsx` passe le header correctement.

**BUG 2 (CRITIQUE) : `useSendNotification.ts` ne passe pas le header Authorization**
Meme si on corrige `verify_jwt`, il faut que ce hook transmette le token d'auth pour identifier l'appelant cote serveur.

**BUG 3 (iOS token jamais sauvegarde) : Pas de fallback robuste**
Sur iOS, le token arrive via `PushNotifications.register()` → event `registration`. Si `savePushToken()` echoue (ex: profil pas encore cree, session pas prete), le fallback edge function est tente mais sans `user_id` si `user` est null a ce moment. Le retry existe (12 tentatives / 10s) mais il ne re-appelle pas `PushNotifications.register()` — il attend un token en memoire qui n'a peut-etre jamais ete recu.

**BUG 4 (cosmetique) : Nom de canal Android incorrect dans NotificationManager**
Affiche "high_importance_channel" alors que le vrai canal est "runconnect_channel".

### Plan de corrections

#### 1. `supabase/config.toml` — verify_jwt = false
Passer `send-push-notification` a `verify_jwt = false` pour utiliser la validation en code.

#### 2. `supabase/functions/send-push-notification/index.ts` — Validation JWT optionnelle
Ajouter une verification manuelle du header Authorization au debut :
- Si header present → valider via `supabase.auth.getUser()` et extraire le `user_id`
- Si absent → accepter l'appel (pour les crons/webhooks internes) mais logger un warning
- Ne pas bloquer si pas de header (les appels serveur-a-serveur n'en ont pas)

#### 3. `src/hooks/useSendNotification.ts` — Ajouter Authorization header
Recuperer la session active via `supabase.auth.getSession()` et passer `Authorization: Bearer ${access_token}` dans les headers de `invoke()`. Ainsi les 15+ composants qui utilisent ce hook enverront correctement l'auth.

#### 4. `src/components/NotificationManager.tsx` — Corriger le nom du canal
Ligne 375 : remplacer `high_importance_channel` par `runconnect_channel`.

### Ce qui ne peut PAS etre corrige cote code

Si le token iOS n'arrive **jamais** (event `registration` ne se declenche pas), c'est un probleme de configuration APNs/Firebase :
- Cle APNs (.p8) uploadee dans Firebase Console ?
- Capability "Push Notifications" activee dans Xcode Signing & Capabilities ?
- Provisioning profile regenere avec l'entitlement `aps-environment` ?
- `GoogleService-Info.plist` present dans le target Xcode ?

Ces verifications sont manuelles et hors du code. Les corrections ci-dessus s'assurent qu'une fois le token recu, il sera correctement sauvegarde et que les notifications seront correctement envoyees.

### Fichiers modifies
- `supabase/config.toml` — verify_jwt = false
- `supabase/functions/send-push-notification/index.ts` — validation JWT en code
- `src/hooks/useSendNotification.ts` — header Authorization
- `src/components/NotificationManager.tsx` — nom canal

