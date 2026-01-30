
# Pipeline CI/CD iOS App Store — Publication Automatique via GitHub Actions

## Vue d'ensemble

Ce plan met en place un pipeline GitHub Actions complet qui :
- Build l'application iOS (Capacitor WebView) sur un runner macOS
- Signe automatiquement l'application avec vos certificats Apple
- Upload directement sur TestFlight/App Store Connect
- Fonctionne **sans Mac local** — tout est automatisé

---

## Architecture de la solution

```text
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (macos-latest)                │
├─────────────────────────────────────────────────────────────────┤
│  1. Checkout code                                               │
│  2. Setup Node.js + Install dependencies                        │
│  3. Build web app (npm run build → dist/)                       │
│  4. Generate iOS project (npx cap add ios + sync)               │
│  5. Configure signing (certificates + provisioning)             │
│  6. Build IPA (xcodebuild archive + export)                     │
│  7. Upload to TestFlight (Fastlane pilot)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Secrets GitHub requis (à ajouter dans le repo)

| Secret | Description |
|--------|-------------|
| `ASC_KEY_ID` | App Store Connect API Key ID |
| `ASC_ISSUER_ID` | App Store Connect Issuer ID |
| `ASC_KEY_P8` | Contenu du fichier .p8 (clé API) encodé en base64 |
| `APPLE_TEAM_ID` | Team ID Apple Developer (ex: ABC123XYZ) |
| `IOS_CERTIFICATE_P12_BASE64` | Certificat de distribution .p12 encodé en base64 |
| `IOS_CERTIFICATE_PASSWORD` | Mot de passe du certificat .p12 |
| `IOS_PROVISIONING_PROFILE_BASE64` | Profil de provisioning App Store encodé en base64 |

---

## Fichiers à créer

### 1. Workflow GitHub Actions

**Fichier : `.github/workflows/ios-appstore.yml`**

Ce workflow :
- Tourne sur `macos-latest` (Xcode 16.x préinstallé)
- Installe Node.js et les dépendances
- Build l'app web avec Vite
- Génère le projet iOS avec Capacitor
- Configure le signing via keychain temporaire
- Archive et exporte l'IPA
- Upload sur TestFlight avec Fastlane

### 2. Configuration Fastlane

**Fichier : `fastlane/Fastfile`**

Lane `beta` qui :
- Configure l'API Key App Store Connect
- Upload l'IPA sur TestFlight
- Skip l'attente du processing (optionnel)

**Fichier : `fastlane/Appfile`**

Contient le bundle ID et le team ID

### 3. Configuration iOS

**Fichier : `ios/App/App/Info.plist`** (patches)

Permissions requises pour l'App Store :
- Géolocalisation
- Caméra
- Notifications push
- Deep linking OAuth

---

## Détails techniques

### Workflow complet `.github/workflows/ios-appstore.yml`

```yaml
name: Build & Upload iOS to TestFlight

on:
  workflow_dispatch:
    inputs:
      build_number:
        description: 'Build number (auto-increment if empty)'
        required: false
        default: ''

jobs:
  build-ios:
    runs-on: macos-latest
    timeout-minutes: 60

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: ⚙️ Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🔨 Build web app
        run: npm run build

      - name: 📱 Add iOS platform
        run: |
          npx cap add ios || true
          npx cap sync ios

      - name: 🔧 Update Bundle Identifier
        run: |
          # Modifier le bundle ID dans le projet Xcode
          sed -i '' 's/app.runconnect/com.ferdi.runconnect/g' \
            ios/App/App.xcodeproj/project.pbxproj

      - name: 🔐 Setup signing keychain
        env:
          IOS_CERTIFICATE_P12_BASE64: ${{ secrets.IOS_CERTIFICATE_P12_BASE64 }}
          IOS_CERTIFICATE_PASSWORD: ${{ secrets.IOS_CERTIFICATE_PASSWORD }}
          IOS_PROVISIONING_PROFILE_BASE64: ${{ secrets.IOS_PROVISIONING_PROFILE_BASE64 }}
        run: |
          # Créer keychain temporaire
          KEYCHAIN_NAME="build.keychain"
          KEYCHAIN_PASSWORD="temp_password_$(date +%s)"
          
          security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
          security default-keychain -s "$KEYCHAIN_NAME"
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
          security set-keychain-settings -t 3600 -u "$KEYCHAIN_NAME"
          
          # Importer certificat
          echo "$IOS_CERTIFICATE_P12_BASE64" | base64 --decode > certificate.p12
          security import certificate.p12 -k "$KEYCHAIN_NAME" \
            -P "$IOS_CERTIFICATE_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security
          security set-key-partition-list -S apple-tool:,apple: \
            -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
          
          # Installer provisioning profile
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          echo "$IOS_PROVISIONING_PROFILE_BASE64" | base64 --decode > profile.mobileprovision
          PROFILE_UUID=$(security cms -D -i profile.mobileprovision | \
            grep -A1 UUID | grep string | sed 's/.*<string>\(.*\)<\/string>/\1/')
          cp profile.mobileprovision \
            ~/Library/MobileDevice/Provisioning\ Profiles/$PROFILE_UUID.mobileprovision

      - name: 🏗️ Build iOS archive
        run: |
          cd ios/App
          
          xcodebuild archive \
            -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            -destination "generic/platform=iOS" \
            CODE_SIGN_STYLE=Manual \
            DEVELOPMENT_TEAM="${{ secrets.APPLE_TEAM_ID }}" \
            CODE_SIGN_IDENTITY="Apple Distribution" \
            PROVISIONING_PROFILE_SPECIFIER="RunConnect AppStore"

      - name: 📦 Export IPA
        run: |
          cd ios/App
          
          cat > ExportOptions.plist << EOF
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
            "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>method</key>
            <string>app-store</string>
            <key>teamID</key>
            <string>${{ secrets.APPLE_TEAM_ID }}</string>
            <key>uploadSymbols</key>
            <true/>
            <key>compileBitcode</key>
            <false/>
          </dict>
          </plist>
          EOF
          
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportPath build/ipa \
            -exportOptionsPlist ExportOptions.plist

      - name: 💎 Setup Ruby & Fastlane
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: 📤 Upload to TestFlight
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_P8: ${{ secrets.ASC_KEY_P8 }}
        run: |
          # Décoder la clé API
          echo "$ASC_KEY_P8" | base64 --decode > AuthKey.p8
          
          gem install fastlane
          
          fastlane pilot upload \
            --api_key_path AuthKey.p8 \
            --ipa ios/App/build/ipa/App.ipa \
            --skip_waiting_for_build_processing true

      - name: 🧹 Cleanup
        if: always()
        run: |
          security delete-keychain build.keychain || true
          rm -f certificate.p12 profile.mobileprovision AuthKey.p8
