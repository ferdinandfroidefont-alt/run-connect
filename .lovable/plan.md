

# Correction du Pipeline iOS — Signing ciblé uniquement sur App

## Problèmes identifiés

### Problème 1 : xcconfig appliqué globalement
L'option `-xcconfig` dans xcodebuild applique les build settings à **tous les targets** du workspace, y compris les CocoaPods qui ne supportent pas le provisioning profiles.

### Problème 2 : Profil non trouvé
L'erreur `No profile for team 'XXX' matching 'RunConnect AppStore' found` indique que le profil n'est pas correctement associé au projet.

---

## Solution

Au lieu d'utiliser `-xcconfig`, on va :
1. **Modifier directement le `project.pbxproj`** pour configurer le signing uniquement sur le target App
2. **Utiliser l'UUID du profil** au lieu du nom (plus fiable)
3. **Ne pas passer de settings de signing** sur la ligne de commande xcodebuild

---

## Modifications du fichier `.github/workflows/ios-appstore.yml`

### Étape 1 : Exporter l'UUID du profil (déjà fait)

On conserve l'extraction de `PROFILE_UUID` dans l'étape keychain.

### Étape 2 : Nouvelle étape pour configurer le signing dans project.pbxproj

Ajouter une étape qui modifie le fichier `project.pbxproj` avec `sed` pour :
- Définir `CODE_SIGN_STYLE = Manual` uniquement pour le target App
- Définir `DEVELOPMENT_TEAM`
- Définir `CODE_SIGN_IDENTITY = Apple Distribution`
- Définir `PROVISIONING_PROFILE_SPECIFIER` avec le nom du profil

```yaml
- name: 🔧 Configure App signing in project.pbxproj
  env:
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: |
    cd ios/App
    
    # Utiliser Ruby pour modifier le project.pbxproj de manière ciblée
    ruby << 'RUBY_SCRIPT'
    require 'xcodeproj'
    
    project_path = 'App.xcodeproj'
    project = Xcodeproj::Project.open(project_path)
    
    # Trouver le target "App"
    app_target = project.targets.find { |t| t.name == 'App' }
    
    if app_target
      app_target.build_configurations.each do |config|
        config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
        config.build_settings['DEVELOPMENT_TEAM'] = ENV['APPLE_TEAM_ID']
        config.build_settings['CODE_SIGN_IDENTITY'] = 'Apple Distribution'
        config.build_settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'Apple Distribution'
        config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = 'RunConnect AppStore'
      end
      
      project.save
      puts "✅ Signing configured for App target"
    else
      puts "❌ App target not found!"
      exit 1
    end
    RUBY_SCRIPT
```

### Étape 3 : Build sans xcconfig ni build settings de signing

```yaml
- name: 🏗️ Build iOS archive
  run: |
    cd ios/App
    
    xcodebuild archive \
      -workspace App.xcworkspace \
      -scheme App \
      -configuration Release \
      -archivePath build/App.xcarchive \
      -destination "generic/platform=iOS" \
      COMPILER_INDEX_STORE_ENABLE=NO
```

---

