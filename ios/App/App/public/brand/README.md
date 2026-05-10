# Brand — splash RunConnect

- **`runconnect-loading.mp4`** : boucle vidéo plein écran du splash (`RUCONNECT_LOADING_SCREEN_MP4_URL`, `<video>` autoplay + `playsInline` iOS).
- **`runconnect-loading-splash.svg`** : image fixe vectorielle de secours si la vidéo est absente ou en erreur (`RUCONNECT_LOADING_SCREEN_FALLBACK_URL`).
- **`runconnect-loading-splash.jpg`** : ancien fallback raster, conservé pour compatibilité avec les écrans qui le référencent encore directement.
- **`runconnect-loading-splash.gif`** (optionnel) : GIF authentique si tu préfères ce format plus tard (`RUCONNECT_LOADING_SCREEN_GIF_URL`, non utilisé par défaut).
- **`runconnect-splash-icon.png`** : icône seule (fond bleu + logo). Utilisée par `AppBootFallback`, fallbacks, etc. via `RUCONNECT_SPLASH_ICON_URL`.
- Le **splash** (Web + assets) utilise **`#0066CC`** (`RUCONNECT_SPLASH_BACKGROUND` dans `src/lib/ruconnectSplashChrome.ts`), aligné sur le fond du chargement.
- Après modification des assets natifs, lancer `npx cap sync`.
