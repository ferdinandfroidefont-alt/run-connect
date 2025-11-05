# ✅ Corrections Complètes du Système de Notifications Push

## 📝 Modifications Effectuées (versionCode 127)

### 🎯 Problèmes Résolus
1. ✅ **Double demande de permission POST_NOTIFICATIONS** (auto + manuelle)
2. ✅ **Bouton "Activer notifications" redondant** (supprimé)
3. ✅ **Double appel à `PushNotifications.register()`** (flag global ajouté)
4. ✅ **TestLocalNotificationButton non fonctionnel** (méthode ajoutée)
5. ✅ **Re-calcul inutile de `isNative`** (supprimé)
6. ✅ **Logique de token fragmentée** (centralisée)
7. ✅ **Messages d'erreur imprécis** (améliorés)

---

## 📂 Fichiers Modifiés

### 1️⃣ `MainActivity.java`

#### ✅ Supprimé
- Méthode `requestNotificationPermissions()` de AndroidBridge (lignes 413-445)
- Traitement du code 8888 dans `onRequestPermissionsResult` (lignes 476-490)

#### ✅ Ajouté
- Méthode `sendTestNotification(String title, String message)` dans AndroidBridge
  - Envoie une notification locale Android native
  - Dispatche événement `testNotificationSent` avec succès/échec
  - Utilisée par `TestLocalNotificationButton`

#### ✅ Conservé
- Demande AUTO de `POST_NOTIFICATIONS` au démarrage (ligne 304-318)
- Traitement du code 9999 dans `onRequestPermissionsResult` (ligne 461-473)

---

### 2️⃣ `usePushNotifications.tsx`

#### ✅ Supprimé
- Fonction `requestNativeNotifications()` (102 lignes) → Obsolète
- Re-calcul de `isNative` dans `testNotification()` → Utilise directement la variable d'état

#### ✅ Ajouté
- **Fonction `ensureTokenRegistered()`** : Centralise la logique d'enregistrement FCM
  - Vérifie token en base
  - Configure listeners si nécessaire
  - Appelle `PushNotifications.register()` UNE SEULE FOIS
  - Attend le token (max 5s)
  - Flag global `window.__fcmRegistering` pour éviter les appels simultanés

#### ✅ Modifié
- **`requestPermissions()`** : Simplifié, ne fait plus de demande manuelle
  - Vérifie l'état Android injecté
  - Appelle `ensureTokenRegistered()` si permissions OK
  - Affiche message informatif si permissions manquantes
  - Ne demande PLUS la permission (demande AUTO au démarrage uniquement)

- **`testNotification()`** : Messages d'erreur plus précis
  - Distingue "permissions manquantes" vs "token Firebase absent"
  - Vérifie permissions via `PushNotifications.checkPermissions()`
  - Messages adaptés selon le type d'erreur

---

### 3️⃣ `NotificationManager.tsx`

#### ✅ Modifié
- **Section "Permissions non accordées"** (lignes 220-247)
  - Supprimé le bouton "Activer les notifications"
  - Ajouté message informatif : "Demande automatique au démarrage"
  - Conservé boutons "Vérifier le statut" et "Paramètres Android"
  - Affichage d'un encadré bleu explicatif

#### ✅ Conservé
- Boutons "Tester" (edge function FCM)
- Bouton "Test notification locale" (AndroidBridge)
- Bouton "Diagnostic" (vérification token en base)
- Bouton "Rafraîchir" (recheck permissions)

---

### 4️⃣ `build-aab.yml`

#### ✅ Modifié
- `versionCode` : 126 → **127**
- Permet de forcer la réinstallation pour tester les corrections

---

## 🔄 Flux Fonctionnel Final

### 1️⃣ Premier Lancement (Installation)
```
1. App démarre
2. MainActivity.onCreate() → Popup AUTO POST_NOTIFICATIONS (code 9999)
3. User accepte → Événement "androidNotificationPermissionGranted"
4. usePushNotifications écoute l'événement
5. setupPushListeners() configuré
6. PushNotifications.register() appelé
7. Listener "registration" reçoit le token FCM
8. Token sauvegardé en base via savePushToken()
9. ✅ Notifications opérationnelles
```

### 2️⃣ Lancements Suivants
```
1. App démarre
2. Permissions déjà accordées (pas de popup)
3. usePushNotifications.initializePushNotifications() :
   - Vérifie permissions : OK ✅
   - Vérifie token en base : OUI ✅
   - Charge le token dans l'état React
4. ✅ Notifications fonctionnent directement
```

