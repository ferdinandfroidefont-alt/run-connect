# Correction du défilement « Mon plan / Planification » par semaines

## Problèmes constatés

Dans `CoachPlanningExperience.tsx`, le défilement vertical fait basculer la vue d'une semaine à l'autre via `shiftWeekByScroll`. Deux bugs en découlent :

1. **`selectedDate` est avancée de +/- 7 jours en même temps que `weekAnchor`** (ligne 2846). Résultat : dans la semaine N+1 ou N+2, le jour mis en avant (« sélectionné », visuellement traité comme « aujourd'hui ») n'est plus la vraie date du jour mais un décalage de 7/14 jours. C'est ce que l'utilisateur décrit : « dans une semaine ou 2 semaines ça doit pas dire que dans 7 jours c'est le jour actuel ».
2. **Le recentrage sur aujourd'hui ne fonctionne qu'à l'arrivée** (effets lignes 2870 et 2886). Dès qu'on a scrollé, on ne revient jamais sur la vraie date du jour quand on retourne sur la semaine courante (les effets ne se redéclenchent pas car `weekAnchor` n'a pas changé).

## Correctifs à apporter

Fichier unique : `src/components/coaching/CoachPlanningExperience.tsx`.

### 1. Découpler `selectedDate` du scroll de semaine
Dans `shiftWeekByScroll` (~ ligne 2841) :
- Retirer le `setSelectedDate((current) => addWeeks/subWeeks(current, 1))`.
- Conserver uniquement `setWeekAnchor(...)`.

Conséquence : le surlignage « jour sélectionné = aujourd'hui » ne suit plus le défilement, donc plus aucune autre date n'est faussement présentée comme « aujourd'hui ».

### 2. Calculer le surlignage à partir de la vraie date du jour
Dans les deux blocs de rendu de jours (lignes ~3475 et ~3614), le `isSelectedDay` est utilisé pour tracer la mise en avant. Le compléter par un véritable `isToday = isSameDay(day, new Date())` et :
- Si la semaine affichée est la semaine courante : utiliser `isToday` pour la mise en avant principale.
- Si la semaine affichée n'est pas la semaine courante : aucune ligne ne doit être présentée comme « aujourd'hui ».

`isSelectedDay` reste utilisé seulement quand l'utilisateur tape explicitement un jour dans le `WeekSelectorPremium`.

### 3. Recentrage fiable sur aujourd'hui
Améliorer les deux `useEffect` (lignes 2870 et 2886) :
- Garder le déclenchement quand `weekAnchor` correspond à la semaine en cours.
- Ajouter aussi un déclenchement quand on (ré)entre dans la vue (`weekPlannerMode` passe à `true`, ou `activeMenuKey === "my-plan"` redevient actif) afin que, même après avoir scrollé puis être revenu manuellement à la semaine courante, la liste se recentre toujours sur la ligne du jour.
- Utiliser `behavior: "smooth"` uniquement après le premier rendu pour éviter un saut visible à l'ouverture.

## Hors périmètre

- Pas de changement dans `WeekSelectorPremium`, `DayPlanningRow`, ni dans la logique métier (sessions, RPC, etc.).
- Pas de modification du header / effet translucide (déjà traité).
