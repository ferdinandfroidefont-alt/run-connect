
Objectif: refondre proprement `src/pages/StoryCreate.tsx` pour que l’édition texte fonctionne comme Instagram, sans déplacement du canvas, sans scroll parasite, et avec caret visible au bon endroit sur web + mobile.

Constat précis dans le code actuel
- La vue `edit` n’est pas une scène totalement isolée : elle mélange un canvas `flex-1` et plusieurs panneaux positionnés en dehors/au-dessous du canvas.
- Le texte actif est rendu dans un conteneur avec `transform: translate(...) scale(...) rotate(...)`. Comme l’`input` est enfant direct de ce bloc transformé, certains navigateurs calculent mal le caret.
- `keyboardHeight` pilote à la fois :
  - `getTextEditingViewport()` pour recalculer la zone autorisée,
  - la barre texte du bas via `bottom: ... keyboardHeight + 8`.
  Cela recrée une scène “réactive au clavier” au lieu d’une scène fixe.
- La barre d’édition texte est rendue hors du canvas principal, donc elle participe visuellement à la perception d’un layout qui bouge même si le root est en overflow hidden.

Vraie cause probable
- Le bug n’est pas seulement CSS : il vient surtout de l’architecture actuelle du mode `edit`.
- Le caret en bas vient très probablement de la combinaison suivante :
  1. input monté dans un overlay transformé,
  2. viewport texte dépendant du clavier,
  3. toolbar basse qui se repositionne avec `keyboardHeight`,
  4. hiérarchie `flex` + overlay séparés qui ne représentent pas une “scène fixe” unique.

Correction proposée
1. Isoler totalement la scène `edit`
- Transformer l’écran `edit` en root fixe plein écran :
  - `fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-black`
- Faire du canvas une couche absolue unique :
  - `absolute inset-0`
- Toutes les UI d’édition deviennent des overlays absolus/fixed au-dessus du canvas :
  - top bar,
  - rail droit,
  - bottom text toolbar,
  - pickers,
  - texte actif.

2. Sortir définitivement le texte du flux layout
- Garder le texte actif dans un layer dédié du canvas :
  - `absolute inset-0 pointer-events-none`
- À l’intérieur :
  - wrapper de position `absolute left-0 top-0`
  - bloc interactif `pointer-events-auto`
- Le texte ne devra plus dépendre d’un layout `flex` ou d’une hauteur de contenu.

3. Supprimer la dépendance structurelle au clavier
- Retirer l’usage de `keyboardHeight` pour positionner :
  - la toolbar texte,
  - la zone de placement du texte.
- Conserver au maximum `visualViewport` seulement pour de l’observation légère si utile, pas pour déplacer la scène.
- `getTextEditingViewport()` doit devenir stable, basé sur le host canvas et sur des marges fixes top/bottom, pas sur le clavier.

4. Corriger le caret/cursor
- Ne plus appliquer `scale/rotate` directement sur le parent immédiat de l’`input`.
- Séparer :
  - conteneur de positionnement,
  - conteneur de transformation visuelle,
  - champ éditable.
- Si besoin :
  - en mode édition, garder seulement `translate(...)` sur le wrapper externe,
  - appliquer style visuel sur un inner wrapper non responsable du caret,
  - désactiver rotation/scale pendant la saisie active puis les réappliquer en mode preview.

5. Revoir l’ouverture du mode texte
- Conserver `flushSync` + focus immédiat avec `preventScroll: true`.
- Garder un fallback de refocus court.
- Le clic “Texte” doit :
  - créer/afficher l’overlay texte dans le canvas,
  - placer une seule fois la position initiale,
  - focus l’input sans déclencher aucun recalcul vertical du layout.

6. Refaire la barre de style du bas en vrai overlay
- La toolbar texte doit être `absolute/fixed`, superposée à la scène.
- Elle ne doit jamais influencer la hauteur du canvas.
- Supprimer l’offset dépendant de `keyboardHeight`.
- Harmoniser son style pour qu’elle soit clairement une toolbar, pas un faux champ de saisie.

7. Verrous anti-reflow
- Vérifier et nettoyer dans `StoryCreate.tsx` :
  - wrappers `flex-1` inutiles en mode `edit`,
  - tout `justify-between` implicite dans cette scène,
  - toute logique qui ferme/réouvre l’éditeur au tap sur le host,
  - tout repositionnement automatique du texte après focus.
- Ne jamais appeler :
  - `scrollIntoView`
  - `window.scrollTo`
  dans le flux texte.

Implémentation ciblée
- Fichier principal : `src/pages/StoryCreate.tsx`
- Travaux attendus :
  - refactor du rendu du step `edit`,
  - refonte du layer texte actif,
  - simplification/suppression de `keyboardHeight` dans la logique texte,
  - stabilisation de `getTextEditingViewport()` et `placeTextEditorAtCenter()`.

Validation après implémentation
- Tap sur “Texte” : le fond reste immobile.
- L’image ne monte ni ne descend.
- Le curseur apparaît dans la zone texte sur la story, pas en bas de l’écran.
- Aucun scroll global n’apparaît.
- La toolbar basse reste superposée sans pousser le contenu.
- Re-tap sur le texte : refocus propre sans saut visuel.
- Test obligatoire en viewport mobile étroit et en web desktop.

Résultat attendu
- `/stories/create` se comporte comme un éditeur story natif :
  - scène fixe,
  - canvas stable,
  - overlay texte réel,
  - caret fiable,
  - aucune casse du layout.