### 3️⃣ Test Notification PUSH (Edge Function)
```
1. User clique "Tester notification"
2. testNotification() vérifie :
   - isNative : OUI ✅
   - Token FCM : OUI ✅
3. Appel edge function "send-push-notification"
4. Edge function génère JWT Firebase
5. Envoi notification FCM via API Google
6. Notification apparaît dans la barre Android
7. ✅ User reçoit la notification
```

### 4️⃣ Test Notification LOCALE (AndroidBridge)
```
1. User clique "Test notification locale"
2. TestLocalNotificationButton.sendTestNotification()
3. Appel AndroidBridge.sendTestNotification(title, message)
4. MainActivity crée notification Android native
5. NotificationManager.notify() affiche la notification
6. Événement "testNotificationSent" dispatché
7. ✅ Notification locale affichée immédiatement
```

---

## 🧪 Validation Post-Implémentation

### Étape 1 : Build et Installation
```bash
# Build AAB versionCode 127
git commit -am "fix: corrections système notifications (v127)"
git push

# Attendre le workflow GitHub Actions
# Télécharger app-release.aab

# Sur appareil Android
adb install -r app-release.aab
# OU
# Désinstaller complètement l'ancienne version
# Installer la nouvelle version
```

### Étape 2 : Test Premier Lancement
```
✅ Popup AUTO POST_NOTIFICATIONS s'affiche au démarrage
✅ Accepter la permission
✅ Vérifier dans Paramètres > Notifications : "Activées" (badge vert)
✅ Ouvrir console et chercher :
   - "[INIT] Initialisation système de notifications..."
   - "[REGISTRATION] Token FCM reçu !"
   - "Token sauvegardé avec succès"
```

### Étape 3 : Vérifier Token en Base
```sql
SELECT user_id, push_token, push_token_platform, notifications_enabled 
FROM profiles 
WHERE user_id = 'YOUR_USER_ID';
```
**Résultat attendu** :
- `push_token` : Chaîne de ~160 caractères
- `push_token_platform` : "android"
- `notifications_enabled` : `true`

### Étape 4 : Test Notification PUSH
```
1. Paramètres > Notifications > "Tester notification"
2. Console client : "🧪 [TEST] Sending test notification..."
3. Logs Edge Function (Supabase) :
   - "[ENTRY] Edge function called"
   - "[FCM] Result: ✅ SUCCESS"
4. ✅ Notification apparaît dans la barre Android
```

### Étape 5 : Test Notification LOCALE
```
1. Paramètres > Notifications > "Test notification locale"
2. Console client : "🔔 [TEST] Envoi notification test..."
3. Logs Android (adb logcat) : "✅ [TEST] Notification test envoyée"
4. ✅ Notification locale affichée immédiatement
```

### Étape 6 : Test Relancement App
```
1. Fermer complètement l'app
2. Relancer
3. ✅ Aucune popup (permission déjà OK)
4. Paramètres > Notifications > Statut = "Activées"
5. ✅ Notifications fonctionnent directement
```

---

## 🔍 Diagnostic en Cas de Problème

### ❌ Token Non Sauvegardé en Base
**Logs à chercher** :
- `[REGISTRATION]` : Événement Firebase reçu ?
- `[FCM]` : Erreur lors de l'enregistrement ?
- `[INIT]` : Listeners configurés ?

**Solutions** :
1. Vérifier `google-services.json` présent dans `android-webview/app/`
2. Vérifier Google Play Services : `checkGooglePlayServices()` retourne `true`
3. Vérifier permissions : `window.androidPermissions.notifications === 'granted'`
4. Logs Android : `adb logcat | grep Firebase`

---

### ❌ Edge Function Échoue
**Logs Supabase à chercher** :
- `[ENTRY]` : Edge function appelée ?
- `[AUTH]` : JWT créé ?
- `[FCM]` : Envoi réussi ?
- `[FCM ERROR]` ou `[GENERAL ERROR]` : Détails de l'erreur

**Solutions** :
1. Vérifier secret Supabase : `FIREBASE_SERVICE_ACCOUNT_JSON` configuré
2. Vérifier format JSON : Pas de double échappement
3. Vérifier token : Valide et non expiré
4. Tester avec Firebase Console directement

---

### ❌ Notification N'Arrive Pas
**Vérifications** :
1. Canal notification : `runconnect_channel` créé dans MainActivity ?
2. Préférences : `notifications_enabled = true` ?
3. Type de notification : Préférence activée (ex: `notif_message`) ?
4. Appareil : Mode "Ne pas déranger" désactivé ?
5. Test direct Firebase Console

