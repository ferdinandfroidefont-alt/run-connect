
Objectif: corriger définitivement la logique “Repos” dans le sélecteur de semaine et dans les lignes de planification, sans refondre l’UI.

1. Corriger la règle métier “Repos”
- Remplacer la détection actuelle trop permissive.
- Un jour doit être “Repos” uniquement si :
  - il n’existe aucune séance ce jour-là, ou
  - il existe une séance explicitement de repos (titre/objective contenant “repos”, ou bloc réellement dédié si votre logique métier le prévoit).
- Ne plus considérer automatiquement comme repos une séance composée seulement de blocs `warmup`, `recovery` ou `cooldown`.
- Conséquence attendue :
  - “5 km Z1” = séance normale, donc affichage distance/sport
  - jour vide = “Repos”

2. Corriger le calendrier semaine côté coach
- Refaire `daySessionSummaryByDate` dans `CoachPlanningExperience.tsx` pour itérer sur les 7 jours de `weekDays` au lieu de ne résumer que les dates présentes dans `groupedByDate`.
- Pour chaque jour :
  - aucune séance → `{ sport: "rest", value: "Repos" }`
  - une ou plusieurs séances → calcul normal du résumé
- Cela supprimera le trou actuel où certains jours vides n’affichent rien alors qu’ils doivent afficher “Repos”.

3. Sécuriser la logique côté athlète
- Vérifier `AthleteMyPlanView.tsx` pour garder la bonne règle :
  - `daySessions.length === 0` => repos
  - sinon toujours résumé séance
- Ajouter une garde explicite pour empêcher qu’une séance légère/Z1 soit retransformée en “Repos” par une logique dérivée.

4. Unifier la source de vérité du résumé journalier
- Extraire une petite helper partagée, par exemple :
  - `isExplicitRestSession(session)`
  - `buildDaySummaryForCalendar(daySessions, fallbackSport)`
- Cette helper devra :
  - retourner “Repos” seulement si le jour est vide ou si la séance est explicitement repos
  - sinon retourner distance prioritaire, puis durée si pas de distance
  - conserver le sport réel de la séance
- Bénéfice : même comportement dans “Planification” et “Mon plan”.

5. Ajuster le rendu des lignes journalières
- Dans `DayPlanningRow` / `DayEmptyStateInline`, garder l’état vide pour la ligne détaillée si aucune séance existe réellement.
- Mais dans le `WeekSelectorPremium`, afficher “Repos” pour les jours sans séance.
- On évite ainsi la confusion actuelle :
  - calendrier hebdo = statut du jour
  - ligne détaillée = présence ou absence de séance à ouvrir

6. Cas à vérifier après implémentation
- Jour sans séance → “Repos”
- Jour avec footing Z1 / échauffement long / récup active de 5 km → afficher km + sport, jamais “Repos”
- Jour avec vraie séance nommée “Repos” → “Repos”
- Jour avec plusieurs séances → total km si disponible, sinon durée de la principale
- Même comportement dans :
  - `AthleteMyPlanView`
  - `CoachPlanningExperience`
  - `CoachingPreviewExperience` si nécessaire pour cohérence de la démo

7. Fichiers impactés
- `src/components/coaching/CoachPlanningExperience.tsx`
- `src/components/coaching/athlete-plan/AthleteMyPlanView.tsx`
- éventuellement `src/components/coaching/planning/WeekSelectorPremium.tsx`
- éventuellement une nouvelle helper partagée dans `src/lib/` ou `src/components/coaching/athlete-plan/planUtils.ts`

Détail technique
- Problème principal identifié :
  - `CoachPlanningExperience.tsx` ne fabrique des résumés que pour les jours ayant des séances
  - `isRestLikeSession()` considère à tort certaines séances légères comme du repos
- Correction technique recommandée :
```text
Pour chaque jour de la semaine :
  récupérer les séances du jour
  si 0 séance -> Repos
  sinon si unique séance explicitement "Repos" -> Repos
  sinon -> distance/durée + sport réel
```

Résultat attendu
- Mardi 21 vide => “Repos”
- Mercredi 22 avec 5 km => affichage séance normal, pas “Repos”
- Plus aucun jour “fantôme” sans libellé dans le calendrier hebdo
- Comportement cohérent entre la vue coach et la vue athlète
