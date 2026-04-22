
Objectif: transformer “Créer une séance” en un outil de coaching structuré, intelligent et premium, sans casser la structure générale actuelle du wizard.

1. Refaire le modèle métier des blocs pour supporter le calcul intelligent
- Étendre `SessionBlock` dans `src/components/session-creation/types.ts` pour séparer clairement les 3 variables métier sur chaque segment :
  - allure
  - distance
  - temps
- Pour les blocs simples :
  - stocker explicitement `distance`, `duration`, `pace`
  - conserver une notion de champ “source” / “édité en dernier” pour savoir quelle valeur est calculée automatiquement
- Pour les intervalles :
  - distinguer 3 niveaux :
    - structure globale (`repetitions`, `blockRepetitions`, récup inter-séries)
    - effort (`effortDistance`, `effortDuration`, `effortPace`, `rpe`)
    - récupération (`recoveryDistance`, `recoveryDuration`, `recoveryPace?`, `recoveryType`, `recoveryRpe`)
  - conserver aussi la récup entre séries (`blockRecoveryDuration`, `blockRecoveryDistance`, `blockRecoveryPace?`, `blockRecoveryType`)
- Compatibilité:
  - garder la lecture des anciens champs existants pour éviter de casser les séances déjà enregistrées
  - normaliser les blocs anciens vers le nouveau modèle au chargement

2. Créer un vrai moteur de calcul partagé
- Ajouter un utilitaire central dans `src/lib/` dédié au calcul des blocs structurés.
- Ce moteur devra :
  - parser les allures (`min/km`, `km/h`, etc. selon sport)
  - convertir distance/temps/allure
  - appliquer la règle métier stricte :
```text
si 2 valeurs sont renseignées → la 3e est calculée automatiquement
si moins de 2 valeurs sont renseignées → pas de calcul forcé
si 3 valeurs existent et sont incohérentes → la dernière valeur éditée devient prioritaire, la valeur dérivée est recalculée
```
- Prévoir des helpers distincts :
  - `resolveSimpleBlockMetrics`
  - `resolveIntervalEffortMetrics`
  - `resolveRecoveryMetrics`
  - `resolveStructuredBlock`
  - `resolveSessionTotals`
- Ce moteur deviendra la source de vérité pour :
  - affichage des blocs
  - distance totale
  - durée estimée
  - données de preview
  - calcul de niveau / intensité

3. Corriger toute la logique actuelle qui mélange minutes / secondes / mètres
- Aujourd’hui plusieurs utilitaires supposent parfois des minutes, parfois des secondes, parfois des chaînes ambiguës.
- Reprendre et aligner les conversions dans :
  - `src/components/session-creation/utils/computeBlocksDistance.ts`
  - `src/lib/estimateSessionDurationMinutes.ts`
  - `src/lib/sessionLevelCalculator.ts`
  - `src/lib/workoutVisualization.ts`
- Standardiser en interne :
  - temps en secondes
  - distance en mètres
  - allure dans un format normalisé
- N’afficher des formats coach-friendly qu’au niveau UI.

4. Refaire le bloc simple en mode coaching premium
- Repenser `src/components/session-creation/SessionBlock.tsx` pour les blocs simples :
  - 3 grosses capsules horizontales:
    - Allure
    - Distance
    - Temps
  - une pastille zone calculée automatiquement (`Z1 → Z6`)
- Comportement attendu :
  - taper sur une capsule ouvre le picker correspondant
  - dès que 2 valeurs existent, la 3e s’actualise en live
  - la zone se recalcule à partir de l’allure / contexte déjà utilisé dans `workoutVisualization`
- Le rendu doit être plus coaching, moins “formulaire” :
  - cartes arrondies
  - hiérarchie visuelle forte
  - chips tactiles larges
  - espacement propre et style RunConnect premium clair

5. Refaire complètement le bloc intervalle
- Le bloc intervalle doit être reconstruit comme un vrai mini-builder en 3 sections visuelles :
  - STRUCTURE
  - EFFORT
  - RÉCUP
- Structure :
  - répétitions
  - séries
  - récup entre séries
- Effort :
  - distance
  - temps
  - allure
  - RPE
- Récup :
  - temps
  - distance
  - allure optionnelle
  - type
  - recovery RPE si présent
