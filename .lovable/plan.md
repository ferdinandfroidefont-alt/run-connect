

# Correction des crashs iOS -- RunConnect

## Probleme identifie

L'application crash immediatement a l'ouverture sur iPhone. Apres analyse du code, plusieurs problemes critiques ont ete identifies qui causent un crash au demarrage sur iOS.

## Causes du crash

### Cause 1 (CRITIQUE) : AdMob avec des IDs invalides
Le composant `AdMobInitializer` est rendu dans `App.tsx` a chaque lancement. Sur iOS natif, le hook `useAdMob` appelle `AdMob.initialize()` avec des IDs placeholder (`ca-app-pub-XXXXXXXXXXXXXXX~XXXXXXXXXX`). Le SDK Google AdMob iOS **crash immediatement** si le `GADApplicationIdentifier` dans Info.plist est absent ou si l'App ID est invalide. C'est tres probablement la cause principale du crash.

**Correction** : Ajouter un try/catch robuste dans `useAdMob` et ne PAS initialiser AdMob si les IDs sont des placeholders. Ajouter aussi une verification specifique pour iOS.

### Cause 2 : Plateforme hardcodee en "android" dans main.tsx
A la ligne 146 de `main.tsx`, l'evenement `capacitorReady` est dispatche avec `platform: 'android'` en dur, meme sur iOS. Cela peut fausser toute la detection de plateforme pour les hooks qui ecoutent cet evenement.

**Correction** : Utiliser la plateforme detectee dynamiquement.

### Cause 3 : `forceInitCapacitor.ts` s'auto-execute et reference des APIs Android
Ce fichier s'execute automatiquement a l'import (`forceInitCapacitorPlugins()` ligne 49) et reference `window.PermissionsPlugin` qui est un plugin Android-only. Sur iOS, cela peut provoquer des erreurs.

**Correction** : Ajouter une guard pour ne pas s'executer sur iOS.

### Cause 4 : Toasts desactives avec message "Android" sur iOS
Dans `sonner.tsx`, `isReallyNative()` desactive les toasts en loguant "desactive sur Android" meme quand on est sur iOS. Pas un crash en soi, mais a corriger.

**Correction** : Adapter le message selon la plateforme.

### Cause 5 : `usePushNotifications` importe dynamiquement `@capacitor/app`
L'import dynamique de `@capacitor/app` (ligne 458) peut echouer silencieusement ou causer un crash si le plugin n'est pas correctement installe pour iOS.

**Correction** : Ajouter un try/catch autour de l'import dynamique.

## Plan de correction

### Fichier 1 : `src/hooks/useAdMob.tsx`
- Ajouter une detection des IDs placeholder avant d'initialiser
- Ajouter un try/catch global qui empeche tout crash
- Verifier que le plugin AdMob est disponible avant d'appeler ses methodes
- Ne pas initialiser du tout si on est sur iOS et que les IDs ne sont pas configures

### Fichier 2 : `src/main.tsx`
- Ligne 146 : remplacer `platform: 'android'` par la plateforme detectee dynamiquement (`detectedPlatform` ou `(window as any).detectedPlatform`)
- Ajouter un try/catch global autour de `initializeCapacitorPlugins` pour eviter tout crash au demarrage

### Fichier 3 : `src/lib/forceInitCapacitor.ts`
- Ajouter une guard : ne pas s'executer si la plateforme est iOS
- Verifier `Capacitor.getPlatform() !== 'ios'` avant toute operation Android-specifique

### Fichier 4 : `src/components/ui/sonner.tsx`
- Remplacer les messages "desactive sur Android" par "desactive sur natif" pour etre generique iOS/Android

### Fichier 5 : `src/components/AdMobInitializer.tsx`
- Ajouter une verification : ne pas rendre le composant si on est sur iOS sans configuration AdMob valide
- Ajouter un ErrorBoundary local pour eviter qu'un crash AdMob fasse tomber toute l'app

### Fichier 6 : `src/hooks/usePushNotifications.tsx`
- Ajouter un try/catch autour de l'import dynamique de `@capacitor/app` (ligne 458)

## Resume des fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/hooks/useAdMob.tsx` | Securiser l'init AdMob, detecter les IDs placeholder |
| `src/main.tsx` | Corriger la plateforme hardcodee, ajouter try/catch global |
| `src/lib/forceInitCapacitor.ts` | Guard iOS pour ne pas executer le code Android |
| `src/components/ui/sonner.tsx` | Messages generiques iOS/Android |
| `src/components/AdMobInitializer.tsx` | Protection contre crash AdMob sur iOS |
| `src/hooks/usePushNotifications.tsx` | Try/catch sur import dynamique |

