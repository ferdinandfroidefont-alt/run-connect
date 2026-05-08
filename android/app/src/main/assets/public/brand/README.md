# Brand — splash RunConnect

- **`runconnect-loading.mp4`** : boucle vidéo du splash (essayée en premier).
- **`runconnect-loading-splash.svg`** : image fixe vectorielle de secours, nette sur grands écrans.
- **`runconnect-loading-splash.jpg`** : ancien fallback raster conservé pour compatibilité.
- **`runconnect-loading-splash.gif`** (optionnel) : alternative GIF si besoin.
- **`runconnect-splash-icon.png`** : icône seule (fond bleu + logo). Utilisée par `AppBootFallback`, fallbacks, etc. via `RUCONNECT_SPLASH_ICON_URL`.
- Le **splash** (Web + assets) utilise **`#0066CC`**, aligné sur le fond du chargement.
- Après modification des assets natifs, lancer `npx cap sync`.
