
# Parcours 3D -- Visualisation 3D des deniveles avec survol anime

## Objectif
Remplacer/completer le profil d'elevation SVG actuel par une visualisation 3D immersive du parcours, avec un terrain en relief et une animation de survol (camera qui suit le trace automatiquement).

## Ce qui sera cree

### 1. Nouveau composant `ElevationProfile3D.tsx`
Un composant React Three Fiber qui affiche le parcours en 3D :
- **Terrain 3D** : Le trace est rendu comme un ruban/tube 3D suivant les coordonnees GPS, avec la hauteur correspondant a l'elevation reelle
- **Sol** : Un plan de base semi-transparent sous le trace pour donner de la profondeur
- **Survol anime** : La camera suit automatiquement le parcours du debut a la fin en boucle (animation Flyover)
- **Couleurs dynamiques** : Le trace change de couleur selon l'altitude (vert = bas, rouge = haut) avec un degradevertical
- **Controles utilisateur** : Bouton play/pause pour l'animation, possibilite de tourner manuellement avec OrbitControls quand l'animation est en pause
- **Stats overlay** : Distance, D+, D- affiches en superposition sur la scene 3D

### 2. Integration dans les pages existantes

**RouteCreation.tsx** : Ajout d'un bouton "Vue 3D" a cote du profil d'elevation existant. Au clic, le profil SVG est remplace par la vue 3D dans le meme espace.

**InteractiveMap.tsx** : Meme logique -- un toggle "2D / 3D" sur le panneau d'elevation pendant la creation de parcours.

**RouteCard.tsx** : Option d'ouvrir la vue 3D en plein ecran (dialog) depuis la carte de l'itineraire.

### 3. Composant `ElevationProfile3DDialog.tsx`
Un dialog plein ecran pour afficher la vue 3D de maniere immersive, accessible depuis n'importe quelle carte d'itineraire.

## Details techniques

### Technologies utilisees
- `@react-three/fiber` (v8.18 -- deja installe)
- `@react-three/drei` (v9.122 -- deja installe)
- `three` (v0.160 -- deja installe)
- `framer-motion` pour les transitions d'UI

### Architecture du rendu 3D

```text
Canvas
  +-- PerspectiveCamera (animee sur le trace)
  +-- OrbitControls (actifs quand animation en pause)
  +-- Lights (ambient + directional)
  +-- TerrainMesh (plan de base avec grille)
  +-- RouteTube (tube 3D suivant les coordonnees)
  +-- ElevationMarkers (points min/max)
  +-- RunnerDot (sphere animee qui suit le parcours)
```

### Conversion des coordonnees
- Les coordonnees GPS (lat/lng) sont projetees en espace local (metres relatifs au centre du parcours)
- L'elevation est exageree par un facteur configurable (x2 par defaut) pour un rendu plus dramatique
- Les coordonnees sont lissees (Catmull-Rom) pour un trace fluide

### Animation de survol
- La camera suit une courbe Catmull-Rom parallele au trace, decalee en hauteur et lateralement
- Duree configurable (10s par defaut pour un tour complet)
- Easing smooth avec acceleration/deceleration aux extremites
- La sphere "runner" avance sur le trace en synchronisation avec la camera

### Props du composant

```text
ElevationProfile3D
  - coordinates: {lat, lng}[]     -- Points GPS du parcours
  - elevations: number[]          -- Altitudes correspondantes
  - activityType?: string         -- Pour la couleur du trace
  - autoPlay?: boolean            -- Demarrer l'animation auto
  - elevationExaggeration?: number -- Facteur d'exageration (defaut: 2)
  - className?: string
```

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/ElevationProfile3D.tsx` | Creer -- Composant 3D principal |
| `src/components/ElevationProfile3DDialog.tsx` | Creer -- Dialog plein ecran |
| `src/components/ElevationProfile.tsx` | Modifier -- Ajouter toggle 2D/3D |
| `src/pages/RouteCreation.tsx` | Modifier -- Integrer le toggle 3D |
| `src/components/RouteCard.tsx` | Modifier -- Bouton "Vue 3D" |
