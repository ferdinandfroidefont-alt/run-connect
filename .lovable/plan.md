

# Cause racine : GoogleService-Info.plist absent du bundle iOS

## Le problème

Le workflow CI (ligne 50) décode `GoogleService-Info.plist` vers `ios/App/App/GoogleService-Info.plist` sur le **filesystem**, mais **ne l'ajoute jamais au target Xcode** ("Copy Bundle Resources"). Au runtime, `[FIRApp configure]` cherche ce fichier dans le **main bundle** de l'app — il ne le trouve pas, retourne silencieusement sans erreur, et `Messaging.messaging().token()` ne génère jamais de token FCM.

C'est pourquoi APNs fonctionne (c'est Apple, indépendant de Firebase) mais FCM échoue.

## Correction

**Fichier** : `scripts/configure_ios_push.sh`

Ajouter une étape Ruby (après l'étape 3 existante, SafeFirebaseInit.m) qui ajoute `GoogleService-Info.plist` au target App dans les "Copy Bundle Resources" du projet Xcode :

```ruby
# Add GoogleService-Info.plist to Xcode target resources
plist_file = 'GoogleService-Info.plist'
unless app_target.resources_build_phase.files.any? { |f| f.file_ref&.path&.include?(plist_file) }
  file_ref = app_group.new_file(plist_file)
  app_target.resources_build_phase.add_file_reference(file_ref)
  puts "✅ #{plist_file} added to Copy Bundle Resources"
else
  puts "ℹ️ #{plist_file} already in resources"
end
```

Cette logique sera intégrée dans le bloc Ruby existant (lignes 83-119) qui ajoute déjà `SafeFirebaseInit.m` aux compile sources, pour réutiliser les mêmes variables `project`, `app_target`, `app_group`.

**Fichier** : `.github/workflows/ios-appstore.yml`

Ajouter une assertion après le décodage du plist (après ligne 52) pour valider que le `BUNDLE_ID` dans le plist correspond à `com.ferdi.runconnect` :

```bash
PLIST_BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :BUNDLE_ID" ios/App/App/GoogleService-Info.plist)
if [ "$PLIST_BUNDLE_ID" != "com.ferdi.runconnect" ]; then
  echo "❌ FATAL: GoogleService-Info.plist BUNDLE_ID='$PLIST_BUNDLE_ID' ≠ 'com.ferdi.runconnect'"
  exit 1
fi
echo "✅ GoogleService-Info.plist BUNDLE_ID verified: $PLIST_BUNDLE_ID"
```

## Résumé

| Vérification demandée | Statut |
|---|---|
| 1. FirebaseApp.configure (SafeFirebaseInit) | OK — mais échoue silencieusement car plist absent du bundle |
| 2. Messaging.messaging().delegate | OK — configuré dans configure_ios_push.sh |
| 3. Token APNs → Firebase Messaging | OK — `Messaging.messaging().apnsToken = deviceToken` présent |
| 4. didReceiveRegistrationToken → WebView | OK — bridge avec retry et traceId |
| 5. **GoogleService-Info.plist dans le target** | **MANQUANT — c'est le bug** |
| 6. Firebase/Messaging pod | OK — ajouté dans le workflow |
| 7. Bridge natif → WebView JS | OK — fcmTokenReady event dispatch |

