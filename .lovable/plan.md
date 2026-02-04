
# 🚨 Mise à jour vers Android 15 (API 35) pour Google Play

## Problème identifié

Google Play Console exige maintenant que toutes les applications ciblent **Android 15 (API 35)** depuis le 31 août 2025. Ton application cible actuellement **API 34**, ce qui :
- Bloque les nouvelles mises à jour sur le Play Store
- Empêche certains utilisateurs (comme ton ami avec le Galaxy S24) d'installer l'app

## Modifications à effectuer

### 1. Mettre à jour `android/variables.gradle`
Changer `targetSdkVersion` de 34 à 35 :
```gradle
targetSdkVersion = 35  // Android 15 (exigé par Google Play)
```

### 2. Mettre à jour `android-webview/app/build.gradle`
Ce fichier utilise des valeurs en dur (pas les variables). Il faut mettre à jour :
```gradle
compileSdk 35    // était 34
targetSdk 35     // était 34
versionCode 16   // incrémenter pour la nouvelle version
versionName "1.5.0"
```

### 3. Créer le dossier `android-webview/app/src/main/res/values-v35/`
Copier le fichier `styles.xml` pour Android 15+ avec l'opt-out de l'edge-to-edge obligatoire :
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="OptOutEdgeToEdgeEnforcement">
        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
        <item name="android:statusBarColor">@color/systemBarBlack</item>
        <item name="android:navigationBarColor">@color/systemBarBlack</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
    </style>
</resources>
```

### 4. Incrémenter la version dans `android/variables.gradle`
```gradle
versionCode = 16   // était 15
versionName = "1.5.0"  // était 1.4.0
```

---

## Détails techniques

### Pourquoi c'est nécessaire ?
- **Android 15 (API 35)** impose le mode "edge-to-edge" par défaut
- Sans l'opt-out (`windowOptOutEdgeToEdgeEnforcement`), les barres système deviendraient transparentes
- Le fichier `values-v35/styles.xml` permet de garder les barres noires

### Fichiers modifiés
| Fichier | Modification |
|---------|--------------|
| `android/variables.gradle` | targetSdkVersion 34 → 35, versionCode 15 → 16 |
| `android-webview/app/build.gradle` | compileSdk/targetSdk 34 → 35, version 1.0.0 → 1.5.0 |
| `android-webview/app/src/main/res/values-v35/styles.xml` | **Nouveau fichier** pour Android 15+ |

### Après l'implémentation
Tu devras :
1. Git pull le projet
2. Rebuild l'AAB via GitHub Actions
3. Uploader la nouvelle version sur Google Play Console
