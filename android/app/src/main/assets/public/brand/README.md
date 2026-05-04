# Brand — splash RunConnect

- **`runconnect-loading-splash.gif`** (optionnel) : GIF authentique pour l’animation ; essayé en premier par `LoadingScreen`.
- **`runconnect-loading-splash.jpg`** : image fixe de secours si pas de GIF valide.
- **`runconnect-splash-icon.png`** : icône seule (fond bleu + logo). Utilisée par `AppBootFallback`, fallbacks, etc. via `RUCONNECT_SPLASH_ICON_URL`.
- Le **splash** (Web + assets) utilise **`#2E68FF`** (`RUCONNECT_SPLASH_BLUE` dans `src/lib/ruconnectSplashChrome.ts`), aligné sur le fond de l’icône.
- Sous **Capacitor iOS**, le **`ios.backgroundColor`** du fichier `capacitor.config.ts` est volontairement **blanc** (`#FFFFFF`) : ce n’est pas le bleu splash — sinon une bande bleue native peut apparaître sous la tab bar dans la safe area. Après modification, lancer `npx cap sync ios`.
