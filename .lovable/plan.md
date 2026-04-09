

## Mode debug temporaire pour diagnostiquer l'écran blanc iOS

### Constat sur l'existant

Le projet possède **déjà** une infrastructure de debug conséquente :
- `bootLogInstall.ts` installe une capture console globale (log/warn/error/debug) + listeners `window.error` et `unhandledrejection`
- `OnScreenDebugLog` affiche un panneau flottant avec tous les logs en natif
- `BootErrorBoundary` + `AppErrorBoundary` capturent les erreurs React
- `bootLog()` est appelé à chaque étape clé (main, LoadingScreen, Layout, App)
- Le fallback HTML dans `index.html` capture aussi les erreurs au boot

**Ce qui manque** pour un diagnostic complet de l'écran blanc iOS :

1. **Pastilles visuelles "checkpoint"** — savoir visuellement jusqu'où le boot est allé même si le panneau de logs ne s'affiche pas
2. **Timer de boot** — savoir combien de temps chaque phase prend et détecter un loading infini
3. **Logs dans les providers** — savoir lequel bloque (AuthProvider, UserProfileProvider, etc.)
4. **Logs AuthCallback** — route/query params au moment du callback
5. **Watchdog de loading infini** — afficher un message si le splash dure > 8s

### Plan de correction

#### 1. Créer `src/lib/bootDebugOverlay.ts` (nouveau fichier)
Module utilitaire "temporaire" qui injecte des pastilles visuelles dans le DOM :
- Fonction `addBootCheckpoint(label: string)` : ajoute une pastille fixe en haut à gauche (petite, semi-transparente, empilée) avec le label et le temps écoulé depuis le boot
- Actif uniquement si `isOnScreenLogsEnabled()` retourne true (donc natif ou dev)
- Chaque checkpoint s'empile verticalement
- Inclut un watchdog : si aucun checkpoint "APP_READY" n'est reçu après 8s, affiche un bandeau rouge "BOOT TIMEOUT" avec l'URL, le dernier checkpoint atteint, et un bouton "Recharger"

#### 2. Instrumenter `src/main.tsx`
Ajouter des checkpoints aux étapes clés (sans changer la logique) :
- `addBootCheckpoint("BUNDLE_START")` tout en haut
- `addBootCheckpoint("NATIVE_DETECT")` après détection
- `addBootCheckpoint("CREATE_ROOT")` avant createRoot
- `addBootCheckpoint("RENDER_CALLED")` après render
- Logger `window.location.href` et `navigator.userAgent` via bootLog (déjà fait partiellement, compléter)

#### 3. Instrumenter `src/App.tsx`
- `addBootCheckpoint("APP_RENDER")` au début du composant
- `addBootCheckpoint("APP_SPLASH_DONE")` quand `isAppLoaded` passe à true
- `addBootCheckpoint("APP_READY")` dans le useEffect post-splash (ce checkpoint désactive le watchdog)

#### 4. Instrumenter les providers dans `src/main.tsx`
Wrapper chaque provider avec un log d'entrée :
- Créer un petit composant inline `DebugProviderGate` qui fait `addBootCheckpoint("PROVIDER_<name>")` dans un useEffect[] et rend children
- L'insérer entre chaque provider : AuthProvider, UserProfileProvider, DistanceUnitsProvider, LanguageProvider
- Cela permet de savoir exactement quel provider monte et lequel bloque

#### 5. Instrumenter `src/components/LoadingScreen.tsx`
- `addBootCheckpoint("SPLASH_MOUNT")` au mount
- `addBootCheckpoint("SPLASH_SESSION_OK")` quand getSession résout
- `addBootCheckpoint("SPLASH_EXIT")` quand exiting passe à true
- Log du temps total de splash

#### 6. Instrumenter `src/components/Layout.tsx`
- `addBootCheckpoint("LAYOUT_RENDER")` au début
- `addBootCheckpoint("LAYOUT_AUTH_WAIT")` quand loading/profileLoading
- `addBootCheckpoint("LAYOUT_READY")` quand tout est prêt

#### 7. Instrumenter `src/pages/AuthCallback.tsx`
- Logger `window.location.href`, `window.location.search`, tous les query params
- `addBootCheckpoint("AUTH_CALLBACK")` au mount
- Logger les erreurs de callback avec bootLog

### Fichiers à modifier
- **Nouveau** : `src/lib/bootDebugOverlay.ts`
- `src/main.tsx` — checkpoints + DebugProviderGate
- `src/App.tsx` — checkpoints
- `src/components/LoadingScreen.tsx` — checkpoints
- `src/components/Layout.tsx` — checkpoints
- `src/pages/AuthCallback.tsx` — logs URL/params

### Ce qui ne change PAS
- Aucune logique métier modifiée
- Aucun provider réordonné
- Le panneau `OnScreenDebugLog` existant reste tel quel
- Les error boundaries restent identiques
- Tout le debug est conditionné par `isOnScreenLogsEnabled()` — invisible en production web

### Retrait futur
Tout le debug ajouté est isolé dans `bootDebugOverlay.ts` + des appels `addBootCheckpoint()` facilement trouvables par recherche. Un seul passage suffit pour tout supprimer.

