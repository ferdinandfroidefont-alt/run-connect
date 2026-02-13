

# Plan de Refonte : Reputation, Live Tracking et Sondages

Ce plan couvre les 3 piliers demandes avec la structure de base de donnees, la logique metier et les composants UI.

---

## 1. Systeme d'Avis Post-Seance (Notes du Createur)

### Base de donnees

Nouvelle table `session_ratings` :

```text
session_ratings
+------------------+-------------------+
| Colonne          | Type              |
+------------------+-------------------+
| id               | uuid (PK)         |
| session_id       | uuid (FK sessions)|
| reviewer_id      | uuid (FK auth)    |
| organizer_id     | uuid (FK auth)    |
| rating           | integer (1-5)     |
| comment          | text (max 200)    |
| created_at       | timestamptz       |
+------------------+-------------------+
UNIQUE(session_id, reviewer_id) -- un seul avis par participant par seance
```

Nouvelle colonne sur `profiles` :
- `organizer_avg_rating` (numeric, default null) -- cache de la moyenne

### RLS
- INSERT : `auth.uid() = reviewer_id` ET le reviewer est dans `session_participants` avec `confirmed_by_gps = true`
- SELECT : tout utilisateur authentifie
- Pas d'UPDATE ni DELETE (avis definitifs)

### Logique metier
- L'avis n'est disponible qu'apres la fin de la seance (scheduled_at + 2h)
- On ne peut pas noter sa propre seance
- Un trigger SQL recalcule `profiles.organizer_avg_rating` a chaque INSERT
- La note moyenne est affichee sur le profil public et impacte le tri des seances dans la recherche

### Composants UI
- **`RateSessionDialog.tsx`** : Dialog iOS avec 5 etoiles tactiles + champ commentaire court. Apparait automatiquement quand l'utilisateur ouvre une seance terminee qu'il n'a pas encore notee.
- **Affichage dans `SessionDetailsDialog`** : Section "Avis des participants" avec les notes et commentaires
- **Affichage dans `ProfilePreviewDialog`** et `PublicProfile` : Badge etoile avec la moyenne (ex: 4.8/5)

---

## 2. Streaks (Amelioration du systeme existant)

### Etat actuel
Le composant `StreakBadge.tsx` et la table `user_stats` existent deja avec `streak_weeks`. Le systeme est fonctionnel mais la mise a jour est manuelle.

### Ameliorations prevues
- **Calcul automatique** : Un trigger sur `session_participants` (quand `confirmed_by_gps` passe a `true`) verifie si l'utilisateur a deja participe cette semaine. Si c'est la premiere participation de la semaine, incrementer `streak_weeks` ou le remettre a 1 si la semaine precedente n'avait pas d'activite.
- **Cron hebdomadaire** : Un edge function `update-streaks` qui tourne chaque lundi pour remettre a 0 les streaks des utilisateurs sans activite la semaine precedente.
- **Visibilite** : Le `StreakBadge` compact sera affiche a cote du nom d'utilisateur dans le leaderboard, les participants de seance, et le profil public.

---

## 3. Live Tracking (Tracing GPS en temps reel)

### Base de donnees

Nouvelle colonne sur `sessions` :
- `live_tracking_enabled` (boolean, default false) -- option a la creation
- `live_tracking_active` (boolean, default false) -- statut en cours
- `live_tracking_started_at` (timestamptz, nullable)
- `live_tracking_max_duration` (integer, default 120) -- minutes, securite

Nouvelle table `live_tracking_points` (donnees temporaires) :

```text
live_tracking_points
+------------------+-------------------+
| Colonne          | Type              |
+------------------+-------------------+
| id               | uuid (PK)         |
| session_id       | uuid (FK sessions)|
| user_id          | uuid (FK auth)    |
| lat              | numeric           |
| lng              | numeric           |
| accuracy         | numeric           |
| recorded_at      | timestamptz       |
+------------------+-------------------+
INDEX sur (session_id, recorded_at DESC) pour requetes performantes
```

### RLS
- INSERT sur `live_tracking_points` : seulement le `organizer_id` de la seance
- SELECT sur `live_tracking_points` : seulement les utilisateurs dans `session_participants` de cette seance
- Pas d'UPDATE ni DELETE cote client

### Logique de securite (coupure automatique)
1. **Bouton "Demarrer la seance"** dans `SessionDetailsDialog` : visible uniquement par le createur, active `live_tracking_active = true` et demarre le watch GPS Capacitor
2. **Bouton "Terminer la seance"** : coupe le GPS et passe `live_tracking_active = false`
3. **Coupure automatique serveur** : Un cron edge function `cleanup-live-tracking` toutes les 5 minutes qui :
   - Met `live_tracking_active = false` si `live_tracking_started_at + live_tracking_max_duration < NOW()`
   - Supprime les points de tracking plus vieux que 24h (donnees temporaires)
