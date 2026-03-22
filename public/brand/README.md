# Brand — splash RunConnect

- **`runconnect-splash-icon.png`** : icône app (fond bleu + logo). Utilisée par `LoadingScreen` et `AppBootFallback` via `RUCONNECT_SPLASH_ICON_URL`.
- La teinte de fond partout est **`#2455EB`** (`RUCONNECT_SPLASH_BLUE` dans `src/lib/ruconnectSplashChrome.ts`). Si tu remplaces l’image, ajuste cette constante + `capacitor.config.ts` + `index.html` pour que le bleu reste identique.