- Le système doit couvrir naturellement :
```text
10 x 400m r1’
3 x 10’ à 4’/km
3 x (5 x 400m r1’) r3’
```
- Chaque sous-section utilisera de gros contrôles capsules / cartes, pas des petits inputs techniques.
- Le résumé haut du bloc devra produire une phrase coach claire en live.

6. Connecter le schéma live au nouveau moteur
- Garder `SessionStructurePreview.tsx` connecté à `workoutVisualization.ts`, mais alimenter le preview via les blocs résolus par le nouveau moteur.
- Le schéma devra refléter exactement :
  - blocs simples
  - répétitions
  - récupérations
  - séries
  - récup inter-séries
- Même règle partout :
  - 1 répétition = 1 bloc visible
  - 1 récup = 1 bloc visible
- Vérifier la cohérence entre création, modèles, preview et détails séance.

7. Repenser la section “Détails” sans casser le wizard
- Conserver la structure globale du `DetailsStep`, mais moderniser la zone structured :
  - titre plus coaching
  - segmentation claire
  - meilleur contraste visuel
  - cartes flush/premium conformes aux mémoires design
- Garder le switch `Simple / Structurée`, mais rendre “Structurée” beaucoup plus puissante.
- Pour le mode structuré :
  - distance totale en lecture seule, issue du moteur
  - durée estimée en lecture seule, issue du moteur
  - intensité / zone dominante calculée si possible
- Le but est que le coach sente un outil d’édition intelligent, pas un simple formulaire de saisie.

8. Assurer la compatibilité avec la création, l’édition et le coaching prérempli
- Mettre à jour `useSessionWizard.ts` pour normaliser les blocs entrants :
  - depuis une séance existante
  - depuis un préremplissage coaching
- Mettre à jour `CreateSessionWizard.tsx` pour enregistrer les blocs dans le nouveau format stabilisé.
- Prévoir une normalisation avant sauvegarde pour que la DB reçoive des données cohérentes même si un coach ne remplit pas tous les champs.
- Vérifier que les écrans consommateurs (`ConfirmStep`, détails séance, estimation durée, niveau de séance) lisent bien la même vérité métier.

9. Design RunConnect premium à appliquer
- Suivre les règles mémoire:
  - light mode only
  - premium iOS minimal
  - flush / bord-à-bord quand pertinent
  - gros targets tactiles
  - pas de surcharge visuelle
- Concrètement :
  - capsules 44px+ minimum
  - blocs avec arrondis iOS et ombre légère
  - sections séparées par fond subtil + labels discrets
  - texte principal lisible, texte secondaire compact
  - suppression des éléments trop “techniques” au profit d’un langage coach

10. Validation fonctionnelle à faire après implémentation
- Blocs simples :
  - allure + temps => distance auto
  - allure + distance => temps auto
  - temps + distance => allure auto
- Intervalles :
  - `10 x 400m en 1:00` => allure auto
  - `3 x 10 min à 4:00/km` => distance auto
  - récup temps seule
  - récup distance seule
  - récup allure optionnelle
  - séries + récup inter-séries
- Totaux :
  - distance totale correcte
  - durée totale correcte
  - schéma exact
  - confirm step cohérent
  - sauvegarde / reload sans perte ni incohérence

Détails techniques
- Fichiers principaux à modifier :
  - `src/components/session-creation/types.ts`
  - `src/components/session-creation/SessionBlock.tsx`
  - `src/components/session-creation/SessionBlockBuilder.tsx`
  - `src/components/session-creation/SessionStructurePreview.tsx`
  - `src/components/session-creation/steps/DetailsStep.tsx`
  - `src/components/session-creation/useSessionWizard.ts`
  - `src/components/session-creation/CreateSessionWizard.tsx`
  - `src/components/session-creation/utils/computeBlocksDistance.ts`
  - `src/lib/estimateSessionDurationMinutes.ts`
  - `src/lib/sessionLevelCalculator.ts`
  - `src/lib/workoutVisualization.ts`
- Nouveau fichier recommandé :
  - `src/lib/sessionBlockCalculations.ts` (ou équivalent) pour centraliser toute la logique métier
- Principe d’architecture :
```text
UI édite -> moteur résout les valeurs dérivées -> preview/totaux utilisent la version résolue -> sauvegarde normalisée
```

Résultat attendu
- Création beaucoup plus rapide pour un coach
- Bloc intervalle enfin complet
- Calcul automatique fiable partout
- Schéma live fidèle à la séance
- Expérience visuelle premium, fluide, cohérente avec RunConnect
