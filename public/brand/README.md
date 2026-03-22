# Brand — splash RunConnect

- **`runconnect-splash-icon.png`** : icône app (fond bleu + logo). Utilisée par `LoadingScreen` et `AppBootFallback` via `RUCONNECT_SPLASH_ICON_URL`.
- Le **splash** (Web + assets) utilise **`#2455EB`** (`RUCONNECT_SPLASH_BLUE` dans `src/lib/ruconnectSplashChrome.ts`). Aligner `index.html` + `theme-color` initial avec ce bleu si besoin.
- Sous **Capacitor iOS**, le **`ios.backgroundColor`** du fichier `capacitor.config.ts` est volontairement **blanc** (`#FFFFFF`) : ce n’est pas le bleu splash — sinon une bande bleue native peut apparaître sous la tab bar dans la safe area. Après modification, lancer `npx cap sync ios`.
