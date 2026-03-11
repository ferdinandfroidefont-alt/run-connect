# 📱 Guide d'installation iOS pour RunConnect

## 🎯 Prérequis
- Mac avec Xcode installé
- Compte Apple Developer (gratuit pour test local, payant pour App Store)
- Projet exporté sur GitHub

---

## 📋 Étape 1 : Créer la structure iOS avec Capacitor

**Sur votre machine locale** (après avoir cloné le projet GitHub) :

```bash
# 1. Installer les dépendances
npm install

# 2. Build le projet web
npm run build

# 3. Ajouter la plateforme iOS
npx cap add ios

# 4. Synchroniser le projet
npx cap sync ios
```

**✅ Vérification :** Le dossier `ios/` doit être créé avec `ios/App/App.xcodeproj`

---

## 📋 Étape 2 : Configurer Firebase pour iOS

### 2.1 Créer l'app iOS dans Firebase Console

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner votre projet RunConnect
3. Cliquer sur **"Ajouter une application"** → **iOS**
4. Renseigner :
   - **Bundle ID :** `com.ferdi.runconnect` (⚠️ IMPORTANT: doit correspondre exactement à l'appId dans `capacitor.config.ts` et au workflow CI)
   - **Nom de l'app :** RunConnect
   - **App Store ID :** (laisser vide)
5. Cliquer sur **"Enregistrer l'application"**

### 2.2 Télécharger GoogleService-Info.plist

1. Dans Firebase Console, télécharger le fichier **`GoogleService-Info.plist`**
2. **Conserver ce fichier**, vous en aurez besoin à l'étape suivante

### 2.3 Activer Firebase Cloud Messaging

1. Dans Firebase Console → **Project Settings** → **Cloud Messaging**
2. Sous **iOS app configuration**, vérifier que l'app iOS est listée

---

## 📋 Étape 3 : Ajouter GoogleService-Info.plist dans Xcode

1. Ouvrir le projet dans Xcode :
   ```bash
   npx cap open ios
   ```

2. Dans le navigateur de fichiers Xcode (panneau de gauche), faire **clic droit sur le dossier `App`**

3. Sélectionner **"Add Files to App..."**

4. Choisir le fichier **`GoogleService-Info.plist`** téléchargé précédemment

5. **⚠️ IMPORTANT :** Cocher :
   - ✅ **"Copy items if needed"**
   - ✅ **"Add to targets: App"**

6. Cliquer sur **"Add"**

**✅ Vérification :** Le fichier `GoogleService-Info.plist` doit apparaître dans le dossier `App` dans Xcode

---

## 📋 Étape 4 : Configurer APNs (Apple Push Notification service)

### Option A : Clé APNs .p8 (Recommandé) ✅

1. Aller sur [Apple Developer Portal](https://developer.apple.com/account)

2. Naviguer vers **Certificates, Identifiers & Profiles** → **Keys**

3. Cliquer sur **"+"** pour créer une nouvelle clé

4. Configurer :
   - **Key Name :** RunConnect APNs Key
   - Cocher **"Apple Push Notifications service (APNs)"**

5. Cliquer sur **"Continue"** puis **"Register"**

6. **⚠️ IMPORTANT :** Télécharger le fichier `.p8` (vous ne pourrez le télécharger qu'une seule fois)

7. Noter :
   - **Key ID** (affiché sur la page)
   - **Team ID** (en haut à droite du portail Apple Developer)

8. Retourner dans **Firebase Console** → **Project Settings** → **Cloud Messaging** → **iOS app configuration**

9. Uploader la clé APNs :
   - Cliquer sur **"Upload"** dans la section **APNs Authentication Key**
   - Sélectionner le fichier `.p8`
   - Entrer le **Key ID**
   - Entrer le **Team ID**

10. Cliquer sur **"Upload"**

**✅ Vérification :** Dans Firebase Console, la section APNs doit afficher "APNs key uploaded successfully"

---

## 📋 Étape 5 : Configurer Info.plist (Permissions iOS)

1. Dans Xcode, ouvrir le fichier **`ios/App/App/Info.plist`**

2. Clic droit dans la zone de contenu → **"Open As"** → **"Source Code"**

3. Ajouter les permissions suivantes **entre les balises `<dict>` et `</dict>`** :

```xml
<!-- Permissions notifications push -->
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>

<!-- Permission géolocalisation -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>RunConnect a besoin d'accéder à votre position pour afficher les sessions d'entraînement à proximité et enregistrer vos parcours.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>RunConnect a besoin d'accéder à votre position en arrière-plan pour suivre vos sessions d'entraînement.</string>

<!-- Permission caméra -->
<key>NSCameraUsageDescription</key>
<string>RunConnect a besoin d'accéder à la caméra pour prendre des photos de profil.</string>

<!-- Permission galerie photo -->
<key>NSPhotoLibraryUsageDescription</key>
<string>RunConnect a besoin d'accéder à vos photos pour définir votre photo de profil.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>RunConnect a besoin d'accéder à vos photos pour enregistrer des images.</string>

<!-- Deep linking pour OAuth Google -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>app.runconnect</string>
        </array>
        <key>CFBundleURLName</key>
        <string>app.runconnect</string>
    </dict>
</array>

<!-- Autoriser OAuth externe (Google) -->
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>googlechrome</string>
    <string>googlechromes</string>
</array>
```

4. Sauvegarder le fichier (**Cmd + S**)

**✅ Vérification :** Le fichier Info.plist doit contenir toutes les clés ci-dessus

---

## 📋 Étape 6 : Configurer Google OAuth pour iOS dans Supabase

1. Aller dans **Supabase Dashboard** → **Authentication** → **Providers**

2. Cliquer sur **Google**

3. Faire défiler vers le bas jusqu'à la section **iOS settings**

4. Ajouter :
   - **iOS Bundle ID :** `app.runconnect`
   - **iOS URL Scheme :** `app.runconnect`

5. Cliquer sur **"Save"**

**✅ Vérification :** Les paramètres iOS doivent être sauvegardés dans Supabase

---

## 📋 Étape 7 : Compiler et tester sur simulateur iOS

1. Ouvrir le projet dans Xcode (si pas déjà ouvert) :
   ```bash
   npx cap open ios
   ```

2. Dans Xcode, sélectionner un simulateur :
   - En haut à gauche : **iPhone 15 Pro** (ou autre modèle récent)

3. Cliquer sur le bouton **▶️ Play** (ou **Cmd + R**)

4. **Attendre la compilation** (peut prendre quelques minutes la première fois)

5. Le simulateur iOS doit se lancer avec l'application RunConnect

### Tests de base sur simulateur :

- ✅ L'app se lance sans crash
- ✅ L'interface s'affiche correctement
- ✅ La connexion Google fonctionne (deep link de retour)
- ✅ Les permissions caméra/géolocalisation se demandent (popups iOS)

⚠️ **Note :** Les push notifications ne fonctionnent PAS sur simulateur iOS. Pour tester les notifications, vous devez utiliser un iPhone physique.

---

## 📋 Étape 8 : Tester sur iPhone physique (Recommandé)

### 8.1 Prérequis

- iPhone avec câble USB
- Compte Apple Developer configuré dans Xcode

### 8.2 Configuration du Signing

1. Dans Xcode, sélectionner le projet **App** dans le navigateur

2. Aller dans l'onglet **Signing & Capabilities**

3. Dans **Team**, sélectionner votre compte Apple Developer

4. Xcode doit automatiquement générer un provisioning profile

### 8.3 Installer sur iPhone

1. Connecter l'iPhone en USB

2. Déverrouiller l'iPhone et **faire confiance à l'ordinateur**

3. Dans Xcode, sélectionner votre iPhone dans la liste des devices (en haut à gauche)

4. Cliquer sur **▶️ Play** (ou **Cmd + R**)

5. Sur l'iPhone, aller dans **Réglages** → **Général** → **VPN et gestion de l'appareil** → Faire confiance au développeur

6. Retourner à l'écran d'accueil et lancer RunConnect

### Tests avancés sur iPhone physique :

- ✅ Push notifications (FCM + APNs)
- ✅ Géolocalisation GPS réelle
- ✅ Caméra + galerie photo
- ✅ OAuth Google (deep link natif)
- ✅ Contacts

---

## 🔧 Commandes utiles

```bash
# Synchroniser après modifications code
npx cap sync ios

# Ouvrir dans Xcode
npx cap open ios

# Copier les assets web vers iOS
npx cap copy ios

# Mettre à jour les pods (dépendances iOS)
cd ios/App && pod install && cd ../..

# Voir les logs de l'app iOS (dans Terminal pendant que l'app tourne)
xcrun simctl spawn booted log stream --predicate 'process == "RunConnect"'
```

---

## ✅ Checklist de vérification finale

### Configuration Capacitor
- [ ] Commande `npx cap add ios` exécutée avec succès
- [ ] Dossier `ios/` créé
- [ ] Fichier `capacitor.config.ts` contient la config iOS complète

### Configuration Firebase
- [ ] App iOS créée dans Firebase Console
- [ ] Bundle ID = `app.runconnect`
- [ ] `GoogleService-Info.plist` téléchargé
- [ ] `GoogleService-Info.plist` ajouté dans Xcode (avec "Copy items if needed")
- [ ] Clé APNs (.p8) générée
- [ ] Clé APNs uploadée dans Firebase Console

### Configuration Permissions
- [ ] `Info.plist` contient toutes les permissions (notifications, géolocalisation, caméra, photo)
- [ ] `CFBundleURLTypes` configuré pour le deep linking OAuth
- [ ] `LSApplicationQueriesSchemes` contient googlechrome et googlechromes

### Configuration OAuth
- [ ] Supabase Dashboard → iOS Bundle ID ajouté (`app.runconnect`)
- [ ] Supabase Dashboard → iOS URL Scheme configuré (`app.runconnect`)

### Tests
- [ ] Build iOS réussit dans Xcode
- [ ] App démarre sur simulateur sans crash
- [ ] Connexion Google fonctionne sur simulateur
- [ ] Permissions se demandent correctement sur simulateur
- [ ] (Optionnel) App testée sur iPhone physique
- [ ] (Optionnel) Push notifications testées sur iPhone physique

---

## 🚨 Problèmes courants

### Erreur : "GoogleService-Info.plist not found"
**Solution :** Vérifier que le fichier a bien été ajouté dans Xcode avec "Copy items if needed" coché

### Erreur : "No provisioning profiles found"
**Solution :** Dans Xcode → Signing & Capabilities → Team → sélectionner votre compte Apple Developer

### Erreur OAuth : "Invalid redirect_uri"
**Solution :** Vérifier que le iOS URL Scheme dans Supabase est bien `app.runconnect`

### Push notifications ne fonctionnent pas
**Solution :** Les push notifications ne fonctionnent PAS sur simulateur iOS. Tester sur un iPhone physique avec la clé APNs configurée

### L'app crash au démarrage
**Solution :** Vérifier les logs dans Xcode (Console en bas) pour identifier l'erreur précise

---

## 📚 Documentation de référence

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Firebase iOS Setup](https://firebase.google.com/docs/ios/setup)
- [APNs Configuration](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Supabase iOS Auth Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Apple Developer Portal](https://developer.apple.com/account)

---

## 🎉 Prochaines étapes

Une fois tous les tests réussis :

1. **Préparation App Store** (si souhaité) :
   - Configurer les provisioning profiles de distribution
   - Créer des screenshots iPhone (différentes tailles)
   - Remplir les métadonnées dans App Store Connect
   - Soumettre pour review Apple

2. **Optimisations iOS** :
   - Tester les performances sur différents modèles d'iPhone
   - Optimiser la taille de l'app (assets, images)
   - Ajouter des splash screens personnalisés

3. **Maintenance** :
   - Mettre à jour régulièrement Xcode
   - Surveiller les nouvelles versions iOS
   - Tester sur les nouvelles versions iOS beta
