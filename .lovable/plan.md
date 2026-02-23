

## Nouvelle page : Suivi des participants en temps reel

### Concept

Depuis la page "Confirmer une seance", ajouter une option "Suivre les participants" qui ouvre une carte plein ecran (meme structure que TrainingMode) affichant en temps reel la position des participants sous forme de photo de profil ronde sur la carte. Si la seance comporte un itineraire, il est aussi affiche.

### Architecture

```text
Flux utilisateur :
ConfirmPresence -> choix role -> choix seance -> "Suivre les participants"
                                                       |
                                                       v
                                    /session-tracking/:sessionId
                                    (carte plein ecran, meme style que TrainingMode)
```

### Fichiers a creer

**1. `src/pages/SessionTracking.tsx`** - Page principale

Structure identique a `TrainingMode.tsx` :
- Barre du haut : `bg-card pt-[env(safe-area-inset-top)]` avec fleche Retour
- Carte Google Maps plein ecran (isolation stacking context, `z-index: 0`)
- Chargement de la cle API via `google-maps-proxy`
- Si la seance a un `route_id` : charger les coordonnees depuis `routes` et afficher la polyline orange (#FF6B35)
- Sinon : carte centree sur `location_lat/lng` de la seance

Marqueurs participants :
- Charger les `session_participants` avec profils (avatar_url, username)
- Pour chaque participant, creer un `google.maps.Marker` avec icone generee via Canvas :
  - Photo de profil ronde (40x40px) avec bordure blanche et ombre
  - Utiliser `imageUrlToBase64()` de `map-marker-generator.ts` pour convertir l'avatar
  - Dessiner sur Canvas : cercle clippe avec la photo, bordure blanche 3px
- Le marqueur de l'utilisateur courant utilise la puce bleue existante (`createBlueDotIcon`)

Position temps reel :
- L'utilisateur courant envoie sa position toutes les 5s dans `live_tracking_points` (reutiliser la logique de `useLiveTracking`)
- Ecouter les `postgres_changes` INSERT sur `live_tracking_points` filtre par `session_id`
- A chaque nouveau point recu, deplacer le marqueur correspondant (`marker.setPosition()`)

**2. `src/hooks/useSessionTracking.ts`** - Hook dedie

- Charge les participants + profils
- Demarre le GPS et envoie la position dans `live_tracking_points`
- Ecoute les updates realtime de tous les participants
- Maintient un `Map<userId, {lat, lng, avatar_url, username}>` des positions
- Charge l'itineraire si `route_id` existe sur la seance

### Fichiers a modifier

**3. `src/App.tsx`**
- Ajouter la route `/session-tracking/:sessionId`

**4. `src/pages/ConfirmPresence.tsx`**
- Ajouter un bouton "Suivre les participants sur la carte" dans l'ecran de selection de seance ou apres avoir selectionne une seance
- Bouton avec icone MapPin qui navigue vers `/session-tracking/${session.id}`

### Detail technique des marqueurs

```text
Pour chaque participant :
1. Fetch avatar_url depuis profiles
2. imageUrlToBase64(avatar_url) -> base64
3. Canvas 48x48 :
   - drawImage(avatar, clippe en cercle rayon 21px)
   - strokeStyle white, lineWidth 3px
   - shadow blur 4px
4. canvas.toDataURL() -> icon URL
5. new google.maps.Marker({ icon: { url, scaledSize: 48x48 } })
```

### Mise a jour RLS

La table `live_tracking_points` a deja les bonnes policies :
- INSERT : autorise si l'utilisateur est organisateur ET `live_tracking_active = true`
- SELECT : autorise si participant ou organisateur

Il faudra modifier la policy INSERT pour aussi autoriser les participants (pas seulement l'organisateur) a inserer leurs points de tracking :

```sql
-- Nouvelle policy : les participants peuvent aussi envoyer leur position
CREATE POLICY "Participants can insert tracking points"
ON live_tracking_points FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = live_tracking_points.session_id
    AND sp.user_id = auth.uid()
  )
);
```

### Resume des fichiers

| Fichier | Action |
|---------|--------|
| `src/pages/SessionTracking.tsx` | Creer - carte plein ecran avec marqueurs photos |
| `src/hooks/useSessionTracking.ts` | Creer - hook GPS + realtime + participants |
| `src/App.tsx` | Modifier - ajouter route `/session-tracking/:sessionId` |
| `src/pages/ConfirmPresence.tsx` | Modifier - ajouter bouton "Suivre sur la carte" |
| Migration SQL | Ajouter policy INSERT pour participants sur `live_tracking_points` |

