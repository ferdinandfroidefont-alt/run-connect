

# Correction du Pipeline iOS — Compatibilité OpenSSL

## Problème identifié

L'erreur `pkcs12: Unrecognized flag legacy` provient du fait que :
- Le runner `macos-latest` utilise **LibreSSL** par défaut (pas OpenSSL)
- LibreSSL ne supporte pas le flag `-legacy` 
- Ce flag est disponible uniquement dans **OpenSSL 3.x**

## Solution

Installer OpenSSL 3 via Homebrew et l'utiliser explicitement pour la conversion du certificat P12.

---

## Modification du fichier

**Fichier : `.github/workflows/ios-appstore.yml`**

### Changements dans l'étape "Setup signing keychain"

1. Installer OpenSSL 3 via Homebrew
2. Utiliser le chemin complet vers OpenSSL 3 (`/opt/homebrew/opt/openssl@3/bin/openssl` ou `/usr/local/opt/openssl@3/bin/openssl`)
3. Convertir le P12 avec le flag `-legacy`

```yaml
- name: 🔐 Setup signing keychain
  env:
    IOS_CERTIFICATE_P12_BASE64: ${{ secrets.IOS_CERTIFICATE_P12_BASE64 }}
    IOS_CERTIFICATE_PASSWORD: ${{ secrets.IOS_CERTIFICATE_PASSWORD }}
    IOS_PROVISIONING_PROFILE_BASE64: ${{ secrets.IOS_PROVISIONING_PROFILE_BASE64 }}
  run: |
    set -e

    # Installer OpenSSL 3 (supporte le flag -legacy)
    brew install openssl@3
    OPENSSL_BIN=$(brew --prefix openssl@3)/bin/openssl

    # Créer keychain temporaire
    KEYCHAIN_NAME="build.keychain"
    KEYCHAIN_PASSWORD="temp_password_$(date +%s)"
    
    security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
    security default-keychain -s "$KEYCHAIN_NAME"
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
    security set-keychain-settings -t 3600 -u "$KEYCHAIN_NAME"
    
    # Importer certificat (decode PROPRE)
    printf '%s' "$IOS_CERTIFICATE_P12_BASE64" | base64 --decode > certificate_original.p12

    # ✅ TEST: vérifier que le .p12 + mot de passe matchent
    $OPENSSL_BIN pkcs12 -in certificate_original.p12 -info -noout -passin pass:"$IOS_CERTIFICATE_PASSWORD"

    # 🔄 Convertir le P12 vers un format compatible macOS (legacy algorithm)
    $OPENSSL_BIN pkcs12 -in certificate_original.p12 -out certificate.pem -nodes -passin pass:"$IOS_CERTIFICATE_PASSWORD"
    $OPENSSL_BIN pkcs12 -export -in certificate.pem -out certificate.p12 -passout pass:"$IOS_CERTIFICATE_PASSWORD" -legacy
    rm certificate.pem certificate_original.p12

    # Import dans keychain
    security import certificate.p12 -k "$KEYCHAIN_NAME" \
      -P "$IOS_CERTIFICATE_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security
    security set-key-partition-list -S apple-tool:,apple: \
      -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
    
    # Installer provisioning profile
    mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
    printf '%s' "$IOS_PROVISIONING_PROFILE_BASE64" | base64 --decode > profile.mobileprovision
    PROFILE_UUID=$(security cms -D -i profile.mobileprovision | \
      grep -A1 UUID | grep string | sed 's/.*<string>\(.*\)<\/string>/\1/')
    cp profile.mobileprovision \
      ~/Library/MobileDevice/Provisioning\ Profiles/$PROFILE_UUID.mobileprovision
```

---

## Résumé des changements

| Ligne | Avant | Après |
|-------|-------|-------|
| 49-50 | `set -e` | `set -e` + `brew install openssl@3` + définition `OPENSSL_BIN` |
| 64 | `openssl pkcs12 ...` | `$OPENSSL_BIN pkcs12 ...` |
| 68-69 | `openssl pkcs12 ...` | `$OPENSSL_BIN pkcs12 ... -legacy` |

---

## Résultat attendu

- OpenSSL 3 est installé dynamiquement sur le runner
- La conversion P12 utilise le flag `-legacy` correctement
- Le certificat est importé sans erreur "MAC verification failed"
- Le build iOS peut continuer normalement

