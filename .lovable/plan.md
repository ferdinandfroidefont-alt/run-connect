
Objectif: corriger définitivement “Google Maps ne s’est pas chargé correctement” sur iOS, même si la détection native côté app échoue.

Constat confirmé
- Les logs Edge montrent encore `platform=web, native=false` sur `google-maps-proxy`.
- La capture iOS montre l’erreur Maps JS (clé/referrer inadapté au contexte app).
- Le secret `GOOGLE_MAPS_SERVER_API_KEY` existe, donc le blocage vient surtout de la sélection de clé (browser au lieu server).
- Contrainte: Android non testable par l’utilisateur pour l’instant.

Plan d’implémentation
1) Renforcer la détection native iOS dans `src/lib/nativeDetection.ts`
- Corriger `isIOSWebView()` (heuristique actuelle trop fragile).
- Détecter WebView iOS via UA robuste (iPhone/iPad + Mobile + AppleWebKit, exclusion navigateurs iOS connus), `navigator.standalone`, protocoles `capacitor:/file:/ionic:`, et bridge WebKit si présent.
- Aligner `isReallyNative()` et `getPlatform()` pour éviter les divergences.

2) Ajouter un fallback serveur dans `supabase/functions/google-maps-proxy/index.ts`
- Ne plus dépendre uniquement du `platform` body.
- Inférer `isNative` via:
  - `platform` explicite (`ios/android`) OU
  - `Origin` natif (`capacitor://localhost`, `null`, vide) OU
  - signature UA WebView iOS.
- Si `isNative` inféré: renvoyer `GOOGLE_MAPS_SERVER_API_KEY`; sinon clé browser.
- Ajouter logs diagnostics utiles (sans données sensibles): `platform_body`, `origin_kind`, `ua_kind`, `native_inferred`.

3) Sécuriser l’identification pour les prochaines builds iOS
- Ajouter `ios.appendUserAgent` dans `capacitor.config.ts` (ex: `RunConnect-iOS/1.x`).
- Utiliser ce marqueur côté proxy comme signal natif prioritaire.
- Cela rend la détection stable même si l’UA Apple change.

4) Vérification de configuration Google (si encore KO après patch)
- Vérifier que la clé serveur autorise bien **Maps JavaScript API** (pas seulement Geocoding).
- Garder la clé browser restreinte par referrer pour le web.

Validation prévue
- Test Edge direct: appels `get-key` avec/sans `platform` pour vérifier la clé renvoyée selon cas.
- Vérifier logs `google-maps-proxy` après un essai réel iOS: attendu `native_inferred=true`.
- Test utilisateur iOS end-to-end sur l’écran d’accueil (carte visible + interactions de base).
- Android: faute de device de test utilisateur, valider au minimum via logs quand un appel Android réel arrive.

Détails techniques
- Fichiers ciblés:
  - `src/lib/nativeDetection.ts`
  - `supabase/functions/google-maps-proxy/index.ts`
  - `capacitor.config.ts`
- Effet recherché:
  - iOS app ne dépend plus d’une seule heuristique frontend pour obtenir la bonne clé.
  - Le backend compense les cas “platform manquant” et évite le retour de clé browser en contexte app.

Risques et mitigation
- Risque: classifier Safari iOS web comme natif.
- Mitigation: heuristique UA stricte + priorité au marqueur `appendUserAgent` + logs de contrôle pour ajustement rapide.
