# 🚀 Instructions de déploiement AAB pour RunConnect

## PROBLÈME RÉSOLU: Permissions natives Android

Le problème était que l'AAB utilisait l'URL Lovable au lieu des fichiers locaux, empêchant les permissions natives de fonctionner.

## ✅ Solution appliquée

1. **Config Capacitor corrigée** : Le `server.url` est désormais commenté dans `capacitor.config.ts`
2. **Permissions Android déclarées** : Toutes les permissions sont dans `AndroidManifest.xml`
3. **APIs forcées** : Le code force l'utilisation des APIs Capacitor natives

## 📱 Étapes de déploiement

### 1. Export et build local
```bash
# Export depuis Lovable vers GitHub
# Git pull du projet
npm install
npm run build
```

### 2. Sync Capacitor
```bash
npx cap sync android
```

### 3. Build AAB de production
```bash
npx cap build android --prod
```

### 4. Signature et upload
- Ouvrir Android Studio
- Build > Generate Signed Bundle/APK
- Choisir AAB et signer avec votre keystore
- Upload sur Play Store

## 🔥 Permissions qui fonctionneront

- ✅ **Géolocalisation**: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- ✅ **Caméra/Galerie**: `CAMERA`, `READ_MEDIA_IMAGES`
- ✅ **Contacts**: `READ_CONTACTS`
- ✅ **Notifications push**: Configurées automatiquement

## ⚠️ IMPORTANT

- Ne PAS réactiver le `server.url` pour les builds de production
- Le garder uniquement pour le développement avec live-reload
- Les permissions natives ne fonctionnent QUE avec les fichiers locaux, pas avec l'URL Lovable

## 🧪 Test des permissions

Dans l'app, utiliser le bouton "Test Permissions" pour vérifier que:
1. Les popups de permissions Android apparaissent
2. Les permissions sont visibles dans Paramètres > Apps > RunConnect
3. Les fonctionnalités géolocalisation et galerie fonctionnent

---
**Résultat attendu**: Toutes les permissions natives Android fonctionneront correctement dans l'AAB Play Store.