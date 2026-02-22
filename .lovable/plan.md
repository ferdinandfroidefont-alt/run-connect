

## Faire fonctionner les notifications push sur iOS (App Store)

### Probleme actuel

Le code React (`usePushNotifications.tsx`) gere correctement iOS : il demande les permissions, appelle `PushNotifications.register()`, et sauvegarde le token APNs via Capacitor. **Mais** le pipeline CI/CD iOS (`.github/workflows/ios-appstore.yml`) ne configure pas Firebase ni les entitlements push, donc :

1. Le token APNs n'est jamais genere car Firebase n'est pas initialise
2. L'app n'a pas l'entitlement "Push Notifications" requis par Apple
3. Le fichier `GoogleService-Info.plist` n'est pas inclus dans le build

### Corrections a appliquer

#### 1. Ajouter `GoogleService-Info.plist` au pipeline iOS

Le fichier Firebase pour iOS doit etre injecte dans le build via un secret GitHub encode en base64 (`IOS_GOOGLE_SERVICE_INFO_BASE64`).

Ajouter une etape dans `.github/workflows/ios-appstore.yml` apres "Add iOS platform" :

```yaml
- name: Add GoogleService-Info.plist
  env:
    GOOGLE_SERVICE_INFO: ${{ secrets.IOS_GOOGLE_SERVICE_INFO_BASE64 }}
  run: |
    echo "$GOOGLE_SERVICE_INFO" | base64 --decode > ios/App/App/GoogleService-Info.plist
    echo "GoogleService-Info.plist added"
```

#### 2. Ajouter l'entitlement Push Notifications

Creer un fichier `App.entitlements` avec la capability push, injecte dans le build :

```yaml
- name: Configure Push Notification entitlements
  run: |
    cat > ios/App/App/App.entitlements << 'EOF'
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
      <key>aps-environment</key>
      <string>production</string>
    </dict>
    </plist>
    EOF

    # Ajouter le fichier entitlements dans les build settings Xcode
```

Puis mettre a jour le script Ruby de signing pour ajouter `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` dans les build settings.

#### 3. Ajouter le plugin Firebase dans le Podfile iOS

Capacitor utilise CocoaPods. Il faut ajouter le pod Firebase Messaging pour que le bridge natif fonctionne :

```yaml
- name: Add Firebase Messaging pod
  run: |
    cd ios/App
    # Ajouter le pod Firebase/Messaging au Podfile
    if ! grep -q "Firebase/Messaging" Podfile; then
      sed -i '' '/target .App. do/a\
        pod '\''Firebase\/Messaging'\''
      ' Podfile
    fi
```

#### 4. Initialiser Firebase dans AppDelegate.swift

Ajouter le code d'initialisation Firebase dans le AppDelegate iOS genere par Capacitor :

```yaml
- name: Configure AppDelegate for Firebase
  run: |
    DELEGATE="ios/App/App/AppDelegate.swift"
    # Ajouter import FirebaseCore et FirebaseCore.configure() dans application(_:didFinishLaunchingWithOptions:)
    sed -i '' 's/import UIKit/import UIKit\nimport FirebaseCore/' "$DELEGATE"
    sed -i '' '/super.application.*didFinishLaunchingWithOptions/a\
        FirebaseApp.configure()
    ' "$DELEGATE"
```

### Ce que l'utilisateur doit faire (hors Lovable)

1. **Dans Firebase Console** : creer une app iOS avec le bundle ID `com.ferdi.runconnect`, telecharger le `GoogleService-Info.plist`
2. **Dans Apple Developer Portal** : generer une cle APNs (.p8), puis l'uploader dans Firebase Console > Cloud Messaging > iOS
3. **Dans GitHub Secrets** : ajouter `IOS_GOOGLE_SERVICE_INFO_BASE64` (le fichier .plist encode en base64 : `base64 -i GoogleService-Info.plist`)

### Resume des modifications

| Fichier | Modification |
|---------|-------------|
| `.github/workflows/ios-appstore.yml` | Ajouter 4 etapes : GoogleService-Info.plist, entitlements push, pod Firebase/Messaging, init Firebase dans AppDelegate |
| Script Ruby de signing | Ajouter `CODE_SIGN_ENTITLEMENTS` dans les build settings |

### Ce qui fonctionne deja

- Le code React (`usePushNotifications.tsx`) gere correctement iOS : permission prompt, register, save token
- Le `capacitor.config.ts` a les `presentationOptions` pour iOS
- L'edge function `send-push-notification` utilise FCM v1 API qui supporte les tokens APNs via Firebase
- Le secret `FIREBASE_SERVICE_ACCOUNT_JSON` est deja configure