---

## 🎯 Système Final

### Architecture Simplifiée
```
┌─────────────────────────────────────────┐
│ MainActivity.java (ANDROID)              │
│ ┌─────────────────────────────────────┐ │
│ │ onCreate()                           │ │
│ │ ├─ Popup AUTO POST_NOTIFICATIONS    │ │
│ │ └─ Code 9999                         │ │
│ │                                      │ │
│ │ onRequestPermissionsResult(9999)    │ │
│ │ └─ Dispatch androidNotification...  │ │
│ │                                      │ │
│ │ AndroidBridge.sendTestNotification() │ │
│ │ └─ Notification locale Android      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ usePushNotifications.tsx (REACT)        │
│ ┌─────────────────────────────────────┐ │
│ │ setupPushListeners()                │ │
│ │ ├─ Listener "registration"          │ │
│ │ ├─ Listener "registrationError"     │ │
│ │ ├─ Listener "pushNotificationRecv"  │ │
│ │ └─ Listener "pushNotificationAction"│ │
│ │                                      │ │
│ │ ensureTokenRegistered()             │ │
│ │ ├─ Vérifie token base               │ │
│ │ ├─ Setup listeners                  │ │
│ │ ├─ PushNotifications.register()     │ │
│ │ └─ Attend token (5s max)            │ │
│ │                                      │ │
│ │ requestPermissions()                │ │
│ │ ├─ Vérifie état Android             │ │
│ │ └─ Appelle ensureTokenRegistered()  │ │
│ │                                      │ │
│ │ testNotification()                  │ │
│ │ └─ Appel edge function              │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ NotificationManager.tsx (UI)            │
│ ┌─────────────────────────────────────┐ │
│ │ Badge statut (Activées/Refusées)    │ │
│ │ Message info demande AUTO           │ │
│ │ Bouton "Vérifier le statut"         │ │
│ │ Bouton "Tester" (edge function)     │ │
│ │ Bouton "Test locale" (AndroidBridge)│ │
│ │ Bouton "Diagnostic" (token base)    │ │
│ │ Bouton "Paramètres Android"         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ Edge Function send-push-notification    │
│ ┌─────────────────────────────────────┐ │
│ │ 1. Génère JWT Firebase              │ │
│ │ 2. Récupère token FCM en base       │ │
│ │ 3. Envoie notification FCM          │ │
│ │ 4. Enregistre en table notifications│ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist Finale

- [x] Supprimé double demande permission (AUTO uniquement)
- [x] Supprimé méthode `requestNotificationPermissions()` AndroidBridge
- [x] Supprimé fonction `requestNativeNotifications()` React
- [x] Ajouté méthode `sendTestNotification()` AndroidBridge
- [x] Créé fonction centralisée `ensureTokenRegistered()`
- [x] Ajouté flag `window.__fcmRegistering` anti-doublon
- [x] Simplifié `requestPermissions()` (vérification seule)
- [x] Amélioré messages d'erreur `testNotification()`
- [x] Modifié UI `NotificationManager` (pas de bouton "Activer")
- [x] Incrémenté `versionCode` à 127
- [x] Documentation complète mise à jour

---

## 📊 Résultat Attendu

### ✅ Succès
- Popup AUTO au démarrage : 1 seule fois ✅
- Token FCM sauvegardé en base ✅
- Notifications PUSH fonctionnelles ✅
- Notifications LOCALES fonctionnelles ✅
- Pas de double initialisation ✅
- Pas de double `register()` ✅
- Messages d'erreur clairs ✅
- Logs détaillés à chaque étape ✅

### 🚀 Performances
- Temps d'init : < 2 secondes
- Génération token : < 3 secondes
- Envoi notification : < 1 seconde
- Réception notification : Instantanée

---

## 📚 Prochaines Étapes

1. ✅ **Tester** le flux complet (v127)
2. ⏳ **Corriger** Google Sign-In (SHA-1 / OAuth)
3. ⏳ **Vérifier** secret `FIREBASE_SERVICE_ACCOUNT_JSON`
4. ⏳ **Télécharger** nouvelle clé depuis Firebase Console si nécessaire
5. ⏳ **Tester** sur appareil physique Android
6. ⏳ **Monitorer** les logs production
7. ⏳ **Déployer** en production une fois validé

---

**Date de correction** : 2025-11-05  
**VersionCode** : 127  
**Status** : ✅ Implémentation terminée - En attente validation
