

## Diagnostic

La capture montre `token: null` sur iOS TestFlight. Le problème est dans l'injection `AppDelegate.swift` du workflow CI : **le protocole `MessagingDelegate` n'est pas ajouté à la déclaration de classe `AppDelegate`**.

Sans cette conformance, `Messaging.messaging().delegate = self` provoque une erreur de compilation Swift (ou est ignoré silencieusement), ce qui fait que :
- Le callback `messaging(_:didReceiveRegistrationToken:)` ne s'exécute jamais
- Le `Messaging.messaging().token { ... }` dans `didRegisterForRemoteNotificationsWithDeviceToken` peut aussi échouer car Firebase n'a pas encore échangé le token APNs contre un FCM token

Résultat : Capacitor ne reçoit jamais de token FCM, le `registration` listener ne fire pas (ou fire avec un token APNs qui est bloqué par notre validation hex-64), et `push_token` reste `null`.

## Correctif

**Fichier : `.github/workflows/ios-appstore.yml`**

1. Ajouter une commande `sed` pour injecter `, MessagingDelegate` dans la déclaration de la classe `AppDelegate` (avant les méthodes et le delegate assignment) :
   ```bash
   sed -i '' 's/class AppDelegate: UIResponder, UIApplicationDelegate/class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate/' "$DELEGATE"
   ```

2. Modifier l'appel `Messaging.messaging().token` pour utiliser la syntaxe explicite `token(completion:)` au lieu du trailing closure, afin d'éviter toute ambiguïté de compilation :
   ```swift
   Messaging.messaging().token(completion: { fcmToken, error in ... })
   ```

3. Appliquer ces deux corrections dans les **deux blocs Python** (lignes 95-130 et 137-170).

Cela corrige les 2 causes simultanément : le protocole manquant et la syntaxe d'appel potentiellement ambiguë. Après rebuild TestFlight, le token FCM sera correctement généré et posté à Capacitor.

