

## Mode Entrainement - Suivi d'itineraire en temps reel

### Vue d'ensemble

Creer un ecran plein ecran dedie au suivi d'itineraire pendant une seance de course, accessible depuis la fiche seance (`SessionDetailsDialog`) quand un itineraire est attache. L'ecran affiche la carte avec le trace, la position GPS en temps reel, une boussole, la distance restante, et detecte les sorties de parcours.

### Fichiers a creer

#### 1. `src/pages/TrainingMode.tsx` - Page plein ecran

Page autonome sans Layout (plein ecran comme `/auth`), recevant `sessionId` en param URL. Au montage :
- Charge la session et son itineraire depuis Supabase (`sessions` + `routes`)
- Initialise Google Maps plein ecran (fond clair, UI minimale)
- Dessine le trace (polyline bleu primaire `#5B7CFF`, epaisseur 4px)
- Demarre le suivi GPS

Elements UI :
- **Barre du haut** : distance restante ("2.3 km restants"), fond semi-transparent flouté
- **Boussole** : coin haut droit, icone 24px, rotation selon `DeviceOrientationEvent` (ou heading GPS en fallback)
- **Point bleu iOS** : cercle bleu 14px avec halo semi-transparent pulse, mis a jour toutes les 3-5 secondes
- **Bouton "Terminer"** : bas de l'ecran, style iOS destructive

Logique GPS :
- Utiliser `Geolocation.watchPosition` sur natif, `navigator.geolocation.watchPosition` sur web
- `enableHighAccuracy: true`, intervalle ~3s (via `minimumUpdateInterval` sur Capacitor)
- Filtrer les points avec accuracy > 50m (GPS instable)
- Smoothing : moyenner avec le point precedent si saut > 20m

Distance restante :
- Projeter la position courante sur le segment le plus proche du trace
- Calculer la distance entre ce point projete et la fin du trace (somme des segments restants)

Detection sortie de trace :
- Si distance au segment le plus proche > 30m pendant > 5s : vibration (`navigator.vibrate(200)`) + toast discret
- Cooldown de 30s entre alertes pour eviter le spam

#### 2. `src/hooks/useTrainingMode.ts` - Hook principal

Gere tout l'etat et la logique :
- `routeCoordinates: {lat, lng}[]` - le trace charge
- `userPosition: {lat, lng} | null` - position GPS courante
- `heading: number` - orientation pour la boussole
- `remainingDistance: number` - distance restante en km
- `isOffRoute: boolean` - detecte si hors trace
- `isActive: boolean` - mode actif ou non
- `startTracking()` / `stopTracking()` - demarrage/arret
- `elapsedTime: number` - temps ecoule

Fonctions internes :
- `projectOnRoute(point, routeCoords)` : trouve le point le plus proche sur le trace
- `calculateRemainingDistance(projectedIndex, routeCoords)` : somme des segments restants
- `checkOffRoute(point, routeCoords, threshold)` : verifie si hors trace

### Fichiers a modifier

#### 3. `src/App.tsx` - Ajouter la route

```
<Route path="/training/:sessionId" element={<PageTransition><TrainingMode /></PageTransition>} />
```

Sans Layout (plein ecran).

#### 4. `src/components/SessionDetailsDialog.tsx` - Bouton "Demarrer le suivi"

Ajouter un bouton dans la section actions (entre le bouton GPS et le partage), visible uniquement si :
- La session a un itineraire (`session.routes`)
- L'utilisateur est participant ou organisateur
- La session est programmee (pas terminee)

Le bouton utilise `useNavigate` vers `/training/${session.id}`.

Style : bouton iOS avec icone `Navigation` (lucide), fond bleu primaire, texte "Mode Entrainement".

### Details techniques

| Aspect | Choix |
|--------|-------|
| Frequence GPS | ~3s (watchPosition, pas de polling) |
| Seuil hors trace | 30m pendant 5s |
| Filtrage GPS | Ignorer accuracy > 50m, smooth sauts > 20m |
| Boussole | `DeviceOrientationEvent` (iOS demande permission), fallback heading GPS |
| Vibration | `navigator.vibrate(200)` (Android), pas de vibration sur iOS web |
| Carte | Google Maps, style minimal, pas de labels routes |
| Couleur trace | `#5B7CFF` (bleu primaire app) |
| Ecran allume | `navigator.wakeLock.request('screen')` si disponible |

### Optimisation batterie

- GPS watchPosition au lieu de polling (le systeme gere la frequence)
- Pas de re-render carte a chaque position (mise a jour du marker seulement)
- Pas de calculs lourds a chaque frame (projection recalculee seulement quand position change)
- WakeLock pour eviter mise en veille ecran sans forcer un refresh constant

