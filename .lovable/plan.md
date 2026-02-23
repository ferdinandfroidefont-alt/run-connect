

## Utiliser la puce bleue native Google Maps sur la page Suivi d'itineraire

### Constat

- L'ecran d'accueil (InteractiveMap) affiche la puce bleue native de Google Maps (point bleu Google `#4285F4` avec halo clair et animation fluide).
- La page Suivi d'itineraire (TrainingMode) cree un marqueur custom avec une couleur differente (`#5B7CFF`), une taille et un style differents.

### Solution

Supprimer le marqueur custom et activer la puce bleue native de Google Maps sur la page Suivi d'itineraire. Le suivi de position restera actif pour le recentrage automatique.

### Modifications - Fichier `src/pages/TrainingMode.tsx`

1. **Supprimer la creation manuelle du blue dot** : retirer les fonctions `createBlueDot` et tout le code qui cree un `AdvancedMarkerElement` ou `google.maps.Marker` pour la position utilisateur (les deux `useEffect` qui gerent `markerRef`).

2. **Supprimer `markerRef`** : plus besoin de gerer manuellement un marqueur.

3. **Supprimer le style CSS `@keyframes pulse-ring`** : plus necessaire puisque Google Maps gere sa propre animation.

4. **Conserver le recentrage automatique** : garder le `useEffect` qui suit `userPosition` mais au lieu de deplacer un marqueur, simplement appeler `map.panTo(userPosition)` pour que la camera suive la position.

5. **Conserver `getInitialPosition`** : au chargement, recuperer la position GPS et centrer la carte dessus via `map.panTo()` et `map.setZoom(16)`.

### Detail technique

La puce bleue native de Google Maps s'affiche automatiquement quand le navigateur fournit la geolocalisation. Comme la page demande deja les permissions GPS et suit la position, la puce apparaitra naturellement. Le resultat sera un point bleu identique a celui de l'ecran d'accueil.

### Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/TrainingMode.tsx` | Supprimer le marqueur custom, garder le recentrage automatique via `panTo` |

