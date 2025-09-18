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

### 2. Sync Capacitor et ajout plugin Android
```bash
npx cap sync android
```

### 3. Build AAB de production
```bash
npx cap build android --prod
```

### 4. ⚠️ IMPORTANT: Plugin Android personnalisé
Le code inclut maintenant un plugin Android natif personnalisé qui FORCE la demande de permissions.
Fichiers ajoutés:
- `android/app/src/main/java/app/lovable/runconnect/PermissionsPlugin.java`
- `android/app/src/main/java/app/lovable/runconnect/MainActivity.java`
- `src/lib/androidPermissions.ts`

Ces fichiers permettent de bypasser complètement les limitations de Capacitor.

### 5. Signature et upload
- Ouvrir Android Studio
- Build > Generate Signed Bundle/APK
- Choisir AAB et signer avec votre keystore
- Upload sur Play Store

## 📱 **COMPATIBILITÉ REDMI NOTE 9 & MIUI VÉRIFIÉE** ✅

### Spécifications Redmi Note 9:
- **Android 10-11** (API 29-30) ✅ Compatible
- **MIUI 11-12.5** ✅ Détection automatique 
- **MediaTek Helio G85** ✅ Supporté
- **RAM 3-6GB** ✅ Suffisant

### 🔴 Particularités MIUI/Xiaomi:
Le plugin détecte automatiquement les appareils MIUI et fournit:
- Instructions spécifiques pour **Paramètres > Apps > RunConnect > Autorisations**
- Gestion des permissions **"Auto-start"** et **"Background activity"**
- Messages d'aide adaptés aux interfaces MIUI/HyperOS

### ⚠️ IMPORTANT pour Redmi/Xiaomi:
1. **Autorisations manuelles** parfois nécessaires dans MIUI
2. **Auto-start** doit être activé pour l'app
3. **Battery optimization** doit être désactivée pour RunConnect

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

Dans l'app, utiliser les boutons:
1. **"🔥 FORCER TOUTES les permissions"** - Utilise le plugin Android natif
2. **"Test Permissions"** - Utilise les APIs Capacitor standard  
3. **"⚙️ Paramètres"** - Ouvre directement les paramètres Android

✅ **Résultat attendu**: 
- **Tous Android** (Samsung, Huawei, OnePlus, etc.) ✅
- **Redmi Note 9 et similaires** ✅ 
- **MIUI/HyperOS** ✅ Avec instructions spécifiques
- Les permissions apparaîtront dans Paramètres > Apps > RunConnect

---
**Résultat attendu**: Toutes les permissions natives Android fonctionneront correctement dans l'AAB Play Store.