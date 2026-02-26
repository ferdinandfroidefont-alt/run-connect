

## Diagnostic

Actuellement, l'intensite dans le MesocycleView est **auto-calculee** a partir des km hebdomadaires (>60km = "Tres intense", etc.). C'est faux car 6x3' peut etre facile ou tres dur selon le coureur. Le coach doit pouvoir definir le RPE (1-10) par seance.

De meme, le graphique segments (Volume / Intensite / Recup) dans CoachingTab se base sur des mots-cles dans l'objectif, pas sur une vraie donnee coach.

## Plan

### 1. Ajouter colonne `rpe` a la table `coaching_sessions`

- Migration SQL : `ALTER TABLE coaching_sessions ADD COLUMN rpe smallint CHECK (rpe >= 1 AND rpe <= 10);`

### 2. Ajouter un slider RPE dans `WeeklyPlanSessionEditor`

- Ajouter champ `rpe` a l'interface `WeekSession` (optionnel, 1-10)
- Ajouter un Slider (1-10) avec label "RPE (effort percu)" sous les notes coach
- Valeur par defaut : vide (non defini)
- Afficher le chiffre + pastille couleur (1-3 vert, 4-6 jaune, 7-8 orange, 9-10 rouge)

### 3. Sauvegarder le RPE lors de l'envoi du plan

- `WeeklyPlanDialog.handleSendPlan` : ajouter `rpe: session.rpe || null` dans l'insert `coaching_sessions`
- `CreateCoachingSessionDialog.handleSubmit` : idem

### 4. Adapter MesocycleView pour utiliser le RPE

- Charger `rpe` dans la requete `coaching_sessions`
- Calculer l'intensite hebdo a partir de la **moyenne des RPE** des seances :
  - Moyenne RPE >= 8 → "Tres intense"
  - Moyenne RPE >= 6 → "Intense"  
  - Moyenne RPE >= 4 → "Moderee"
  - Sinon → "Facile"
- Fallback sur l'ancienne methode (km) si aucun RPE n'est defini

### 5. Adapter le graphique segments dans CoachingTab

- Utiliser le RPE pour categoriser les seances :
  - **Recup** : RPE 1-3
  - **Volume** : RPE 4-6 (endurance fondamentale, effort modere)
  - **Fractionne** : RPE 7-10 (effort intense)
- Fallback sur le parsing des mots-cles objectif si RPE absent

### 6. Afficher le RPE dans WeeklyPlanCard et AthleteWeeklyView

- Badge RPE petit a cote de l'objectif sur chaque carte seance (ex: "RPE 7" en orange)

### Fichiers modifies
- `supabase/migrations/` — nouvelle migration `rpe` column
- `src/components/coaching/WeeklyPlanSessionEditor.tsx` — Slider RPE
- `src/components/coaching/WeeklyPlanDialog.tsx` — Envoi RPE + interface WeekSession
- `src/components/coaching/CreateCoachingSessionDialog.tsx` — Champ RPE
- `src/components/coaching/MesocycleView.tsx` — Intensite basee sur RPE
- `src/components/coaching/CoachingTab.tsx` — Segments Volume/Fractionne/Recup par RPE
- `src/components/coaching/WeeklyPlanCard.tsx` — Badge RPE
- `src/integrations/supabase/types.ts` — Type `rpe`

