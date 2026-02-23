

## Remplacer la vue 3D abstraite par une vraie carte 3D Google Maps

### Constat actuel

La vue 3D utilise Three.js avec un fond noir abstrait, une grille et un trace flottant dans le vide. L'utilisateur souhaite :
1. Une barre de retour identique aux autres pages (fleche + "Retour")
2. Une vraie carte 3D avec le terrain reel (satellite/relief Google Maps)

### Solution

Remplacer le Canvas Three.js par une carte Google Maps en mode satellite avec inclinaison 3D (`tilt: 45`), sur laquelle le trace de l'itineraire est dessine en polyline bleue. Google Maps supporte nativement la vue 3D avec terrain et batiments.

### Modifications

**Fichier 1 : `src/components/ElevationProfile3D.tsx`**

Refonte complete du composant :
- Supprimer Three.js (Canvas, OrbitControls, Line, useFrame, etc.)
- Utiliser Google Maps avec `mapTypeId: 'satellite'`, `tilt: 45`, `heading: 0`
- Dessiner le trace en `google.maps.Polyline` bleu (#5B7CFF) avec ombre
- Garder les boutons Play/Pause (animation du survol en deplacant la camera le long du trace), Recentrer, et le panneau de stats
- Le mode survol utilise `map.moveCamera()` ou `map.panTo()` avec interpolation douce le long des points du trace
- La cle API est recuperee via `google-maps-proxy` ou reutilisee si Google Maps est deja charge

Controles :
- Rotation/zoom manuels via les gestes natifs de Google Maps
- Bouton "Recentrer" : remet `tilt: 45`, `heading: 0`, zoom pour voir tout le trace
- Bouton Play : anime la camera le long du trace avec `tilt: 60`, direction orientee vers l'avant

**Fichier 2 : `src/components/ElevationProfile3DDialog.tsx`**

- Remplacer le `DialogHeader` actuel (gradient flottant) par la barre de retour standard :
  ```
  bg-card pt-[env(safe-area-inset-top)]
  fleche ArrowLeft + "Retour" a gauche
  titre centre "Vue 3D"
  ```
- Fermer le dialog au clic sur Retour via `onOpenChange(false)`

**Fichier 3 : `src/components/ElevationProfile.tsx`**

- Aucun changement fonctionnel, le composant inline continue d'utiliser `ElevationProfile3D` avec `autoPlay={false}`

### Detail technique du nouveau ElevationProfile3D

```text
Structure :
+------------------------------------------+
| [<- Retour]     Vue 3D                   |  (dans le Dialog)
+------------------------------------------+
|                                          |
|   Google Maps satellite + tilt 45deg     |
|   Polyline bleue sur le terrain reel     |
|                                          |
|   [Play] [Recentrer]      [Stats panel]  |
|   ====================================   |  (barre de progression)
+------------------------------------------+

Animation survol :
- Camera suit les coordonnees GPS reelles
- tilt: 60 pour vue immersive
- heading: oriente vers le prochain point
- Vitesse lente avec interpolation douce
```

### Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/ElevationProfile3D.tsx` | Remplacer Three.js par Google Maps 3D satellite avec polyline |
| `src/components/ElevationProfile3DDialog.tsx` | Barre retour standard identique aux autres pages |

