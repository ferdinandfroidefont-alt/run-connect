

## Plan: Feed communautaire d'itinéraires

### Concept
Ajouter sous l'onglet "Itinéraires" de la page "Mes Séances" deux sous-onglets : **Créés** (existant) et **Feed** (nouveau). Le Feed affiche les itinéraires publics d'autres utilisateurs, avec filtres par sport/distance, notation par etoiles, commentaires, photos geolocaliseees sur le parcours.

### Modifications base de donnees (3 nouvelles tables + 1 colonne)

**1. Colonne sur `routes`**
```sql
ALTER TABLE routes ADD COLUMN is_public boolean DEFAULT false;
ALTER TABLE routes ADD COLUMN activity_type text DEFAULT 'course';
```
+ Mise a jour RLS pour permettre SELECT sur routes publiques par tout utilisateur authentifie.

**2. Table `route_photos`**
```sql
CREATE TABLE route_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  lat numeric,
  lng numeric,
  caption text,
  created_at timestamptz DEFAULT now()
);
```
RLS: auteur peut CRUD, tout authentifie peut SELECT sur routes publiques.

**3. Table `route_ratings`**
```sql
CREATE TABLE route_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(route_id, user_id)
);
```
RLS: auteur peut INSERT/UPDATE/DELETE ses propres ratings, tout authentifie peut SELECT.

**4. Storage bucket `route-photos`** (public)

### Fichiers front a creer

**1. `src/hooks/useRoutesFeed.tsx`**
- Hook qui charge les routes publiques (`is_public = true`) avec profils createurs, moyenne ratings, nombre de photos
- Filtres : activite, distance max (geolocalisee), distance du parcours
- Pagination / infinite scroll

**2. `src/components/routes-feed/RoutesFeedCard.tsx`**
- Carte reprenant le style DiscoverCard (pastel par activite)
- Minimap du parcours avec markers photo (petites vignettes rondes sur la carte)
- Stats (distance, denivele, duree estimee)
- Note moyenne (etoiles)
- Avatar + nom du createur
- Bouton "Voir" qui ouvre le detail

**3. `src/components/routes-feed/RoutesFeedFilters.tsx`**
- Meme structure que DiscoverFilters : pills sport en haut, filtre distance max
- Filtre supplementaire : distance du parcours (slider km)

**4. `src/components/routes-feed/RouteDetailDialog.tsx`**
- Dialog plein ecran avec :
  - Carte Google Maps grande avec polyline + markers photos (vignettes rondes cliquables)
  - Click sur marker photo → affichage plein ecran (lightbox)
  - Stats completes
  - Section notation : etoiles cliquables + champ commentaire
  - Liste des avis existants (avatar, etoiles, commentaire, date)
  - Bouton "Copier l'itineraire" (clone la route dans ses propres routes)
  - Bouton "Mode Entrainement"

**5. `src/components/routes-feed/RoutePhotoUploader.tsx`**
- Composant pour ajouter des photos a un itineraire
- L'utilisateur place la photo sur le parcours (click sur la carte ou auto-position)
- Upload vers bucket `route-photos`

### Modifications fichiers existants

**1. `src/pages/MySessions.tsx`**
- Sous l'onglet "Itineraires" : ajouter sous-onglets "Crées" / "Feed" (meme pattern que Creees/Rejointes sous Seances)
- Etat `routeSource: 'created' | 'feed'`
- Si `feed` → afficher composant RoutesFeed
- Ajouter toggle "Publier" sur les RouteCard existantes (switch `is_public`)

**2. `src/components/RouteCard.tsx`**
- Ajouter un switch ou bouton pour toggle `is_public`
- Afficher un badge "Public" si publie
- Ajouter bouton "Ajouter photos" qui ouvre RoutePhotoUploader

### Architecture technique

```text
MySessions
  ├── Seances [Creees | Rejointes]
  └── Itineraires [Crées | Feed]
                          │
                    RoutesFeedFilters (sport pills + distance)
                          │
                    RoutesFeedCard[] (infinite scroll)
                          │
                    RouteDetailDialog
                      ├── Carte + photos geo
                      ├── Notation etoiles
                      └── Commentaires
```

### Ordre d'implementation
1. Migration DB (colonnes routes + tables route_photos, route_ratings + bucket)
2. Hook `useRoutesFeed`
3. Composants feed (filters, card, detail dialog, photo uploader)
4. Integration dans MySessions (sous-onglets + toggle public sur RouteCard)