## Workflow complet mis à jour

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
        run: npm ci --legacy-peer-deps

      - name: 🔨 Build web app
        run: npm run build

      - name: 📱 Add iOS platform
        run: |
          npx cap add ios || true
          npx cap sync ios

      - name: 🔧 Update Bundle Identifier
        run: |
          sed -i '' 's/app.lovable.[^"]*\|io\.ionic\.starter/com.ferdi.runconnect/g' \
            ios/App/App.xcodeproj/project.pbxproj

      - name: 💎 Setup Ruby & xcodeproj gem
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'

      - name: 📦 Install xcodeproj gem
        run: gem install xcodeproj

      - name: 🔐 Setup signing keychain
        env:
          IOS_CERTIFICATE_P12_BASE64: ${{ secrets.IOS_CERTIFICATE_P12_BASE64 }}
          IOS_CERTIFICATE_PASSWORD: ${{ secrets.IOS_CERTIFICATE_PASSWORD }}
          IOS_PROVISIONING_PROFILE_BASE64: ${{ secrets.IOS_PROVISIONING_PROFILE_BASE64 }}
        run: |
          set -e

          brew install openssl@3
          OPENSSL_BIN=$(brew --prefix openssl@3)/bin/openssl

          KEYCHAIN_NAME="build.keychain"
          KEYCHAIN_PASSWORD="temp_password_$(date +%s)"
          
          security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
          security default-keychain -s "$KEYCHAIN_NAME"
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
          security set-keychain-settings -t 3600 -u "$KEYCHAIN_NAME"
          
          printf '%s' "$IOS_CERTIFICATE_P12_BASE64" | base64 --decode > certificate_original.p12
          $OPENSSL_BIN pkcs12 -in certificate_original.p12 -info -noout -passin pass:"$IOS_CERTIFICATE_PASSWORD"
          $OPENSSL_BIN pkcs12 -in certificate_original.p12 -out certificate.pem -nodes -passin pass:"$IOS_CERTIFICATE_PASSWORD"
          $OPENSSL_BIN pkcs12 -export -in certificate.pem -out certificate.p12 -passout pass:"$IOS_CERTIFICATE_PASSWORD" -legacy
          rm certificate.pem certificate_original.p12

          security import certificate.p12 -k "$KEYCHAIN_NAME" \
            -P "$IOS_CERTIFICATE_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security
          security set-key-partition-list -S apple-tool:,apple: \
            -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
          
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          printf '%s' "$IOS_PROVISIONING_PROFILE_BASE64" | base64 --decode > profile.mobileprovision
          
          PROFILE_UUID=$(security cms -D -i profile.mobileprovision | \
            grep -A1 UUID | grep string | sed 's/.*<string>\(.*\)<\/string>/\1/')
          echo "PROFILE_UUID=$PROFILE_UUID" >> $GITHUB_ENV
          
          cp profile.mobileprovision \
            ~/Library/MobileDevice/Provisioning\ Profiles/$PROFILE_UUID.mobileprovision

      - name: 🔧 Configure App signing
        env:
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          cd ios/App
          
          ruby << 'RUBY_SCRIPT'
          require 'xcodeproj'
          
          project_path = 'App.xcodeproj'
          project = Xcodeproj::Project.open(project_path)
          
          app_target = project.targets.find { |t| t.name == 'App' }
          
          if app_target
            app_target.build_configurations.each do |config|
              config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
              config.build_settings['DEVELOPMENT_TEAM'] = ENV['APPLE_TEAM_ID']
              config.build_settings['CODE_SIGN_IDENTITY'] = 'Apple Distribution'
              config.build_settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'Apple Distribution'
              config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = 'RunConnect AppStore'
            end
            
            project.save
            puts "✅ Signing configured for App target"
          else
            puts "❌ App target not found!"
            exit 1
          end
          RUBY_SCRIPT

      - name: 🏗️ Build iOS archive
        run: |
          cd ios/App
          
          xcodebuild archive \
            -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            -destination "generic/platform=iOS" \
            COMPILER_INDEX_STORE_ENABLE=NO

      - name: 📦 Export IPA
        env:
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          cd ios/App
          
          cat > ExportOptions.plist << EOF
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>method</key>
            <string>app-store</string>
            <key>teamID</key>
            <string>${APPLE_TEAM_ID}</string>
            <key>uploadSymbols</key>
            <true/>
            <key>compileBitcode</key>
            <false/>
            <key>signingStyle</key>
            <string>manual</string>
            <key>provisioningProfiles</key>
            <dict>
              <key>com.ferdi.runconnect</key>
              <string>RunConnect AppStore</string>
            </dict>
          </dict>
          </plist>
          EOF
          
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportPath build/ipa \
            -exportOptionsPlist ExportOptions.plist

      - name: 📤 Upload to TestFlight
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_P8: ${{ secrets.ASC_KEY_P8 }}
        run: |
          printf '%s' "$ASC_KEY_P8" | base64 --decode > AuthKey.p8
          
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

---

## Résumé des changements

| Aspect | Avant | Après |
|--------|-------|-------|
| Méthode de signing | xcconfig global | Ruby xcodeproj ciblé |
| Targets affectés | Tous (Pods inclus) | App uniquement |
| Outil utilisé | sed + xcconfig | gem xcodeproj |
| xcodebuild | Avec -xcconfig | Sans settings de signing |

---

## Pourquoi ça fonctionne maintenant

1. **xcodeproj gem** modifie uniquement le target "App" dans le fichier `.xcodeproj`
2. **Les Pods restent en automatic signing** (pas de modification)
3. **xcodebuild** n'a plus besoin de forcer des settings globaux
4. **Le profil est correctement lié** car on utilise le même nom dans le project.pbxproj

