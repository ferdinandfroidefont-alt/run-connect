
Objectif: modifier enfin les vrais blocs visibles sur `/coaching` — Échauffement, Intervalle, Bloc continu, Retour au calme — et non seulement le séparateur “+” ou la fiche de configuration.

1. Corriger la vraie surface affichée
- Le problème est dans `src/components/coaching/CoachPlanningExperience.tsx`, dans la liste `draft.blocks.map(...)`.
- Aujourd’hui, les blocs visibles restent des cartes compactes legacy :
  - petit header
  - 3 mini boutons “Allure / Distance / Temps”
  - très peu de différenciation visuelle entre Échauffement / Intervalle / Retour au calme
- Les changements déjà faits dans la sheet de config ne modifient pas assez cette liste principale, qui est précisément ce que l’utilisateur regarde.

2. Remplacer les cartes compactes par de vrais blocs premium visibles
- Refaire le rendu de chaque bloc affiché dans la liste principale avec une carte beaucoup plus lisible, inspirée de la référence fournie :
  - header fort avec icône + nom du type
  - sous-texte explicite selon le type
  - gros groupe central pour Allure / Distance / Temps
  - zone ou RPE clairement visible
  - meilleure hiérarchie visuelle
- Chaque type aura sa personnalité visuelle :
  - Échauffement: ton orange / progressif
  - Intervalle: ton rouge / effort-récup
  - Bloc continu: ton jaune/bleu stable
  - Retour au calme / Récupération: ton vert/bleu doux

3. Faire en sorte que le bloc visible ressemble à la maquette, pas seulement la sheet
- Le design déjà commencé dans la configuration de bloc (`blockStep === "config"`) servira de base visuelle.
- Le même langage UI sera remonté dans les cartes visibles de la liste :
  - grands rayons
  - contrastes plus nets
  - rangées tactiles larges
  - icônes plus présentes
  - texte plus gros et plus structuré
- Résultat attendu : dès qu’un bloc est ajouté, il ressemble immédiatement à un “vrai bloc Échauffement / Intervalle”.

4. Gérer correctement les différences entre types
- Blocs simples (`warmup`, `steady`, `cooldown`, `recovery`) :
  - carte volume premium avec Allure / Distance / Temps
  - badge Zone estimée ou RPE
  - message d’aide court et spécifique au type
- Bloc `interval` :
  - structure dédiée avec :
    - répétitions
    - effort
    - récupération
    - éventuellement inter-séries
  - affichage clair des infos clés sans devoir ouvrir la config
- Le résumé visuel devra permettre de comprendre le bloc en un coup d’œil.

5. Éviter de garder deux UIs contradictoires
- Extraire si nécessaire un composant partagé, par exemple :
```text
src/components/coaching/CoachingSessionBlockCard.tsx
```
- Ce composant recevra :
  - le bloc
  - le sport
  - les callbacks d’édition
  - l’état drag/reorder
- `CoachPlanningExperience.tsx` utilisera ce composant au lieu du rendu inline actuel.
- Si pertinent, harmoniser ensuite avec `src/components/session-creation/SessionBlock.tsx` pour éviter que “Créer une séance” et “Coaching” divergent visuellement.

6. Conserver l’édition existante, mais sur la nouvelle carte
- Garder les wheel pickers et la logique déjà en place (`openWheelColumns`, `updateDraftBlock`, `deriveRunningVolume`).
- Rebrancher ces actions sur les nouvelles zones tactiles du bloc :
  - tap Allure -> picker allure
  - tap Distance -> picker distance
  - tap Temps -> picker durée
  - tap Répétitions / récup -> picker adapté
- Ne pas casser :
  - insertion entre blocs
  - réordonnancement
  - calcul auto de la 3e métrique
  - résumé du schéma de séance

7. Vérifications UX à couvrir
- Sur `/coaching` en largeur mobile 390px :
  - un bloc Échauffement ajouté doit être visiblement différent immédiatement
  - un bloc Intervalle doit afficher sa structure spécifique
  - les cartes ne doivent plus ressembler à de simples mini boutons génériques
  - le “+ Ajouter ici” doit rester entre les nouvelles cartes
  - la fiche de config et la carte visible doivent enfin être cohérentes
- Vérifier aussi le mode aperçu coach, puisqu’il rend `CoachPlanningExperience`.

Détails techniques
- Fichier principal à corriger :
  - `src/components/coaching/CoachPlanningExperience.tsx`
- Fichiers probables :
  - `src/components/coaching/CoachPlanningExperience.tsx`
  - `src/components/session-creation/SessionBlock.tsx` (si harmonisation)
  - éventuellement un nouveau composant partagé type `CoachingSessionBlockCard.tsx`
- Zone exacte concernée :
  - le rendu actuel des blocs dans `draft.blocks.map(...)`
  - pas seulement la `Sheet` de configuration du bloc
  - pas seulement `SessionBlockBuilder.tsx`
  - pas seulement `BlockInsertSeparator.tsx`

Résultat attendu
- Les blocs visibles Échauffement / Intervalle / Bloc continu / Retour au calme sont enfin réellement redesignés dans l’écran que l’utilisateur regarde.
- Le rendu n’est plus une carte compacte générique.
- Le style est premium iOS, lisible, distinct par type, et fidèle à la référence montrée.
