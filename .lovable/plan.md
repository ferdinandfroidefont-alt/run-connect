

## Diagnostic du probleme

Le token push iOS est `null` car il y a deux problemes combines :

### 1. Race condition dans `setupPushListeners` (bug code)

Le guard `__pushNotificationSystemInitialized` empeche la re-creation des listeners quand le `user` change. Si les listeners sont configures avant que `user` soit disponible, le `savePushToken` dans la closure capture un `user` null et echoue silencieusement (ligne 101: `if (!user) { setToken(...); return false; }`). Le token est perdu.

### 2. Le `registration` event peut ne jamais fire sur iOS

Sur iOS, `PushNotifications.register()` declenche l'enregistrement APNs. Si le Firebase iOS SDK n'est pas correctement integre (GoogleService-Info.plist absent, pods Firebase non installes), l'evenement `registration` ne fire jamais et aucun token n'est capture.

## Plan de correction (code)

### Fichier : `src/hooks/usePushNotifications.tsx`

**A. Utiliser un `useRef` pour stocker le token en attente et le sauvegarder des que `user` est disponible**

- Ajouter `const pendingTokenRef = useRef<string | null>(null)` 
- Dans le listener `registration`, stocker le token dans `pendingTokenRef.current` en plus de `setToken`
- Ajouter un useEffect qui surveille `user` + `pendingTokenRef.current` : des que les deux sont presents, appeler `savePushToken`

**B. Supprimer le guard `__pushNotificationSystemInitialized` ou le rendre user-aware**

- Remplacer `__pushNotificationSystemInitialized` par un tracking local (via `useRef<boolean>`) pour eviter les doublons dans le meme composant
- Quand `user` change et qu'un token pending existe, le sauvegarder immediatement

**C. Ajouter un timeout diagnostic pour iOS**

- Apres `PushNotifications.register()` sur iOS, si aucun `registration` event n'est recu sous 10s, logger un message d'erreur clair indiquant que le Firebase iOS SDK n'est probablement pas configure
- Tenter un retry de `register()` une fois supplementaire

**D. Sauvegarder le token via edge function directement dans le listener `registration` (bypass RLS)**

- Dans le listener `registration`, si `user` est disponible et que `savePushToken` echoue, appeler immediatement `saveTokenViaEdgeFunction` comme fallback sans attendre 3s
- Si `user` n'est pas disponible, stocker dans `pendingTokenRef` ET `window.__pendingPushToken` pour persistance cross-component

**E. Ajouter un useEffect dedie pour iOS qui re-tente `register()` si pas de token apres 8s**

- Specifique a `platform === 'ios'`
- Verifie `token === null` et `isNative`
- Appelle `PushNotifications.register()` avec un log explicite
- Maximum 3 tentatives espacees de 8s

### Resume des changements concrets

```text
usePushNotifications.tsx
├── + useRef pendingTokenRef
├── ~ setupPushListeners: supprimer guard global, utiliser ref local
├── ~ registration listener: stocker dans ref + fallback edge function immediat
├── + useEffect: user + pendingTokenRef → save
├── + useEffect: iOS retry register() si token null apres 8s (max 3x)
└── + logs diagnostiques iOS detailles
```

### Note importante pour l'utilisateur

Si apres ces corrections le token reste null sur iOS, il faudra verifier cote Xcode :
- `GoogleService-Info.plist` present dans le target App
- Pods Firebase installes (`pod install` dans `ios/App`)
- Capability "Push Notifications" activee dans Signing & Capabilities
- Cle APNs (.p8) uploadee dans Firebase Console

