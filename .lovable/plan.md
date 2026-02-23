

## Refonte complete du mode 3D des itineraires

### Problemes identifies

1. **Camera trop rapide** : vitesse `0.002 * delta * 60` sans interpolation, mouvements saccades
2. **Trace vert neon illisible** : couleurs HSL vert-jaune-rouge avec `lineWidth: 4` trop fin
3. **Animation automatique agressive** : `autoPlay = true` par defaut, la camera bouge immediatement
4. **Zoom instable** : pas de limites sur OrbitControls (minDistance/maxDistance)
5. **Pas de bouton recentrer** : seulement Play/Pause et Reset
6. **Fond trop sombre** : `#0a0a1a` difficile a lire

### Modifications - Fichier `src/components/ElevationProfile3D.tsx`

**1. Camera - Ralentir et lisser**

- Reduire la vitesse de `0.002` a `0.0005` (4x plus lent)
- Ajouter une interpolation douce via `THREE.Vector3.lerp` sur la position camera au lieu de la teleporter directement (`lerpFactor = 0.03`)
- Augmenter le look-ahead de 10 a 30 points pour un mouvement plus previsible
- Augmenter la hauteur camera de `pos.y + 60` a `pos.y + sceneSize * 0.3` pour une vue semi-isometrique stable

**2. Mode survol par defaut (pas d'animation auto)**

- Changer `autoPlay` par defaut a `false`
- Le composant demarre en mode statique : vue semi-isometrique inclinee a ~45 degres
- L'utilisateur peut tourner/zoomer manuellement via OrbitControls
- Bouton Play pour lancer le survol si desire
- Ajouter un bouton "Recentrer" (icone Crosshair) qui remet la camera a la position initiale

**3. Trace lisible - couleur bleue de l'app**

- Remplacer la palette vert-jaune-rouge par un trace uniforme bleu `#5B7CFF` (couleur primaire)
- Augmenter `lineWidth` de 4 a 6
- Ajouter un deuxieme `Line` en dessous avec `lineWidth: 12`, couleur `#5B7CFF`, opacite 0.15 pour creer un effet de halo/ombre douce
- Supprimer le `vertexColors` pour garder une couleur constante lisible

**4. Stabiliser le zoom (OrbitControls)**

- Ajouter `minDistance={sceneSize * 0.2}` et `maxDistance={sceneSize * 3}`
- Reduire `dampingFactor` de `0.05` a `0.08` pour plus de fluidite
- Ajouter `rotateSpeed={0.5}` pour ralentir la rotation manuelle
- Garder `maxPolarAngle={Math.PI / 2.2}` pour empecher de passer sous le sol

**5. Angle de vue initial semi-isometrique**

- Camera initiale : position a `(center.x + sceneSize * 0.6, center.y + sceneSize * 0.5, center.z + sceneSize * 0.6)`
- Inclinaison ~40 degres, ni trop vertical ni trop horizontal
- OrbitControls target au centre de la bounding box du trace

**6. Sol et grille plus subtils**

- Changer la couleur du sol de `#1a1a2e` a `#111118` avec opacite 0.3
- Reduire les subdivisions de la grille
- Adoucir le fog pour un horizon plus propre

**7. Runner dot plus discret**

- Reduire la taille de la sphere de 3 a 2
- Couleur primaire `#5B7CFF` conservee mais `emissiveIntensity` reduit a 0.3

**8. Boutons de controle**

- Garder Play/Pause et Reset
- Ajouter un bouton "Recentrer" (icone `Locate`) qui repositionne la camera a la vue initiale avec une transition douce
- Les boutons restent en bas a gauche, meme style

### Modifications - Fichier `src/components/ElevationProfile3DDialog.tsx`

- Passer `autoPlay={false}` au lieu de `autoPlay` (qui est true) pour que le dialog s'ouvre en mode contemplatif

### Modifications - Fichier `src/components/ElevationProfile.tsx`

- Passer `autoPlay={false}` au composant inline aussi

### Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/ElevationProfile3D.tsx` | Camera lente avec lerp, trace bleu + halo, OrbitControls stabilises, vue initiale semi-isometrique, bouton recentrer, pas d'autoplay |
| `src/components/ElevationProfile3DDialog.tsx` | `autoPlay={false}` |
| `src/components/ElevationProfile.tsx` | `autoPlay={false}` |

