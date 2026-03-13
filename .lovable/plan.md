

# Panneau diagnostic push iOS détaillé

## Ce qui existe
L'écran `SettingsNotifications.tsx` (lignes 264-315) affiche un debug basique avec des `DebugRow` bruts et deux boutons (Actualiser / Copier). Le hook `usePushNotifications` expose déjà tout via `pushDebug: PushDebugState` — toutes les données nécessaires sont disponibles.

## Ce qui change

**Fichier unique** : `src/components/settings/SettingsNotifications.tsx`

Remplacer la section "Debug iOS Push (temporaire)" (lignes 264-315) par un panneau diagnostic structuré en 6 sections :

### 1. Sections du panneau

Chaque section est un groupe visuel avec header coloré et indicateur de sévérité (pastille verte/orange/rouge) :

| Section | Données affichées | Source `pushDebug` |
|---------|------------------|--------------------|
| **Permissions** | permissionRequested, permissionResult, granted/denied/prompt | pushDebug + permissionStatus |
| **Enregistrement natif** | registerCalled, registrationEventReceived, isRegistered, isNative | pushDebug + props hook |
| **Token APNs** | apnsHexDetected, longueur token, version masquée (8 premiers + 8 derniers chars) | pushDebug.selectedFinalToken si APNs |
| **Token FCM** | fcmTokenEventReceived, fcmTokenLength, selectedFinalToken masqué | pushDebug |
| **Sauvegarde backend** | saveAttempted, saveResponse (status), backendProfilePushToken masqué, user_id masqué | pushDebug + user.id |
| **Diagnostic automatique** | Message humain généré selon l'état (voir logique ci-dessous) | Calculé |

### 2. Logique de diagnostic automatique

Fonction `getDiagnostic()` retournant `{ message: string; severity: 'success' | 'warning' | 'error' }` :

- **!isNative** → error : "L'application n'est pas en environnement natif, les push ne sont pas disponibles."
- **permissionStatus.denied** → error : "Les notifications sont refusées par l'utilisateur."
- **!permissionStatus.granted** → warning : "Les permissions n'ont pas encore été accordées."
- **apnsHexDetected && !fcmTokenEventReceived** → error : "APNs OK mais FCM absent : problème probable de configuration Firebase iOS (GoogleService-Info.plist, bundle ID, APNs key)."
- **fcmTokenEventReceived && !saveAttempted** → warning : "Token FCM obtenu mais sauvegarde non tentée."
- **saveAttempted && saveResponse?.status !== 200** → error : "Le token FCM a été obtenu mais n'a pas pu être sauvegardé en base (status: X)."
- **backendProfilePushToken && length > 50** → success : "Chaîne push complète : permissions ✓, token FCM ✓, sauvegarde backend ✓."
- Sinon → warning : "État indéterminé, relancez le diagnostic."

### 3. Boutons d'action (3 boutons)

- **Copier le diagnostic** : JSON complet (existant, enrichi)
- **Relancer l'enregistrement push** : appelle `requestPermissions()` puis `refreshDebugFromBackend()`
- **Tester la récupération du token** : appelle `checkPermissionStatus()` puis `refreshDebugFromBackend()`

### 4. Horodatage et sévérité visuelle

- Horodatage du dernier diagnostic affiché en bas
- Bandeau coloré en haut du diagnostic : vert (success), orange (warning), rouge (error) basé sur `getDiagnostic().severity`

### 5. Style

Réutilise les patterns existants du fichier (iOS-style cards, `bg-card`, `text-[13px]` mono pour valeurs, sections avec headers uppercase). Masquage des tokens : `abc12345...xyz98765` (8+8 chars).

## Aucun changement dans le hook
Toutes les données sont déjà exposées par `usePushNotifications`. Pas de modification de `usePushNotifications.tsx`.

