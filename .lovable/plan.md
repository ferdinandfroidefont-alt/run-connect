
Objectif

Refondre visuellement les lignes de Planification, Mon plan, les cartes Modèles et l’aperçu de création de séance sans toucher à la structure globale existante :
- conserver header, barre de recherche, calendrier, boutons +, navigation, pages existantes
- remplacer uniquement le contenu des lignes/cartes par un rendu plus visuel
- fiabiliser la logique de parsing/normalisation pour que schéma, distance, durée et résumé racontent la vraie séance

Ce qui sera construit

1. Un moteur unique de structure de séance
Créer une logique centrale réutilisable autour de `src/lib/workoutVisualization.ts` pour produire, à partir des blocs coaching ou RCC :
- segments normalisés : `warmup | steady | rep | recovery | cooldown | rest`
- distance totale cohérente
- durée totale cohérente
- mini profil visuel fidèle
- résumé court lisible mobile

Le moteur sera amélioré pour corriger les cas demandés :
- séance simple continue = 1 seul bloc principal
- 10 x 400 = alternance effort/récup visible, avec compression intelligente mobile
- 3 x 10 min seuil = blocs violets distincts, non fusionnés
- warmup/cooldown/recovery correctement intégrés au calcul distance/durée
- priorité aux valeurs explicitement saisies quand elles existent déjà

2. Rendu visuel unifié “mini schéma mobile clean”
Créer un affichage commun réutilisable dans :
- `DaySessionSummary.tsx`
- `AthleteMyPlanView.tsx`
- `ModelsPage.tsx` / `ModelCard.tsx`
- aperçu création/modèles

Ce rendu contiendra :
- ligne titre : sport + nom court
- ligne centrale : mini schéma horizontal 32–40px
- ligne résumé : durée • km • intensité
- état vide inchangé
- état repos allégé avec ligne grisée/dash discrète

Règles visuelles :
- bleu = endurance
- orange = fractionné
- violet = tempo / seuil
- vert = récupération
- gris = transition / repos
- aucun fond sombre, aucune courbe, aucune grille
- lisible sur viewport mobile 390px

3. Refonte du contenu des lignes Planification
Sans toucher à `PlanningHeader`, `PlanningSearchBar`, `WeekSelectorPremium`, boutons actions ni layout 3 colonnes de `DayPlanningRow`, remplacer seulement le centre de ligne pour afficher :
- nom court
- mini schéma
- résumé
- état repos propre
- état vide actuel conservé avec “Ajouter une séance” + bouton +

4. Refonte du contenu des lignes Mon plan
Appliquer exactement la même logique visuelle dans `AthleteMyPlanView.tsx` :
- même structure de ligne enrichie
- pas de bouton + sur les cartes athlète
- même mini schéma et mêmes règles de simplification
- même logique de résumé et de repos

5. Refonte du rendu Modèles
Sans changer la page modèles ni sa structure, enrichir `ModelCard.tsx` et le détail modèle pour afficher :
- mini schéma fidèle sous le titre/résumé
- résumé basé sur segments normalisés, pas seulement RCC brut
- meilleure cohérence entre modèle, création et planning

6. Amélioration de l’aperçu de création de séance
Conserver l’écran actuel, mais rendre l’aperçu cohérent avec le nouveau système :
- placeholder graphique même vide
- rendu fidèle dès ajout/modification d’un bloc
- séances simples non sur-segmentées
- fractionné et pyramidal mieux représentés
- total estimé recalculé depuis les segments normalisés

Fichiers principaux à mettre à jour

- `src/lib/workoutVisualization.ts`
- `src/components/coaching/planning/DaySessionSummary.tsx`
- `src/components/coaching/planning/DayPlanningRow.tsx`
- `src/components/coaching/athlete-plan/AthleteMyPlanView.tsx`
- `src/components/coaching/athlete-plan/planUtils.ts`
- `src/components/coaching/CoachPlanningExperience.tsx`
- `src/components/coaching/models/ModelCard.tsx`
- `src/components/coaching/models/ModelsPage.tsx`
- `src/components/coaching/models/ModelDetail.tsx`
- éventuellement `src/components/coaching/RCCBlocksPreview.tsx` si l’aperçu modèle/création doit partager le même mini rendu

Détails techniques

1. Élargir `SessionSummaryView`
Ajouter au summary de ligne des champs comme :
- `miniProfile`
- `sportHint`
- `isRestDay`
- éventuellement `subtitle` ou `shortTitle`
Puis faire consommer ces données par `DaySessionSummary`.

2. Améliorer la normalisation des blocs
Dans `buildWorkoutSegments(...)` :
- détecter correctement les blocs simples steady/warmup/cooldown
- traiter les intervalles avec distance ou durée
- ajouter la récupération inter-répétitions dans la structure
- ne pas découper artificiellement les séances simples
- compresser seulement au stade visuel, pas au stade de calcul

3. Séparer calcul réel et simplification visuelle
Conserver :
- calcul exact pour distance/durée
- simplification seulement pour `renderWorkoutMiniProfile(...)`

Règles de rendu à ajouter :
- simple steady/warmup/cooldown seul => 1 bloc unique
- gros fractionné => alternance compressée mais explicite
- seuil/tempo répété => blocs distincts non fusionnés
- progressif/pyramidal => variation de hauteur

4. Corriger la logique distance/résumé
Dans planning, mon plan, modèles et création :
- utiliser `computeWorkoutDistance(...)` et `computeWorkoutDuration(...)` dès que possible
- utiliser la distance déjà saisie si présente sur la séance
- sinon dériver depuis les segments normalisés
- ne plus faire de simple somme naïve incomplète des `distanceM`

5. Harmonisation des titres courts
Créer une petite logique de nom court / libellé principal :
- “Footing endurance”
- “Fractionné court”
- “Sortie tempo”
- “Repos”
en gardant le titre original si nécessaire, mais avec priorité à une lecture rapide mobile

Résultat attendu

Planification, Mon plan, Modèles et Création garderont exactement leur structure actuelle, mais chaque séance deviendra immédiatement lisible visuellement :
- on verra les jours durs / légers sans lire tout le texte
- les schémas correspondront enfin à la vraie structure
- les km/durée/résumés seront cohérents
- le rendu restera premium, clair, mobile et propre

Validation prévue après implémentation

Je vérifierai au minimum ces cas :
- `25 min • 5000 m • Z2` => 1 seul bloc bleu
- `Sortie longue 1h30` => 1 grand bloc bleu
- `10 x 400 m` => alternance effort/récup compressée intelligemment
- `3 x 10 min seuil` => 3 blocs violets distincts avec récupérations
- jour vide => structure actuelle intacte
- jour repos => rendu allégé cohérent
- modèles et création => même logique visuelle que planning
