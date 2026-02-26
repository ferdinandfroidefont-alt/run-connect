
Objectif: corriger définitivement “Continuer le plan” pour charger le vrai programme de l’athlète (bonne semaine) + garantir l’affichage RCC.

1) Synchroniser la semaine du suivi vers le planificateur
- `WeeklyTrackingView.tsx`  
  - Étendre `onOpenPlanForAthlete` → `(athleteId, athleteName, groupId?, weekDate?)`.
  - Au clic sur “Continuer le plan”, passer `currentWeek`.
- `WeeklyTrackingDialog.tsx`  
  - Ajouter état `planWeekDate`.
  - Stocker `weekDate` dans `handleOpenPlanForAthlete`.
  - Passer `initialWeek={planWeekDate}` à `WeeklyPlanDialog`.

2) Forcer le reset de contexte à chaque ouverture du plan
- `WeeklyPlanDialog.tsx` (effet d’ouverture)
  - Réinitialiser explicitement:
    - `setCurrentWeek(initialWeek ?? new Date())`
    - `setActiveGroupId(initialGroupId ?? "club")`
    - `setTargetAthletes([])` puis préselection athlète.
  - Éviter toute conservation de semaine/groupe d’une ouverture précédente.

3) Fiabiliser le chargement des séances athlète (sans rater de séance)
- `WeeklyPlanDialog.tsx` (`loadSentSessions`)
  - Remplacer la logique “participations d’abord” par:
    1. Charger les `coaching_sessions` de la semaine + club (`weekStart..weekEnd`).
    2. Charger `coaching_participations` filtrées par `focusedAthleteId` + `in(sessionIdsSemaine)`.
    3. Garder uniquement les sessions de la semaine liées à ces participations.
  - Puis mapper vers `WeekSession[]` (inclure `rcc_code`) et injecter dans `groupPlans[activeGroupId]`.
  - Conserver `setTargetAthletes([focusedAthleteId])`.

4) Vérifier l’affichage RCC en suivi athlète
- `WeeklyTrackingView.tsx`
  - Garder l’affichage existant de `dayData.session.rcc_code` sous distance/allure.
  - Ajouter fallback visuel léger si besoin (`trim()` avant rendu) pour éviter un cas de chaîne vide.

5) Validation manuelle ciblée
- Cas test: Athlète “Ferdinand”.
- Ouvrir Suivi athlète sur la semaine contenant jeudi.
- Vérifier que la carte séance affiche bien le RCC (ex: `4x1000 > 3'15`).
- Cliquer “Continuer le plan”.
- Vérifier dans `WeeklyPlanDialog`:
  - athlète déjà sélectionné,
  - même semaine que le suivi,
  - séance du jeudi visible dans le calendrier.
