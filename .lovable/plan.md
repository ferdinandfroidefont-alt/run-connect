

# Mode Navigation Running - Plan d'implémentation

## Apercu
Réécriture complète de `TrainingMode.tsx` et extension de `useTrainingMode.ts` pour créer un mode navigation immersif type Komoot, sans statistiques sportives.

## Fichiers à modifier

### 1. `src/hooks/useTrainingMode.ts` - Ajouter la logique de navigation turn-by-turn

**Nouvelles fonctionnalités :**
- Calculer les virages à partir des coordonnées du tracé (détection d'angle entre segments > 30°)
- Exposer `nextTurn: { direction: 'left' | 'right' | 'straight' | 'u-turn', distanceMeters: number, streetName?: string }` dans le state
- Mettre à jour `nextTurn` dynamiquement quand `userPosition` change (projection sur route → prochain virage)
- Réduire le seuil off-route de 30m à 20m
- Ajouter vibration à 50m avant virage (`navigator.vibrate(100)`)
- Exposer `isPaused` + `pauseTracking` / `resumeTracking`

**Nouveau type :**
```ts
interface TurnInstruction {
  direction: 'left' | 'right' | 'slight-left' | 'slight-right' | 'straight' | 'u-turn';
  distanceMeters: number;
  segmentIndex: number;
}
```

**Logique de détection de virage :**
- Parcourir les segments, calculer l'angle entre chaque paire de segments consécutifs
- Angle > 30° et < 150° → left/right selon le signe
- Angle > 150° → u-turn
- Sinon → straight (pas d'instruction affichée)
- Pré-calculer au chargement de la route, stocker dans un `turnsRef`

### 2. `src/pages/TrainingMode.tsx` - Réécriture complète de l'UI

**Structure de l'écran :**

```text
┌──────────────────────────┐
│  BANDEAU DIRECTION (fixe) │  ← fond bleu primary, texte blanc
│  ⬆ 120 m  Tout droit      │
├──────────────────────────┤
│                          │
│                          │
│     CARTE IMMERSIVE      │  ← plein écran, orientée heading
│     (Google Maps)        │
│                          │
│         🔵 ←user         │  ← décalé vers le bas (70% de l'écran)
│                          │
│              ⏸  ✕        │  ← boutons flottants glass effect
└──────────────────────────┘
```

**Bandeau direction :**
- Fond `bg-primary` (bleu app), texte blanc
- Icône flèche (lucide: `ArrowUp`, `CornerUpLeft`, `CornerUpRight`, `UTurnLeft`)
- Distance avant virage en gros (ex: "120 m")
- Sous-texte "Tout droit" / "Tournez à gauche" etc.
- `pt-[env(safe-area-inset-top)]` pour safe area
- Animation slide quand l'instruction change

**Carte immersive :**
- `map.setHeading(userHeading)` pour orienter la carte selon la direction
- `map.setTilt(45)` pour vue 3D légère
- User décalé vers le bas : `map.panBy(0, -screenHeight * 0.2)` après chaque panTo
- `gestureHandling: 'none'` pour empêcher le scroll libre
- Zoom dynamique : zoom 18 par défaut, descendre à 17 si vitesse > 12 km/h
- Style carte minimal : masquer POI, labels secondaires via `map.setOptions({ styles: [...] })`

**Tracé itinéraire :**
- Couleur = `hsl(221, 83%, 53%)` (primary bleu)
- `strokeWeight: 7`
- Contour blanc via un second Polyline en dessous (`strokeWeight: 11, strokeColor: '#FFFFFF'`)
- `strokeOpacity: 1` pour le tracé bleu

**Position utilisateur :**
- Garder le blue dot Canvas actuel
- Ajouter une flèche directionnelle : dessiner un triangle orienté selon `heading` dans le Canvas (au-dessus du dot)
- Animation smooth : interpoler la position entre les updates GPS avec `requestAnimationFrame`

**Toast off-route :**
- Seuil réduit à 20m (au lieu de 30m)
- Message : "Vous êtes hors parcours" avec icône `AlertTriangle`
- Fond orange `#FF9500`

**Boutons flottants :**
- Bas centre de l'écran, `pb-[env(safe-area-inset-bottom)]`
- Bouton pause : rond 56px, fond `rgba(0,0,0,0.4) backdrop-blur-md`, icône `Pause` / `Play`
- Bouton quitter : rond 44px, fond `rgba(0,0,0,0.3) backdrop-blur-md`, icône `X`
- Espacement horizontal entre les deux

**Comportement :**
- Masquer `BottomNavigation` (déjà le cas car pas dans `<Layout>`)
- Auto-start tracking au chargement
- Pause : arrête le GPS watch, garde la carte visible, affiche "Navigation en pause" sur le bandeau
- Quitter : `stopTracking()` + navigate back

### 3. Pas de nouveaux fichiers nécessaires

Tout tient dans les 2 fichiers existants. Les icônes utilisent Lucide (`ArrowUp`, `CornerUpLeft`, `CornerUpRight`, `RotateCcw`, `Pause`, `Play`, `X`, `AlertTriangle`).

## Section technique

**Détection de virages (algorithme) :**
```
Pour chaque triplet de points (A, B, C) :
  angle = atan2(C.lng - B.lng, C.lat - B.lat) - atan2(B.lng - A.lng, B.lat - A.lat)
  normaliser angle entre -180° et 180°
  Si |angle| > 30° → virage
  Signe positif → droite, négatif → gauche
  |angle| > 150° → demi-tour
```

**Orientation carte :**
- `map.setHeading(heading)` à chaque update GPS (heading vient du deviceorientation ou du GPS)
- `map.setTilt(45)` une seule fois à l'init

**Décalage utilisateur vers le bas :**
- Après `map.panTo(userPos)`, appliquer `map.panBy(0, -150)` (pixels) pour pousser le point utilisateur vers le bas

**Styles carte minimaux :**
```js
[
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]
```

**Vibration pré-virage :**
- Dans `handlePosition`, si distance au prochain virage < 50m et pas encore vibré pour ce virage → `navigator.vibrate(100)`

