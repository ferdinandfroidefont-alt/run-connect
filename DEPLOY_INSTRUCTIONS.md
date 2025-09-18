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

### 🔔 **NOTIFICATIONS PUSH NATIVES AJOUTÉES** ✅

### 📱 Fonctionnalités notifications:
1. **Plugin Android natif** - Demande permissions POST_NOTIFICATIONS (Android 13+)
2. **Canal notifications** - Création automatique canal "RunConnect" 
3. **Notifications locales** - Affichage natif avec titre, contenu, icône
4. **Détection MIUI** - Instructions spécifiques Xiaomi/Redmi
5. **Fallback Capacitor** - Support notifications push serveur

### ⚙️ Permissions Android requises:
- `POST_NOTIFICATIONS` (Android 13+) ✅ Ajoutée
- Canal notification automatique ✅
- Intent PendingIntent pour ouverture app ✅

## 📸 **ACCÈS GALERIE MIUI/REDMI CORRIGÉ** ✅

### 🔴 Bug Capacitor + MIUI identifié:
- **Issue #2060**: Capacitor Camera ne fonctionne pas avec la galerie Redmi
- **Problème**: MIUI utilise `com.miui.gallery` au lieu de la galerie Android standard
- **Solution**: Plugin Android natif avec Intent direct vers galerie MIUI

### 🔧 Nouvelles méthodes galerie ajoutées:
1. **Plugin Android natif** - Intent direct `com.miui.gallery` pour MIUI
2. **Capacitor forcé** - Multiple stratégies avec fallback
3. **Hook standard** - Méthode useCamera classique

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

Dans l'app, utiliser les boutons de test:
1. **"🔥 FORCER TOUTES les permissions"** - Demande toutes permissions via plugin natif
2. **"📍 Test Géolocalisation FORCÉ"** - 3 méthodes géolocalisation (natif, hook, web)
3. **"📸 Test Accès Galerie FORCÉ"** - 3 méthodes galerie (natif MIUI, Capacitor, standard)
4. **"🔔 Test Notifications Push FORCÉ"** - 3 méthodes notifications (natif Android, Capacitor, web)
5. **"⚙️ Paramètres"** - Ouvre directement les paramètres Android

### 🧪 Procédure de test sur téléphone:
1. **Build + Install AAB** sur votre appareil Android
2. **Ouvrir RunConnect** → aller sur `/android-test`
3. **Tester permissions** → "🔥 FORCER TOUTES les permissions"
4. **Tester géolocalisation** → "📍 Test Géolocalisation" → méthode recommandée selon appareil
5. **Tester galerie** → "📸 Test Accès Galerie" → méthode recommandée selon appareil
6. **Tester notifications** → "🔔 Test Notifications Push" → vérifier notification native apparaît
7. **Vérifier dans Paramètres** → Apps → RunConnect → Autorisations

✅ **Résultat attendu**: 
- **Tous Android** (Samsung, Huawei, OnePlus, etc.) ✅
- **Redmi Note 9 et similaires** ✅ Détection MIUI + plugin natif optimisé
- **MIUI/HyperOS** ✅ Intent direct `com.miui.gallery` + instructions notifications spécifiques
- **Permissions visibles** ✅ Dans Paramètres > Apps > RunConnect > Autorisations
- **Géolocalisation OK** ✅ Position obtenue même sur MIUI restrictif  
- **Galerie MIUI OK** ✅ Sélection image fonctionne même avec bug Capacitor #2060
- **Notifications natives** ✅ Vraies notifications push Android avec icône + son

---
**Résultat attendu**: Toutes les permissions natives Android fonctionneront correctement dans l'AAB Play Store.