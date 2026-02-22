

## Correction des boutons non-cliquables sur la page Mode Entrainement

### Probleme

Google Maps cree des divs internes avec des `z-index` tres eleves (jusqu'a 1000000+) qui interceptent tous les clics, meme si nos boutons ont `z-[9999]`. Le `z-index` seul ne suffit pas car les overlays Google Maps sont dans le meme contexte d'empilement.

### Solution

Modifier `src/pages/TrainingMode.tsx` avec 2 changements :

1. **Ajouter `pointer-events: none` sur le conteneur de la carte** pour empecher Google Maps d'intercepter les clics sur les zones ou se trouvent nos boutons. Puis remettre `pointer-events: auto` sur le div interne de la carte pour que le pan/zoom fonctionne toujours.

2. **Ajouter `pointer-events: auto` explicitement** sur la barre du haut, le bouton "Terminer", et le toast off-route.

3. **Transformer `stopTracking` en appel asynchrone avec `await`** dans les handlers de clic, car `stopTracking()` est une fonction `async` qui peut rejeter une promesse non geree, causant un crash silencieux qui empeche `navigate(-1)` de s'executer.

### Details techniques

Dans `src/pages/TrainingMode.tsx` :

- Le conteneur racine `fixed inset-0` recoit un style qui isole les couches
- La barre du haut et le bouton du bas recoivent `pointer-events-auto` en plus du z-index eleve
- Le handler du bouton retour et de "Terminer" utilisent des fonctions `async` avec `await stopTracking()` dans un `try/catch`, puis `navigate(-1)`
- Ajout d'une balise `<style>` globale pour forcer les overlays Google Maps a ne pas bloquer : `.gm-style > div:first-child > div:last-child { pointer-events: none !important; }` (cible les overlays de controle Google Maps)

