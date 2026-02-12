
# Refonte du systeme de notifications push

## Diagnostic : problemes identifies

### 1. Fichier monstre ingerable (1362 lignes)
`usePushNotifications.tsx` fait 1362 lignes avec 7+ useEffects qui font tous la meme chose : verifier le token, le sauvegarder, le recuperer. C'est du code spaghetti avec des mecanismes de retry qui se marchent dessus.

### 2. Inconsistance channel_id
- Le payload FCM dans l'edge function utilise correctement `high_importance_channel` (ligne 169)
- Mais le log de debug a la ligne 503 affiche `runconnect_channel` et le log d'erreur ligne 216 aussi
- Le `MessagingService.java` utilise `high_importance_channel` -- c'est correct
- Ces logs trompeurs peuvent causer de la confusion lors du debug

### 3. Boucles de retry redondantes
Le hook a 5 mecanismes de recovery qui se chevauchent :
- `pendingToken` useEffect (ligne 982)
- `userAuthenticatedWithFCMToken` listener (ligne 991)
- `ensureFCMTokenSaved` avec retry 2s (ligne 1022)
- `fcmTokenReady` listener (ligne 1089)
- `initializePushNotifications` au montage (ligne 1186)

Resultat : le token est parfois sauvegarde 3 fois en parallele, et les toasts "Token FCM recupere" apparaissent de maniere intempestive.

### 4. Logs excessifs en production
Plus de 100 `console.log` et `console.error` dans le hook -- acceptable en debug mais pas pour une app mondiale.

### 5. Edge function solide mais perfectible
- Le nettoyage des tokens UNREGISTERED est bon
- Le retry avec backoff exponentiel est bon
- Manque : cache du Firebase access token (regenere a chaque appel = ~500ms perdu)

---

## Plan de correction

### Etape 1 : Simplifier usePushNotifications.tsx
Reduire de 1362 a ~400 lignes en :
- Fusionnant les 5 mecanismes de recovery en un seul flux clair : `init -> check permissions -> get token -> save token`
- Supprimant les useEffects redondants (garder 3 max : init, token recovery, app resume)
- Remplacant les 100+ console.log par un helper `log()` qui ne log qu'en mode debug
- Gardant la logique de detection native mais en la simplifiant (un seul check au lieu de re-verifier 20 fois)

Architecture cible du hook :

```text
usePushNotifications
  |
  |-- useEffect #1 : Init (une seule fois)
  |     check permissions -> setup listeners -> register si granted
  |
  |-- useEffect #2 : Token recovery (quand user change)
  |     si user + isNative + pas de token -> verifier window.fcmToken -> sauvegarder
  |
  |-- useEffect #3 : App resume
  |     quand app revient au premier plan -> re-verifier token
  |
  |-- savePushToken() : simplifie, un seul try/catch, pas de retry RLS infini
  |-- requestPermissions() : garde la logique iOS/Android
  |-- testNotification() : simplifie
```

### Etape 2 : Corriger les logs channel_id dans l'edge function
- Ligne 169 : `channel_id: 'high_importance_channel'` -- deja correct, ne pas toucher
- Ligne 216 et 503 : corriger les logs de debug pour afficher `high_importance_channel` au lieu de `runconnect_channel`

### Etape 3 : Cache du Firebase access token dans l'edge function
Ajouter un cache en memoire du token OAuth2 Firebase (expire apres 50 min au lieu de 1h par securite). Cela evite de regenerer un JWT + appeler Google OAuth2 a chaque notification.

### Etape 4 : Supprimer les toasts intempestifs
- Supprimer le toast "Token FCM recupere" qui s'affiche a chaque demarrage
- Supprimer le toast "Session non prete, retry dans 2s"
- Garder uniquement les toasts explicitement declenches par l'utilisateur (bouton test, activation manuelle)

### Etape 5 : Nettoyage SettingsNotifications
- Remplacer les couleurs hardcodees (`#007AFF`, `#FF3B30`, etc.) par les variables du design system
- Coherence avec le nettoyage fait sur Messages.tsx

---

## Fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/hooks/usePushNotifications.tsx` | Refonte complete (~400 lignes au lieu de 1362) |
| `supabase/functions/send-push-notification/index.ts` | Fix logs channel_id + cache token Firebase |
| `src/components/settings/SettingsNotifications.tsx` | Nettoyage couleurs hardcodees |
| `src/hooks/useSendNotification.ts` | Inchange (deja propre) |

## Ce qui ne change PAS
- `MessagingService.java` -- deja correct, zone protegee
- `AndroidManifest.xml` -- zone protegee
- `google-services.json` -- zone protegee
- L'architecture globale (UI -> Edge Function -> FCM) reste identique
- Les preferences de notification par type restent identiques
