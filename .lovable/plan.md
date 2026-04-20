

## Problèmes identifiés (StoryCreate.tsx)

1. **Réactivation d'un mode = écrasement** : cliquer sur Texte/Musique/Sticker quand un objet existe déjà sélectionne/recrée au lieu d'éditer l'existant ou de revenir en mode idle.
   - `placeTextEditorAtCenter()` réinitialise `textPos` (ligne 2616) → le texte existant est déplacé/sélectionné automatiquement.
   - `setShowMusicPicker(true)` rouvre le sélecteur musique (ligne 2637) même si une musique est déjà choisie.
   - `setShowStickerPicker(true)` rouvre la grille emoji.

2. **Pas de zone poubelle façon Instagram** pour drag-to-delete (texte, emoji, musique, séance, layers dynamiques).

3. **Musique active non visible dans le header** : aucun mini-badge entre Retour et Terminé avec une croix pour retirer rapidement la musique.

4. **Palette couleurs texte** : manque le noir (`#000000`) et la palette est tout en bas → masquée par le clavier (`bottom: env(safe-area-inset-bottom)` ne tient pas compte de `keyboardHeight`).

## Plan de correction

### A. Logique d'activation des modes (ne pas écraser l'existant)
Pour chaque outil (Texte, Musique, Sticker, Séance) : si un objet du type est déjà présent ET que le mode n'est pas actif → ouvrir l'édition de l'existant SANS recréer ; si déjà actif → revenir à `idle` ; sinon → créer.

- **Texte** : si `textOverlay` non vide et `editorMode !== "text"` → garder `textPos`/`textColor`/etc., juste `setShowTextInput(true)` + focus, ne PAS appeler `placeTextEditorAtCenter()`.
- **Musique** : si `selectedMusic` existe et picker fermé → garder, ouvrir picker en lecture (pré-sélection). Re-clic → toggle picker fermé.
- **Sticker emoji** : si `emojiSticker` existe → ouvrir le picker pour changer (pas écraser auto).
- **Séance** : déjà togglable, OK mais aligner pattern.
- Re-clic sur un outil déjà actif → `closeEditorMode()`.

### B. Zone poubelle façon Instagram (drag-to-delete)
- Ajouter un état `dragTrashVisible` + `dragTrashHover`.
- Dans tous les `start*Drag` (text, music, emoji, session, dynamic) → `setDragTrashVisible(true)`.
- Dans `move*Drag` → si `clientY > window.innerHeight - 110` → `setDragTrashHover(true)` + scale up icône.
- Dans `end*Drag` → si `dragTrashHover` → supprimer le layer (`setTextOverlay("")`/`setSelectedMusic(null)`/`setEmojiSticker(null)`/`setSelectedSession(null)` ou `removeKindLayer`/filter dynamiques) ; sinon comportement normal. Reset `dragTrashVisible`.
- UI : pastille ronde 64px centrée en bas (`bottom: 24px`) avec `Trash2`, fond `bg-black/50`, agrandie + rouge quand `dragTrashHover`. Z-index 50, `pointer-events-none`.

### C. Mini-badge musique dans le header
Dans la barre du haut (ligne 2575), entre Retour et Terminé, si `selectedMusic` :
```
[♪ titre · artiste] [×]
```
- Pill `bg-black/55 backdrop-blur` avec icône Music, titre tronqué (max-w-[120px]), bouton croix → `setSelectedMusic(null)`.
- Cliquable au centre → ouvre picker pour changer.

### D. Palette couleurs texte + remontée au-dessus du clavier
- Ajouter `#000000` dans le tableau ligne 2884 : `["#FFFFFF", "#000000", "#2563EB", "#EF4444", "#22C55E", "#F59E0B", "#F472B6"]`.
- Modifier le `style` ligne 2869 pour utiliser `keyboardHeight` :
  ```tsx
  style={{ bottom: `max(12px, calc(env(safe-area-inset-bottom, 12px) + ${keyboardHeight}px + 8px))` }}
  ```
- S'assurer que la barre reste scrollable horizontalement si dépassement (`overflow-x-auto`) car ajouter le noir + scroll horizontal sur petits écrans.

## Fichier modifié
- `src/pages/StoryCreate.tsx` (un seul fichier, ~6 zones modifiées)

