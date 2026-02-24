

# P2 : Vue mesocycle + Notification rappel J-1

## Feature 1 : Vue mesocycle (4-8 semaines)

Ajouter une vue "Mesocycle" accessible depuis le `WeeklyPlanDialog` qui affiche un graphique Recharts de la charge sur 4-8 semaines passees. Le coach voit en un coup d'oeil la progression volume/intensite.

### Fichier impacte : `src/components/coaching/WeeklyPlanDialog.tsx`

- Ajouter un state `showMesocycle` (boolean)
- Ajouter un bouton dans la section ACTIONS : "Vue mesocycle (8 sem.)" avec icone `BarChart3`
- Au clic, affiche un panneau en dessous avec un `AreaChart` Recharts

### Nouveau composant : `src/components/coaching/MesocycleView.tsx`

- Props : `clubId: string`, `currentWeek: Date`
- Au montage, requete Supabase : `coaching_sessions` des 8 dernieres semaines pour le club
- Pour chaque semaine : parser les `rcc_code` avec `parseRCC` + `computeRCCSummary` pour calculer le km total et l'intensite
- Afficher un `AreaChart` avec :
  - Axe X : semaines (S-7 a S0)
  - Axe Y : km total
  - Coloration par intensite (vert = facile, orange = modere, rouge = intense)
- Sous le graphique : tableau resume (km, nb seances, intensite par semaine)

### Donnees :
```sql
SELECT id, rcc_code, scheduled_at 
FROM coaching_sessions 
WHERE club_id = ? AND scheduled_at >= (now - 8 weeks)
```
Pas de migration SQL necessaire — les donnees existent deja.

---

## Feature 2 : Notification rappel J-1

Creer une edge function `coaching-reminder` appelee par un cron pg_cron chaque jour a 18h. Elle envoie un push aux athletes qui ont une `coaching_session` le lendemain.

### Nouveau fichier : `supabase/functions/coaching-reminder/index.ts`

Logique :
1. Calculer `tomorrow` = demain (UTC)
2. Requeter `coaching_sessions` dont `scheduled_at` est dans la journee de demain
3. Pour chaque session, requeter `coaching_participations` avec status `sent` ou `scheduled`
4. Pour chaque participation, recuperer le `push_token` du profil
5. Envoyer un FCM push via le meme pattern que `send-push-notification` (Firebase JWT + FCM v1 API)
6. Body : "Demain : {titre_seance} a {heure}"

### Config : `supabase/config.toml`
```toml
[functions.coaching-reminder]
verify_jwt = false
```

### Cron job (via SQL insert tool, pas migration) :
```sql
SELECT cron.schedule(
  'coaching-reminder-daily',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url:='https://dbptgehpknjsoisirviz.supabase.co/functions/v1/coaching-reminder',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicHRnZWhwa25qc29pc2lydml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjIxNDUsImV4cCI6MjA3MDIzODE0NX0.D1uw0ui_auBAi-dvodv6j2a9x3lvMnY69cDa9Wupjcs"}'::jsonb,
    body:='{"time": "daily-18h"}'::jsonb
  ) AS request_id;
  $$
);
```

### Secrets necessaires :
L'edge function utilise `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, et `FIREBASE_SERVICE_ACCOUNT_JSON` — deja configures (utilises par `send-push-notification`).

---

## Resume des fichiers

| Fichier | Action |
|---|---|
| `src/components/coaching/MesocycleView.tsx` | Creer — graphique 8 semaines |
| `src/components/coaching/WeeklyPlanDialog.tsx` | Modifier — bouton + intégration MesocycleView |
| `supabase/functions/coaching-reminder/index.ts` | Creer — edge function rappel J-1 |
| `supabase/config.toml` | Modifier — ajouter `[functions.coaching-reminder]` |
| SQL (insert tool) | Cron pg_cron a 18h |

Aucune migration de schema. Pas de nouvelle table.

