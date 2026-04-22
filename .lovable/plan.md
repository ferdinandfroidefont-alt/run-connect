
Objectif: faire en sorte que chaque schéma de séance affiche exactement la vraie structure de la séance, partout dans l’app.

1. Corriger la logique qui fausse le nombre de blocs
- Remplacer la compression actuelle dans `renderWorkoutMiniProfile()` qui regroupe artificiellement les répétitions.
- Aujourd’hui, la logique “compact” transforme une série répétée en un nombre arbitraire de blocs (`chunks`), ce qui explique :
  - `10x400` affiché avec moins de 10 efforts
  - `3x10'` affiché avec plus de 3 efforts
- Nouvelle règle :
```text
1 répétition = 1 bloc effort visible
1 récupération entre répétitions = 1 bloc récup visible
échauffement / retour au calme / bloc continu = 1 bloc chacun
```

2. Garder des proportions horizontales vraies sans casser l’affichage
- Conserver la règle métier demandée :
  - un bloc de 10 min doit être 2x plus large qu’un bloc de 5 min
  - un 400 m doit garder une largeur cohérente face aux autres efforts de la même séance
- Adapter seulement l’échelle globale du schéma pour qu’il tienne dans la largeur disponible.
- En pratique :
  - normaliser toute la séance à la largeur du conteneur
  - garder les rapports réels entre les blocs
  - utiliser un `min-width` très faible uniquement pour éviter qu’un bloc disparaisse complètement, sans modifier le nombre de blocs

3. Garder la hiérarchie verticale d’intensité
- Conserver/renforcer la règle :
  - plus le bloc est intense, plus il est haut
- Les efforts répétés garderont donc :
  - même nombre réel de blocs
  - hauteur cohérente avec la zone / intensité
  - récupérations visuellement plus basses

4. Unifier tous les schémas sur une seule source de vérité
- Centraliser la fabrication des barres visuelles dans `src/lib/workoutVisualization.ts`.
- Éviter qu’un écran affiche une logique “exacte” et un autre une logique “compressée”.
- Vérifier et aligner au minimum ces usages :
  - `src/components/coaching/models/ModelsPage.tsx`
  - `src/components/coaching/models/ModelDetail.tsx`
  - `src/components/coaching/CoachPlanningExperience.tsx`
  - `src/components/coaching/planning/DaySessionSummary.tsx`
  - `src/components/coaching/athlete-plan/AthleteMyPlanView.tsx`
- Revoir aussi `src/components/session-creation/SessionStructurePreview.tsx` pour confirmer que la création de séance respecte déjà bien :
  - le bon nombre de répétitions
  - les récupérations
  - les proportions horizontales
- Si nécessaire, faire converger `SessionStructurePreview` vers le même moteur visuel pour éviter toute divergence future.

5. Préserver les vues compactes sans mentir sur la séance
- Les petites cartes (modèles, résumé de jour, liste) doivent rester lisibles sur mobile.
- Mais la compacité ne doit plus changer le contenu réel.
- Ajustements prévus :
  - réduire les gaps entre blocs
  - réduire les coins/épaisseurs si besoin
  - autoriser des blocs très fins
  - éventuellement limiter seulement l’habillage visuel, jamais le nombre de répétitions

6. Cas à valider après correction
- `10x400>...` :
  - 10 blocs effort visibles
  - 9 récupérations visibles si récup entre répétitions
- `3x10'>...` :
  - 3 blocs effort visibles
  - 2 récupérations visibles
- `20'>..., 10x400>..., 10'>...` :
  - échauffement + 10 efforts + 9 récups + retour au calme
- séance sans répétition :
  - un seul bloc continu si un seul segment
- séance pyramide :
  - conserver un rendu spécifique seulement si la séance est réellement pyramidale, sans impacter les séances intervalle classiques

7. Détails techniques
- Fichier principal à corriger : `src/lib/workoutVisualization.ts`
- Point précis à supprimer/refondre : la branche `repeatedPair` avec calcul de `chunks` dans `renderWorkoutMiniProfile()`
- Approche recommandée :
```text
buildWorkoutSegments(...)
  -> produit les segments métier exacts

renderWorkoutMiniProfile(...)
  -> transforme chaque segment exact en barres visuelles exactes
  -> si segment répétitif :
       développer chaque répétition individuellement
       développer chaque récupération individuellement
  -> calculer les largeurs à partir des durées/distances réelles
  -> normaliser à la largeur du conteneur sans changer le nombre de barres
```

8. Résultat attendu
- Tous les schémas correspondent enfin à la vraie séance.
- Le nombre de blocs affichés est exact.
- Les largeurs restent proportionnelles aux vraies durées/distances.
- Les hauteurs restent proportionnelles à l’intensité.
- Le rendu est cohérent entre modèles, planning, détail et création de séance.
