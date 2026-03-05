

## Diagnostic

Le probleme est identifie avec certitude. Sur iOS, le workflow CI modifie `AppDelegate.swift` pour ajouter `FirebaseApp.configure()`, mais il **ne rajoute pas les methodes delegues APNs** obligatoires. Sans ces methodes :

1. `PushNotifications.register()` appelle iOS pour demander un token APNs
2. iOS genere le token et appelle `didRegisterForRemoteNotificationsWithDeviceToken`
3. **Mais cette methode n'existe pas dans AppDelegate** → le token n'est jamais transmis a Capacitor ni a Firebase
4. Le listener `registration` dans `usePushNotifications.tsx` ne se declenche jamais → `token = null`

Sur Android ca marche car `AndroidBridge` injecte le token FCM directement via `window.fcmToken`.

## Solution

### Fichier modifie : `.github/workflows/ios-appstore.yml`

Modifier l'etape "Configure AppDelegate for Firebase" (lignes 79-94) pour injecter les 3 methodes APNs manquantes dans `AppDelegate.swift` :

```swift
// 1. Importer Firebase Messaging (pas juste FirebaseCore)
import FirebaseCore
import FirebaseMessaging

// 2. Dans didFinishLaunchingWithOptions (deja fait) :
FirebaseApp.configure()
Messaging.messaging().delegate = self  // MANQUANT

// 3. Methodes delegues APNs (MANQUANTES) :
func application(_ application: UIApplication,
  didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken  // Convertit APNs → FCM
    NotificationCenter.default.post(
      name: .capacitorDidRegisterForRemoteNotifications,
      object: deviceToken
    )
}

func application(_ application: UIApplication,
  didFailToRegisterForRemoteNotificationsWithError error: Error) {
    NotificationCenter.default.post(
      name: .capacitorDidFailToRegisterForRemoteNotifications,
      object: error
    )
}
```

Le `sed` actuel ne fait qu'ajouter `import FirebaseCore` et `FirebaseApp.configure()`. Il faut le remplacer par un script qui :
- Ajoute `import FirebaseCore` et `import FirebaseMessaging`
- Ajoute `FirebaseApp.configure()` + `Messaging.messaging().delegate = self`
- Ajoute les 2 methodes delegues APNs avant la derniere accolade fermante de la classe
- Ajoute `FirebaseAppDelegateProxyEnabled = true` dans Info.plist (permet a Firebase de swizzler automatiquement les methodes APNs comme backup)

### Pourquoi ca resout le probleme

Quand iOS obtient le token APNs :
1. `didRegisterForRemoteNotificationsWithDeviceToken` est appele
2. `Messaging.messaging().apnsToken = deviceToken` → Firebase genere un token FCM
3. `NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications)` → Capacitor recoit le token
4. Le listener `registration` dans `usePushNotifications.tsx` se declenche
5. Le token est sauve en base → `testNotification()` fonctionne

### Apres le deploy

1. Lancer un nouveau build GitHub Actions iOS
2. Installer via TestFlight
3. L'app demandera la permission notifications au premier lancement
4. Le token FCM sera genere et sauve en base
5. "Tester les notifications" fonctionnera

