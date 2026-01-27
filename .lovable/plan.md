
# Plan : Support complet des permissions iOS (popups natives)

## Problème identifié

Le code actuel est fortement optimisé pour Android avec :
- `window.AndroidBridge` : interface JavaScript-Java spécifique à Android
- Détection native dans `main.tsx` qui cherche uniquement des signaux Android (WebView `wv`, `AndroidBridge`, etc.)
- Les hooks (`useContacts`, `useGeolocation`, `usePushNotifications`) utilisent `AndroidBridge` qui n'existe pas sur iOS

Sur iOS, les permissions fonctionnent différemment :
- Pas de `AndroidBridge` - Capacitor gère tout directement
- Les popups natives iOS sont automatiquement déclenchées par les plugins Capacitor (`@capacitor/geolocation`, `@capacitor/camera`, `@capacitor/contacts`, `@capacitor/push-notifications`)
- Le fichier `Info.plist` doit contenir les descriptions des permissions (déjà documenté dans `IOS_SETUP_INSTRUCTIONS.md`)

## Solution proposée

Modifier le code pour détecter correctement iOS et utiliser les APIs Capacitor standard au lieu de `AndroidBridge`.

### Fichiers à modifier

**1. `src/main.tsx`** - Ajouter la détection iOS
- Ajouter un critère pour détecter iOS natif (`/iPhone|iPad|iPod/` + protocole `capacitor:`)
- Dispatcher l'événement `capacitorNativeReady` aussi pour iOS

**2. `src/hooks/useContacts.tsx`** - Support iOS via Capacitor
- Quand on est sur iOS (`Capacitor.getPlatform() === 'ios'`), utiliser directement le plugin `@capacitor-community/contacts` au lieu de `AndroidBridge`
- La popup iOS de permission sera automatiquement déclenchée

**3. `src/hooks/useGeolocation.tsx`** - Vérifier le support iOS
- Le code utilise déjà `Geolocation.requestPermissions()` de Capacitor, ce qui fonctionne sur iOS
- Ajouter une branche spécifique iOS pour éviter d'appeler `PermissionsPlugin` Android

**4. `src/hooks/useCamera.tsx`** - Déjà compatible iOS
- Utilise `Camera.requestPermissions()` de Capacitor (fonctionne sur iOS)
- Aucune modification majeure requise

**5. `src/hooks/usePushNotifications.tsx`** - Support iOS APNs
- Le code utilise déjà `PushNotifications` de Capacitor (compatible iOS)
- Supprimer les appels à `AndroidBridge.getFCMToken()` quand on est sur iOS
- iOS utilise APNs (Apple Push Notification service) au lieu de FCM

**6. `src/lib/nativeDetection.ts`** - Améliorer la détection multi-plateforme
- Ajouter la détection iOS en plus d'Android

### Détails techniques des modifications

```text
┌──────────────────────────────────────────────────────────────┐
│                    FLUX PERMISSIONS iOS                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Détection plateforme                                    │
│      ├── Android → AndroidBridge + PermissionsPlugin         │
│      └── iOS → Capacitor Plugins directement                 │
│                                                              │
│   2. Demande permission                                      │
│      ├── Geolocation.requestPermissions() → popup iOS        │
│      ├── Camera.requestPermissions() → popup iOS             │
│      ├── Contacts.requestPermissions() → popup iOS           │
│      └── PushNotifications.requestPermissions() → popup iOS  │
│                                                              │
│   3. Les popups iOS apparaissent automatiquement avec        │
│      les messages définis dans Info.plist                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Code type pour la détection multi-plateforme

```typescript
// Dans useContacts.tsx
import { Capacitor } from '@capacitor/core';

const requestPermissions = async (): Promise<boolean> => {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'ios') {
    // iOS : utiliser directement le plugin Capacitor
    const result = await Contacts.requestPermissions();
    return result.contacts === 'granted';
  } else if (platform === 'android') {
    // Android : utiliser AndroidBridge si disponible
    if (window.AndroidBridge) {
      // ... code existant
    }
  }
  
  return false;
};
```

### Prérequis iOS (déjà documentés)

Pour que les popups iOS fonctionnent, l'utilisateur doit avoir :
1. Créé le dossier `ios/` avec `npx cap add ios`
2. Configuré `Info.plist` avec les descriptions de permissions (déjà dans `IOS_SETUP_INSTRUCTIONS.md`)
3. Ajouté `GoogleService-Info.plist` pour les notifications push

## Résultat attendu

Après ces modifications :
- Sur Android : comportement inchangé (AndroidBridge + popups natives Android)
- Sur iOS : les plugins Capacitor déclenchent automatiquement les popups iOS natives
- Les permissions (localisation, caméra, contacts, notifications) fonctionnent sur les deux plateformes
