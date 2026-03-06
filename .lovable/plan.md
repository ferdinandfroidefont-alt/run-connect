
Objectif: corriger définitivement iOS où “Tester les notifications” crée bien la notif in-app mais n’envoie pas de vraie push système.

Constat vérifié (preuve technique)
- Les logs Edge Function `send-push-notification` montrent: `400 INVALID_ARGUMENT: The registration token is not a valid FCM registration token`.
- En base, `profiles.push_token_platform='ios'` avec un token longueur `64` hexadécimal (`8E2E...`), ce format correspond à un token APNs brut, pas un token FCM iOS.
- Donc le flux actuel sauvegarde parfois le mauvais token côté iOS, puis FCM refuse l’envoi. Résultat: notification créée en DB/in-app, mais pas de push système.

Cause racine
- Le listener Capacitor `registration` côté iOS reçoit un token APNs si on forward `deviceToken` directement.
- Ce token APNs est persisté dans `profiles.push_token`, puis utilisé par `send-push-notification` (FCM HTTP v1), qui exige un token FCM.
- Le message “Notification créée mais non envoyée (token invalide ?)” est cohérent avec ce scénario.

Plan d’implémentation (correctif robuste)

1) Corriger l’injection iOS native dans le workflow CI
Fichier: `.github/workflows/ios-appstore.yml`
- Adapter le patch `AppDelegate.swift` pour publier un token FCM (string), pas le token APNs brut.
- Ajouter/forcer:
  - `import FirebaseMessaging`
  - Conformance `MessagingDelegate`
  - `Messaging.messaging().delegate = self`
  - Dans `didRegisterForRemoteNotificationsWithDeviceToken`:
    - garder `Messaging.messaging().apnsToken = deviceToken`
    - récupérer ensuite `Messaging.messaging().token { fcmToken, error in ... }`
    - poster `NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: fcmToken)` quand dispo
  - Implémenter aussi `messaging(_:didReceiveRegistrationToken:)` et reposter vers Capacitor avec le token FCM.
- Garder `FirebaseAppDelegateProxyEnabled=true` dans Info.plist (déjà en place).

2) Bloquer la sauvegarde des faux tokens iOS côté front
Fichier: `src/hooks/usePushNotifications.tsx`
- Ajouter une validation stricte avant `savePushToken`:
  - si `platform === 'ios'` et token match `^[A-Fa-f0-9]{64}$`, considérer “APNs token non exploitable par FCM”, ne pas sauvegarder dans `profiles.push_token`.
- En cas de token APNs détecté:
  - log explicite `[PUSH][iOS] APNs token reçu, attente token FCM`
  - relancer la récupération (register/retry existants) sans polluer la DB.
- Mettre le diagnostic utilisateur plus clair dans `testNotification` (stage/reason remontés par l’edge function).

3) Ajouter un garde-fou serveur pour éviter régression
Fichier: `supabase/functions/save-push-token/index.ts`
- Si `platform==='ios'` et token hex 64 chars, rejeter avec 422 (`"ios_apns_token_not_fcm"`), au lieu d’écraser `profiles.push_token`.
- Retourner un message explicite pour observabilité.

4) Durcir l’envoi push côté backend
Fichier: `supabase/functions/send-push-notification/index.ts`
- Traiter aussi l’erreur `INVALID_ARGUMENT` FCM (pas seulement `UNREGISTERED`) comme token inutilisable:
  - nettoyer `profiles.push_token` (null) pour forcer refresh token au prochain lancement
  - loguer précisément `FCM_INVALID_ARGUMENT_TOKEN`.
- Cela évite de rester bloqué avec un token iOS mort.

5) Nettoyage des données existantes + validation E2E
- Exécuter un nettoyage DB des tokens iOS invalides existants (hex 64):
  - `update profiles set push_token = null, push_token_updated_at = null where push_token_platform='ios' and push_token ~ '^[A-F0-9]{64}$';`
- Redéployer edge functions modifiées.
- Relancer build TestFlight (nouveau binaire avec AppDelegate patché).
- Test E2E obligatoire sur iPhone réel:
  1. Ouvrir app, autoriser notifications
  2. Vérifier en DB que `push_token` iOS n’est plus hex-64 (token FCM long)
  3. App en arrière-plan puis “Tester les notifications”
  4. Vérifier bannière push iOS + entrée Notification Center.

Résultat attendu
- Plus de `INVALID_ARGUMENT` FCM sur iOS.
- `testNotification` envoie une vraie push système (pas seulement in-app).
- Auto-récupération si token iOS devient invalide, sans boucle d’échec silencieuse.
