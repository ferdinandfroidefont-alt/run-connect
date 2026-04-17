
Objectif: corriger définitivement l’éditeur texte de `/stories/create` pour que le champ reste sur l’image, avec curseur visible, sans saut de layout ni “zone texte” collée en bas.

Constat actuel
- `StoryCreate.tsx` affiche 2 éléments quand on active “Texte” :
  1. l’input inline sur le preview (`textOverlay || showTextInput`)
  2. une barre flottante en bas (`showTextInput` vers la fin du fichier)
- En plus, le texte est re-centré à chaque variation de `keyboardHeight`, ce qui crée un repositionnement parasite.
- Le calcul du viewport texte mélange la taille du host et l’inset clavier, ce qui rend le comportement instable sur mobile.

Plan de correction
1. Stabiliser la position du champ texte
- Garder un placement initial unique au moment du clic sur “Texte”.
- Supprimer le recentrage automatique déclenché par `keyboardHeight`.
- Conserver seulement un “clamp” de sécurité pour empêcher le texte de sortir de la zone visible, sans le déplacer de force vers le bas/haut.

2. Corriger la logique de viewport de l’éditeur
- Revoir `getTextEditingViewport()` pour utiliser une zone d’édition stable dans le host.
- Éviter de “compter deux fois” le clavier dans le calcul vertical.
- Garder une marge haute pour le header et une marge basse pour les outils, mais sans recalcul agressif.

3. Séparer clairement input texte et barre d’outils
- L’input doit rester dans le canvas/preview, à la position `textPos`.
- La barre du bas doit rester uniquement une barre de style (couleur, alignement, taille, police), jamais être perçue comme le champ lui-même.
- Si nécessaire, alléger visuellement cette barre pour qu’elle ne ressemble pas à une zone de saisie.

4. Fiabiliser le focus/caret sans scroll
- Conserver le focus programmatique immédiat après `flushSync`.
- Ajouter un fallback de refocus court si iOS ne montre pas le caret au premier essai.
- Vérifier que le clic sur l’overlay texte refocus bien le même input, sans rouvrir une autre UI ni déclencher de repositionnement.

5. Vérifier les interactions annexes
- S’assurer que drag du texte fonctionne encore après ouverture clavier.
- Vérifier que fermer le mode texte n’efface pas la position.
- Vérifier que l’export utilise toujours les vraies coordonnées du texte.

Fichier concerné
- `src/pages/StoryCreate.tsx`

Détails techniques prévus
- Retirer ou simplifier l’effet qui fait:
  - `targetY = viewport.top + (...) * 0.42`
  - `setTextPos(...)` à chaque changement de `keyboardHeight`
- Remplacer par:
  - placement initial via `placeTextEditorAtCenter()` au clic
  - effet de clamp uniquement si `textPos` sort de la zone visible
- Ajuster la barre basse `showTextInput` pour qu’elle soit traitée comme toolbar, pas comme input principal
- Revoir le style/positionnement de l’input inline pour qu’il reste visuellement centré sur l’image

Validation prévue après implémentation
- Tap sur “Texte” → curseur visible immédiatement
- Le champ apparaît sur l’image, pas en bas
- Le preview ne monte/descend plus
- Le clavier n’éjecte plus le texte
- Re-tap sur le texte → caret revient au bon endroit
- Test iPhone viewport étroit (390px) + galerie + caméra

Résultat attendu
- Le texte se comporte comme dans Instagram: tap sur “Texte” = saisie directement sur le media, stable, lisible, sans déplacement de toute la vue.
