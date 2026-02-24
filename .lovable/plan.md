

# Fix iOS Push Notification Token — Diagnostic et Corrections

## Analyse du problème

D'après les screenshots et la base de données :
- `push_token: null`, `push_token_platform: android` pour l'utilisateur `0f464761...`
- iOS affiche "Permissions OK mais token non reçu"
- L'événement `registration` de Capacitor ne semble pas déclencher la sauvegarde du token APNs

## Cause racine identifiée

Trois problèmes dans le flux iOS :

1. **Pas de logs sur iOS** — Le flag `DEBUG = import.meta.env.DEV` masque tous les logs en production, impossible de diagnostiquer
2. **Pas de fallback edge function sur iOS** — Android a un backup natif (`savePushTokenToSupabase` dans Java), iOS n'a aucun backup si `savePushToken` échoue via le client Supabase
3. **Pas de retry après `register()`** — Si l'event `registration` ne fire pas immédiatement (délai APNs), aucun mécanisme ne retente

## Changements prévus

### Fichier : `src/hooks/usePushNotifications.tsx`

**1. Activer les logs push en production (temporairement pour debug iOS)**

Remplacer le logger silencieux par des `console.log` toujours actifs pour les étapes critiques iOS (registration, token save). Cela permettra de voir dans les outils de debug Xcode/Safari ce qui se passe.

**2. Ajouter un retry iOS après `register()`**

Dans le useEffect #1 (init), après `PushNotifications.register()` sur iOS, ajouter un timeout de 5 secondes. Si aucun token n'est reçu (`token` est toujours null), relancer `register()` une seconde fois. Cela couvre le cas où APNs met du temps à répondre.

**3. Ajouter un fallback via l'edge function `save-push-token`**

Dans la callback `registration` du listener, si `savePushToken` (via client Supabase) échoue ou si le token n'est pas en DB après 3 secondes, appeler directement l'edge function `save-push-token` avec `fetch()` (comme le fait le code Android Java). Cela contourne les éventuels problèmes RLS.

**4. Forcer la plateforme `ios` dans `savePushToken`**

Actuellement, la détection de plateforme favorise Android (`AndroidBridge`, `fcmToken`). Sur iOS Capacitor, `Capacitor.getPlatform()` retourne `'ios'`, mais le code teste d'abord `AndroidBridge`. Ajouter une vérification explicite pour iOS en priorité.

### Détail technique des modifications

```
usePushNotifications.tsx — setupPushListeners > registration listener :
  AVANT: savePushToken(t.value) uniquement
  APRÈS: savePushToken(t.value), puis vérification DB après 3s,
         si null → fetch('save-push-token', { user_id, token, platform: 'ios' })

usePushNotifications.tsx — useEffect #1 init :
  AVANT: register() puis rien
  APRÈS: register(), puis setTimeout 5s → si pas de token →
         re-register() + log warning

usePushNotifications.tsx — savePushToken :
  AVANT: platform = Capacitor.getPlatform(), puis override si AndroidBridge
  APRÈS: if (Capacitor.getPlatform() === 'ios') platform = 'ios' en priorité
```

### Résumé fichiers

| Fichier | Action |
|---|---|
| `src/hooks/usePushNotifications.tsx` | Modifier — logs iOS, retry register, fallback edge function, fix plateforme |

Aucune migration SQL. Aucun nouveau fichier.

