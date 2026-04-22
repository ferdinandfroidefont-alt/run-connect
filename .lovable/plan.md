
Objectif: corriger le vrai problème de visibilité en appliquant le bouton d’insertion entre blocs dans l’écran que l’utilisateur voit réellement sur `/coaching`, y compris en mode aperçu.

1. Corriger la source du problème
- Aujourd’hui, `/coaching` bifurque entre :
  - `CoachPlanningExperience` en mode normal
  - `CoachingPreviewExperience` en mode aperçu
- Les derniers correctifs ont surtout touché des surfaces qui ne sont pas forcément celles affichées dans la preview actuelle.
- Résultat : le “Ajouter ici” peut exister dans le code, mais pas dans l’expérience que l’utilisateur est en train de regarder.

2. Aligner l’écran visible avec le vrai builder coaching
- Modifier `src/pages/Coaching.tsx` et/ou `src/components/coaching/CoachingPreviewExperience.tsx` pour que le mode aperçu expose aussi le vrai éditeur de séance structuré, au lieu d’un mock trop simplifié.
- Principe :
  - garder les données mock si besoin
  - mais réutiliser le même composant de structure/blocs que l’expérience coach réelle
  - désactiver seulement la persistance backend, pas l’UI d’édition

3. Unifier le composant d’insertion entre blocs
- Éviter deux implémentations différentes du builder :
  - `src/components/session-creation/SessionBlockBuilder.tsx`
  - logique embarquée dans `src/components/coaching/CoachPlanningExperience.tsx`
- Extraire ou réutiliser un composant commun pour :
  - la liste des blocs
  - le séparateur visible entre blocs
  - le bouton central “Ajouter ici”
  - le menu de choix de type de bloc
- Ainsi, le même rendu sera visible partout : wizard, coaching, preview.

4. Rendre le séparateur impossible à manquer
- Renforcer visuellement le séparateur entre deux blocs dans le composant partagé :
  - largeur pleine
  - lignes latérales discrètes
  - bouton central plus contrasté
  - libellé explicite “Ajouter ici”
  - cible tactile minimum 44px
- Style RunConnect light / Premium iOS :
  - `bg-card` / `bg-background`
  - bordure plus marquée
  - ombre douce mais visible
  - icône `Plus` primaire
  - espacement flush propre sur 390px de large

5. Afficher le menu exactement à l’endroit cliqué
- Conserver une logique d’ancrage claire :
  - `top` pour ajout général
  - `index` pour insertion entre deux blocs
- Le clic sur “Ajouter ici” doit ouvrir inline le menu des types :
  - Échauffement
  - Série / Fractionné
  - Bloc constant
  - Retour au calme
- L’ajout doit insérer le bloc au bon index, sans l’envoyer en fin de liste.

6. Appliquer aussi la correction au vrai écran “Créer une séance”
- Vérifier et harmoniser l’intégration dans :
  - `src/components/session-creation/steps/DetailsStep.tsx`
  - `src/components/session-creation/SessionBlockBuilder.tsx`
- Objectif :
  - même séparateur
  - même comportement
  - même hiérarchie visuelle
  - aucun écart entre le wizard et le coaching planner

7. Vérifications UX à couvrir
- Cas à valider après implémentation :
  - 2 blocs : le séparateur est visible immédiatement
  - 3 à 5 blocs : chaque zone d’insertion reste lisible
  - menu ouvert : pas de chevauchement avec le schéma de séance
  - mobile 390px : le libellé reste lisible
  - preview mode : l’utilisateur peut enfin voir et tester l’insert
  - mode normal : comportement identique

Détails techniques
- Fichiers principaux :
  - `src/pages/Coaching.tsx`
  - `src/components/coaching/CoachingPreviewExperience.tsx`
  - `src/components/coaching/CoachPlanningExperience.tsx`
  - `src/components/session-creation/SessionBlockBuilder.tsx`
  - `src/components/session-creation/steps/DetailsStep.tsx`
- Architecture recommandée :
```text
Coaching.tsx
  -> mode normal: CoachPlanningExperience
  -> mode aperçu: Preview qui réutilise le même builder visuel

Builder partagé
  -> rendu des blocs
  -> séparateurs d’insertion
  -> menu de types
  -> insertion par index
```

Résultat attendu
- Le bouton “+” entre les blocs devient réellement visible dans la page que l’utilisateur consulte.
- Le mode aperçu n’affiche plus une version déconnectée des correctifs.
- L’ajout entre blocs est clair, premium et cohérent partout dans l’app.
