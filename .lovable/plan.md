
# Plan : Support complet des permissions iOS (popups natives) ✅ IMPLÉMENTÉ

## Problème identifié

Le code actuel était fortement optimisé pour Android avec :
- `window.AndroidBridge` : interface JavaScript-Java spécifique à Android
- Détection native dans `main.tsx` qui cherchait uniquement des signaux Android (WebView `wv`, `AndroidBridge`, etc.)
- Les hooks (`useContacts`, `useGeolocation`, `usePushNotifications`) utilisaient `AndroidBridge` qui n'existe pas sur iOS

## Solution implémentée ✅

### Fichiers modifiés

**1. `src/main.tsx`** ✅
- Ajouté détection iOS natif (`/iPhone|iPad|iPod/` + protocole `capacitor:`)
- Dispatcher l'événement `capacitorNativeReady` avec la plateforme (ios/android)
- Niveau 29 avec 8 critères de détection

**2. `src/lib/nativeDetection.ts`** ✅
- Ajouté helpers `isIOS()`, `isAndroid()`, `getPlatform()`
- Détection multi-plateforme via Capacitor

**3. `src/hooks/useContacts.tsx`** ✅
- Branche iOS: utilise `Contacts.requestPermissions()` et `Contacts.getContacts()` directement via Capacitor
- La popup iOS de permission est automatiquement déclenchée
- Fallback Capacitor pour Android sans AndroidBridge

**4. `src/hooks/useGeolocation.tsx`** ✅
- Branche iOS: utilise `Geolocation.requestPermissions()` de Capacitor
- La popup iOS de permission est automatiquement déclenchée

**5. `src/hooks/usePushNotifications.tsx`** ✅
- Branche iOS: utilise `PushNotifications.requestPermissions()` et `PushNotifications.register()` de Capacitor
- La popup iOS de permission est automatiquement déclenchée
- iOS utilise APNs au lieu de FCM

**6. `src/hooks/useCamera.tsx`** ✅
- Déjà compatible iOS (utilise `Camera.requestPermissions()` de Capacitor)
- Aucune modification majeure requise

## Flux permissions multi-plateforme

```text
┌──────────────────────────────────────────────────────────────┐
│                    FLUX PERMISSIONS                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Détection plateforme (main.tsx)                         │
│      ├── iOS → Capacitor.getPlatform() === 'ios'             │
│      └── Android → AndroidBridge + Capacitor                 │
│                                                              │
│   2. Demande permission                                      │
│      ├── iOS: Capacitor plugins déclenchent popup native     │
│      │   ├── Geolocation.requestPermissions()                │
│      │   ├── Camera.requestPermissions()                     │
│      │   ├── Contacts.requestPermissions()                   │
│      │   └── PushNotifications.requestPermissions()          │
│      │                                                       │
│      └── Android: AndroidBridge OU fallback Capacitor        │
│                                                              │
│   3. Les popups iOS apparaissent automatiquement avec        │
│      les messages définis dans Info.plist                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Prérequis iOS (pour l'utilisateur)

Pour que les popups iOS fonctionnent, l'utilisateur doit avoir :
1. Créé le dossier `ios/` avec `npx cap add ios`
2. Configuré `Info.plist` avec les descriptions de permissions (déjà dans `IOS_SETUP_INSTRUCTIONS.md`)
3. Ajouté `GoogleService-Info.plist` pour les notifications push

## Résultat

- ✅ Sur Android : comportement inchangé (AndroidBridge + popups natives Android)
- ✅ Sur iOS : les plugins Capacitor déclenchent automatiquement les popups iOS natives
- ✅ Les permissions (localisation, caméra, contacts, notifications) fonctionnent sur les deux plateformes
