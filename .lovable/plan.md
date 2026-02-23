
## Corriger les notifications push (Android + iOS)

### Probleme 1 : Token non sauvegarde en base

Le service Java `MyFirebaseMessagingService` tente de sauvegarder le token FCM directement via l'API REST Supabase avec la cle anon. Mais la politique RLS sur `profiles` exige `auth.uid() = user_id`, ce qui fait echouer la requete silencieusement. Le token n'est jamais sauvegarde en base de donnees.

**Solution** : Creer une edge function `save-push-token` qui accepte `user_id` et `token` sans authentification, valide les donnees, et sauvegarde avec le service role key. Modifier le code Java pour appeler cette edge function.

### Probleme 2 : Channel ID different entre l'edge function et Android

L'edge function FCM envoie `channel_id: 'high_importance_channel'` mais le `MyFirebaseMessagingService` (android-webview) cree le canal `runconnect_channel`. Les notifications FCM arrivent au device mais sont ignorees car le canal cible n'existe pas.

**Solution** : Changer le `channel_id` dans l'edge function de `high_importance_channel` a `runconnect_channel`.

### Probleme 3 : `testNotification` ne tente pas de recuperer le token

Quand on clique "tester", la fonction lit le token en DB et abandonne si null. Elle ne tente pas de recuperer le token depuis `window.fcmToken` ou `window.__fcmTokenBuffer`.

**Solution** : Avant de dire "aucun token", essayer de sauvegarder tout token disponible en memoire.

### Details techniques

#### Fichier 1 : `supabase/functions/save-push-token/index.ts` (nouveau)

Edge function qui :
- Accepte `{ user_id, token, platform }` en POST
- Valide que user_id est un UUID et token fait > 50 caracteres
- Sauvegarde dans `profiles` via service role key (pas de RLS)
- Ne necessite pas d'authentification utilisateur

#### Fichier 2 : `supabase/config.toml`

Ajouter la configuration pour la nouvelle edge function avec `verify_jwt = false`.

#### Fichier 3 : `supabase/functions/send-push-notification/index.ts`

Ligne 121 : changer `channel_id: 'high_importance_channel'` en `channel_id: 'runconnect_channel'`.

#### Fichier 4 : `android-webview/app/src/main/java/app/runconnect/MyFirebaseMessagingService.java`

Modifier `savePushTokenToSupabase()` pour appeler l'edge function `save-push-token` au lieu d'utiliser l'API REST directe avec la cle anon. L'URL sera : `https://dbptgehpknjsoisirviz.supabase.co/functions/v1/save-push-token`.

#### Fichier 5 : `src/hooks/usePushNotifications.tsx`

Modifier `testNotification()` (ligne 250-316) pour :
1. Avant de verifier le token en DB, regarder si `window.fcmToken` ou `window.__fcmTokenBuffer` ou le state `token` existe
2. Si un token est trouve en memoire mais pas en DB, le sauvegarder d'abord
3. Re-verifier en DB apres la tentative de sauvegarde
4. Seulement alors afficher "aucun token" si vraiment rien n'est trouve

### Resultat attendu

- Android : le token FCM est sauvegarde de maniere fiable via l'edge function des le premier lancement
- Les notifications apparaissent sur Android car le canal correspond
- Le bouton "tester" fonctionne meme si le token n'etait pas encore sauvegarde
- iOS : reste un probleme separe (configuration Firebase/APNS dans le pipeline CI/CD)
