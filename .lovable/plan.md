

# Fix crash iOS — `+[FIRApp configure]` double-init (build 231)

## Diagnostic

Le crash report montre toujours `+[FIRApp configure]` (FIRApp.m:110) qui lève une exception. Le garde `if FirebaseApp.app() == nil` est présent dans le script, mais le problème persiste.

**Cause racine** : Le pod `Firebase/Messaging` + la présence de `GoogleService-Info.plist` déclenche une **auto-initialisation** de Firebase AVANT que `didFinishLaunchingWithOptions` ne s'exécute. Firebase est donc déjà configuré quand l'AppDelegate tourne. Cependant, `FirebaseApp.app()` devrait retourner non-nil dans ce cas et le garde devrait fonctionner...

**Le vrai problème** : l'auto-init Firebase ne passe PAS par `+[FIRApp configure]` — elle utilise un mécanisme interne. Donc `FirebaseApp.app()` retourne `nil` au moment du check, mais ensuite `+[FIRApp configure]` détecte que l'init interne a déjà eu lieu et crash.

**Solution** : Supprimer complètement l'appel à `FirebaseApp.configure()`. Avec le pod `Firebase/Messaging` + `GoogleService-Info.plist`, Firebase s'auto-initialise. On garde uniquement `Messaging.messaging().delegate = self`.

## Changement

### `scripts/configure_ios_push.sh`
- Lignes 32-56 : Remplacer le bloc d'injection `FirebaseApp.configure()` par une injection de **seulement** `Messaging.messaging().delegate = self`
- Supprimer l'assertion `FirebaseApp.configure` (puisqu'on ne l'injecte plus)
- Ajouter un commentaire expliquant que Firebase s'auto-configure via le plist