```

### Configuration Fastlane

**`fastlane/Fastfile`** :
```ruby
default_platform(:ios)

platform :ios do
  desc "Upload to TestFlight"
  lane :beta do
    api_key = app_store_connect_api_key(
      key_id: ENV["ASC_KEY_ID"],
      issuer_id: ENV["ASC_ISSUER_ID"],
      key_filepath: "AuthKey.p8",
      duration: 1200,
      in_house: false
    )
    
    upload_to_testflight(
      api_key: api_key,
      skip_waiting_for_build_processing: true,
      ipa: "ios/App/build/ipa/App.ipa"
    )
  end
end
```

**`fastlane/Appfile`** :
```ruby
app_identifier("com.ferdi.runconnect")
apple_id("votre-email@example.com")
team_id(ENV["APPLE_TEAM_ID"])
```

**`Gemfile`** (à la racine) :
```ruby
source "https://rubygems.org"
gem "fastlane"
```

---

## Mise à jour `capacitor.config.ts`

Modifier le fichier pour utiliser le bundle ID iOS demandé :

```typescript
const config: CapacitorConfig = {
  appId: 'com.ferdi.runconnect', // Changé pour iOS
  appName: 'RunConnect',
  webDir: 'dist',
  // ... reste de la config
};
```

---

## Prérequis Apple Developer (à faire manuellement)

### 1. Créer l'App ID
Dans Apple Developer Portal :
- Identifiers → App IDs → (+)
- Bundle ID : `com.ferdi.runconnect`
- Capabilities : Push Notifications, Sign In with Apple (si besoin)

### 2. Créer le certificat de distribution
- Certificates → (+)
- Apple Distribution
- Télécharger et exporter en .p12

### 3. Créer le profil de provisioning
- Profiles → (+)
- App Store Distribution
- Sélectionner l'App ID et le certificat
- Télécharger

### 4. Créer l'API Key App Store Connect
- App Store Connect → Users and Access → Keys
- (+) Créer une clé avec rôle "App Manager"
- Télécharger le .p8

### 5. Créer l'app dans App Store Connect
- My Apps → (+)
- Bundle ID : `com.ferdi.runconnect`
- Nom : RunConnect

---

## Encodage des secrets pour GitHub

```bash
# Certificat .p12
base64 -i certificate.p12 | pbcopy

# Profil de provisioning
base64 -i profile.mobileprovision | pbcopy

# Clé API .p8
base64 -i AuthKey_XXXXXXX.p8 | pbcopy
```

---

## Structure finale des fichiers

```
.github/
└── workflows/
    ├── build-aab.yml          # Android (existant)
    └── ios-appstore.yml       # iOS (nouveau)

fastlane/
├── Appfile                    # Nouveau
└── Fastfile                   # Nouveau

Gemfile                        # Nouveau
capacitor.config.ts            # Modifié (bundle ID iOS)
```

---

## Flux de publication

```text
1. Développeur fait un push ou déclenche manuellement le workflow
   ↓
2. GitHub Actions (macos-latest) démarre
   ↓
3. Build web app (Vite → dist/)
   ↓
4. Génère projet iOS (Capacitor)
   ↓
5. Configure signing (keychain + certificats)
   ↓
6. Build archive Xcode
   ↓
7. Export IPA (méthode app-store)
   ↓
8. Upload TestFlight (Fastlane pilot)
   ↓
9. Build disponible dans App Store Connect !
```

---

## Résultat attendu

- **Aucun Mac nécessaire** pour publier
- **Workflow manuel** (workflow_dispatch) déclenché depuis GitHub
- **Upload automatique** sur TestFlight
- **Compatible** avec la révision Apple App Store
- **Parallèle** au workflow Android existant
