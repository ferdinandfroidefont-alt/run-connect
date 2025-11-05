# Corrections du Système de Notifications Push

## 📝 Modifications Effectuées

### 1️⃣ Suppression de `src/lib/notifications.ts`
- **Problème** : Double initialisation des listeners et de `PushNotifications.register()`
- **Solution** : Supprimé complètement, toute la logique centralisée dans `usePushNotifications.tsx`

### 2️⃣ Amélioration de `src/hooks/usePushNotifications.tsx`

#### Flag Global Unique
- Ajouté `(window as any).__pushNotificationSystemInitialized` pour éviter la double initialisation
- Vérifie ce flag avant chaque configuration de listeners

#### Logs Détaillés
- Ajouté des logs numérotés (1️⃣, 2️⃣, 3️⃣, 4️⃣) pour tracer chaque étape
- Logs préfixés avec `[INIT]`, `[LISTENERS]`, `[FCM]`, etc. pour faciliter le debug

#### Simplification
- Supprimé l'effet `syncFirebaseToken` redondant qui causait des appels multiples à `register()`
- Un seul appel à `setupPushListeners()` au démarrage
- Un seul appel à `PushNotifications.register()` quand nécessaire

### 3️⃣ Amélioration de l'Edge Function `send-push-notification`

#### Logs Étape par Étape
```typescript
console.log('🚀 [ENTRY] Edge function called');
console.log('1️⃣ [FCM] Génération du JWT Firebase...');
console.log('2️⃣ [FCM] Envoi de la notification...');
console.log('3️⃣ [FCM] Appel API FCM...');
console.log('📊 [FCM] Result:', fcmSuccess ? '✅ SUCCESS' : '❌ FAILED');
```

#### Meilleure Gestion des Erreurs
- Logs détaillés avec type d'erreur, message, stack trace
- Distinction entre erreurs FCM et erreurs générales
- Logs préfixés pour faciliter la recherche

## 🔍 Points de Vérification

### Côté Client (React)
1. **Vérifier l'initialisation** : Rechercher `[INIT]` dans les logs
2. **Vérifier les listeners** : Rechercher `[LISTENERS]` 
3. **Vérifier le token FCM** : Rechercher `[REGISTRATION]` et `[FCM EVENT]`
4. **Vérifier la sauvegarde** : Chercher "Token sauvegardé avec succès"

### Côté Serveur (Edge Function)
1. **Vérifier l'appel** : Rechercher `[ENTRY]` dans les logs Supabase
2. **Vérifier le JWT** : Rechercher `[AUTH]` et "JWT created"
3. **Vérifier l'envoi FCM** : Rechercher `[FCM]` et le résultat
4. **Vérifier les erreurs** : Rechercher `[FCM ERROR]` ou `[GENERAL ERROR]`

## 🧪 Test du Flux Complet

### Étape 1 : Vérifier le Token en Base
```sql
SELECT user_id, push_token, push_token_platform, notifications_enabled 
FROM profiles 
WHERE user_id = 'YOUR_USER_ID';
```

### Étape 2 : Vérifier les Logs Client
Ouvrir la console du navigateur/app et rechercher :
- ✅ `[INIT] Initialisation système de notifications...`
- ✅ `[LISTENERS] Listeners push configurés avec succès`
- ✅ `[REGISTRATION] Token FCM reçu !`
- ✅ `Token sauvegardé avec succès`

### Étape 3 : Tester l'Envoi
Cliquer sur "Test notification" et vérifier :
- Client : `🧪 Test notification...`
- Client : `✅ Test notification envoyé`
- Edge Function : `[ENTRY] Edge function called`
- Edge Function : `[FCM] Result: ✅ SUCCESS`

### Étape 4 : Vérifier la Réception
- Sur Android : Notification doit apparaître dans la barre
- Channel ID : `runconnect_channel`
- Titre : "Test RunConnect"
- Corps : "Vos notifications fonctionnent parfaitement ! 🎉"

## ⚠️ Problèmes Potentiels

### Si le token n'est pas sauvegardé
1. Vérifier les logs : rechercher `[REGISTRATION]`
2. Vérifier Firebase : `google-services.json` présent ?
3. Vérifier Google Play Services : appareil compatible ?
4. Vérifier les permissions : `POST_NOTIFICATIONS` accordée ?

### Si l'edge function échoue
1. Vérifier le secret : `FIREBASE_SERVICE_ACCOUNT_JSON` configuré ?
2. Vérifier le format : JSON valide sans double échappement ?
3. Vérifier les logs : rechercher `[FCM ERROR]` ou `[GENERAL ERROR]`
4. Vérifier le token : est-il valide et non expiré ?

### Si la notification n'arrive pas
1. Vérifier le canal : `runconnect_channel` créé dans MainActivity ?
2. Vérifier les préférences : `notifications_enabled = true` ?
3. Vérifier le type : préférence de type activée (ex: `notif_message`) ?
4. Tester avec Firebase Console directement

## 🔧 Commandes Utiles

### Vider le Token (Force Renouvellement)
```sql
UPDATE profiles 
SET push_token = NULL, push_token_updated_at = NULL 
WHERE user_id = 'YOUR_USER_ID';
```

### Vérifier les Logs de Notification
```sql
SELECT * FROM notification_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Vérifier les Notifications en Base
```sql
SELECT * FROM notifications 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 📚 Prochaines Étapes

1. ✅ **Tester** le flux complet de bout en bout
2. ⏳ **Corriger** Google Sign-In (SHA-1 / OAuth)
3. ⏳ **Vérifier** le secret `FIREBASE_SERVICE_ACCOUNT_JSON` dans Supabase
4. ⏳ **Télécharger** une nouvelle clé depuis Firebase Console si nécessaire
5. ⏳ **Tester** sur un appareil physique Android

## 🎯 Objectif Final

- ✅ Un seul système d'initialisation des notifications
- ✅ Logs détaillés à chaque étape
- ✅ Gestion robuste des erreurs
- ✅ Token FCM correctement sauvegardé
- ✅ Edge function fonctionnelle avec logs clairs
- ⏳ Notifications reçues sur Android/iOS
