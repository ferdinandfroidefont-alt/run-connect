

# Plan: Fix iOS Push Token NULL — Firebase Bundle ID Mismatch

## Cause racine confirmée

Le diagnostic utilisateur montre :
- `apnsHexDetected: true` → APNs fonctionne, iOS envoie un token
- `fcmTokenEventReceived: false` → Firebase ne renvoie jamais de token FCM
- `backendProfilePushToken: null` → rien en DB

**Raison** : Le `GoogleService-Info.plist` en CI correspond à une app Firebase `app.runconnect`, mais l'app est compilée et signée en `com.ferdi.runconnect`. Firebase Messaging ne peut pas faire l'échange APNs→FCM si le bundle ID ne correspond pas.

## Actions requises

### 1. (Config manuelle — P0) Régénérer le GoogleService-Info.plist

L'utilisateur doit :
1. Aller dans Firebase Console → Project Settings → Apps iOS
2. Vérifier si une app avec bundle ID `com.ferdi.runconnect` existe. Si non, en créer une
3. Télécharger le nouveau `GoogleService-Info.plist` correspondant à `com.ferdi.runconnect`
4. Encoder en base64 : `base64 -i GoogleService-Info.plist | pbcopy`
5. Mettre à jour le secret GitHub `IOS_GOOGLE_SERVICE_INFO_BASE64` avec cette valeur
6. Relancer le workflow CI

### 2. (Code) Améliorer le message d'erreur de `testNotification`

Quand `fcmTokenEventReceived` est `false` sur iOS, le toast actuel dit juste "token: null". Ajouter un message explicite qui oriente vers la cause Firebase.

**Fichier** : `src/hooks/usePushNotifications.tsx`

Dans la fonction `testNotification` (ligne ~522-529), quand le token est null sur iOS, afficher un message plus utile :
- Si `pushDebug.apnsHexDetected === true` ET `pushDebug.fcmTokenEventReceived === false` → "Token FCM non reçu. Vérifiez que le GoogleService-Info.plist correspond au bundle ID com.ferdi.runconnect"
- Sinon : message actuel

### 3. (Code) Corriger les références `app.runconnect` restantes dans IOS_SETUP_INSTRUCTIONS.md

La checklist mentionne encore `app.runconnect` pour Firebase et OAuth. Harmoniser tout sur `com.ferdi.runconnect`.

**Fichier** : `IOS_SETUP_INSTRUCTIONS.md` — lignes 155, 158, 292, 304-305, 326

## Résumé des changements code

| Fichier | Changement |
|---------|-----------|
| `src/hooks/usePushNotifications.tsx` | Toast `testNotification` plus explicite sur iOS quand FCM bridge échoue |
| `IOS_SETUP_INSTRUCTIONS.md` | Remplacer les dernières refs `app.runconnect` par `com.ferdi.runconnect` dans la checklist |

## Impact attendu

Après régénération du plist avec le bon bundle ID + rebuild CI :
- Firebase recevra le token APNs et le convertira en FCM
- `messaging(didReceiveRegistrationToken)` sera appelé côté natif
- Le bridge WebView injectera le token FCM → `fcmTokenEventReceived: true`
- `save-push-token` stockera le token → `push_token` non-null en DB
- "Tester les notifications" fonctionnera