4. **Coupure cote client** : Un `useEffect` qui verifie toutes les 30s si la duree max est depassee et coupe le watch GPS local

### Composants UI
- **Option dans le wizard de creation** : Toggle "Activer le Live Tracking" dans `DetailsStep`
- **`LiveTrackingControls.tsx`** : Boutons Start/Stop pour le createur dans le detail de seance
- **`LiveTrackingMap.tsx`** : Overlay sur la carte Google Maps avec le trace du createur (polyline) et un marqueur anime pour sa position actuelle. Utilise Supabase Realtime (`postgres_changes`) pour les mises a jour en direct.
- **Hook `useLiveTracking.tsx`** : Gere le watch GPS Capacitor, l'envoi des points toutes les 5s, et la coupure automatique

### Flux de donnees

```text
Createur clique "Demarrer"
    |
    v
Capacitor watchPosition (5s interval)
    |
    v
INSERT dans live_tracking_points
    |
    v
Supabase Realtime broadcast
    |
    v
Participants voient le trace en direct
    |
    v
Createur clique "Terminer" OU duree max atteinte
    |
    v
GPS coupe + live_tracking_active = false
    |
    v
Cron supprime les points apres 24h
```

---

## 4. Sondages de Groupe dans le Chat

### Base de donnees

Nouvelle table `polls` :

```text
polls
+------------------+-------------------+
| Colonne          | Type              |
+------------------+-------------------+
| id               | uuid (PK)         |
| conversation_id  | uuid (FK)         |
| session_id       | uuid (FK, nullable)|
| creator_id       | uuid (FK auth)    |
| question         | text              |
| options          | jsonb             |
| expires_at       | timestamptz       |
| created_at       | timestamptz       |
+------------------+-------------------+
```

Le champ `options` stocke un tableau JSON :
```text
[
  { "id": "opt1", "text": "17h00", "votes": ["user-id-1", "user-id-2"] },
  { "id": "opt2", "text": "18h00", "votes": ["user-id-3"] }
]
```

### RLS
- INSERT : `auth.uid() = creator_id` ET l'utilisateur est membre de la conversation
- SELECT : membres de la conversation uniquement
- UPDATE : membres de la conversation (pour voter)
- DELETE : seulement le createur

### Composants UI
- **`CreatePollDialog.tsx`** : Interface iOS pour creer un sondage (question + 2 a 6 options + duree optionnelle). Accessible via un bouton dans la barre d'outils du chat.
- **`PollCard.tsx`** : Carte inline dans le fil de messages (type `message_type = 'poll'`). Affiche les options avec des barres de progression horizontales, le nombre de votes, et un indicateur si l'utilisateur a deja vote.
- **Integration dans Messages.tsx** : Ajout du type `poll` dans le rendu des messages. Le sondage est envoye comme un message normal avec `message_type = 'poll'` et `content = poll_id`.

---

## Resume technique

### Migrations SQL (5 operations)
1. CREATE TABLE `session_ratings` + RLS
2. ALTER TABLE `profiles` ADD `organizer_avg_rating`
3. ALTER TABLE `sessions` ADD `live_tracking_enabled`, `live_tracking_active`, `live_tracking_started_at`, `live_tracking_max_duration`
4. CREATE TABLE `live_tracking_points` + RLS + INDEX
5. CREATE TABLE `polls` + RLS

### Nouveaux fichiers (8)
- `src/components/RateSessionDialog.tsx`
- `src/components/LiveTrackingControls.tsx`
- `src/components/LiveTrackingMap.tsx`
- `src/hooks/useLiveTracking.tsx`
- `src/components/CreatePollDialog.tsx`
- `src/components/PollCard.tsx`
- `supabase/functions/cleanup-live-tracking/index.ts`
- `supabase/functions/update-streaks/index.ts`

### Fichiers modifies (6)
- `src/components/SessionDetailsDialog.tsx` -- avis + live tracking controls
- `src/components/session-creation/steps/DetailsStep.tsx` -- toggle live tracking
- `src/pages/Messages.tsx` -- rendu des sondages + bouton creation
- `src/pages/PublicProfile.tsx` -- affichage note moyenne
- `src/components/ProfilePreviewDialog.tsx` -- badge note
- `src/components/StreakBadge.tsx` -- ameliorations mineures

### Ordre d'implementation
1. Migrations SQL (toutes les tables d'abord)
2. Avis post-seance (rating + UI)
3. Amelioration streaks (trigger + cron)
4. Sondages de groupe (table + composants)
5. Live Tracking (le plus complexe, en dernier)

