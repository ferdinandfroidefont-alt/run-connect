
Objectif
- Corriger le débordement horizontal iOS sur l’écran Paramètres (section “Partager mon profil”), comme pour le tooltip du tutoriel, afin que tout le contenu reste visible (QR + boutons d’action), sans rognage à droite.

Constat (à partir de la capture)
- Le contenu de la section partage est visiblement coupé sur la droite.
- Le symptôme est cohérent avec un conteneur modal/scroll + enfants qui dépassent légèrement le viewport iPhone.
- Le problème semble localisé à la composition de `SettingsDialog` (contenu plein écran mobile + `ScrollArea` + grilles/boutons).

Plan d’implémentation

1) Sécuriser le conteneur modal sur mobile (source principale de clipping)
- Fichier: `src/components/SettingsDialog.tsx`
- Basculer le rendu mobile de `DialogContent` en vrai mode plein écran Radix (`fullScreen`) au lieu d’un “faux fullscreen” via `w-[100%] max-w-[100vw]` tout en gardant le comportement desktop actuel (`sm:*`).
- But: supprimer les effets de centrage/translate desktop sur iOS et verrouiller un cadre `inset-0` stable.

2) Verrouiller les largeurs internes pour éviter tout overflow latent
- Fichier: `src/components/SettingsDialog.tsx`
- Ajouter `min-w-0`/`w-full`/`max-w-full` sur les wrappers critiques:
  - conteneur principal dans `ScrollArea`
  - section “Partager mon profil”
  - bloc des actions (copie/partage/story)
- S’assurer que les éléments en grille ne peuvent pas forcer une largeur supérieure au parent:
  - ajouter `min-w-0` sur chaque cellule/bouton de la grille 2 colonnes
  - conserver `truncate` si nécessaire sur labels longs.

3) Stabiliser le `ScrollArea` sur iOS
- Fichier: `src/components/SettingsDialog.tsx` (+ éventuellement `src/components/ui/scroll-area.tsx` si requis)
- Forcer `overflow-x-hidden` au niveau viewport/conteneur de scroll local à cet écran.
- Si la scrollbar Radix empiète visuellement sur le contenu en iOS, ajouter une petite marge interne droite (padding) au contenu de cette vue uniquement pour éviter la sensation de rognage.

4) Ajouter une protection CSS globale ciblée iPhone pour ce cas
- Fichier: `src/index.css`
- Ajouter une règle non intrusive, scoped à la vue settings (classe dédiée), par exemple:
  - contrainte stricte `max-width: 100vw`
  - `overflow-x: hidden`
  - inline safe-area (si besoin) via `padding-inline` tenant compte de `env(safe-area-inset-left/right)`.
- Éviter une règle globale agressive qui pourrait impacter d’autres écrans.

5) Vérification visuelle et régression
- Vérifier sur viewport iPhone (390x844 et 375x812) :
  - plus aucun cut sur le bouton “Story”
  - QR centré, code parrainage lisible, URL tronquée proprement
  - pas de scroll horizontal parasite
- Vérifier desktop/tablette:
  - le dialog conserve son comportement modal habituel (`sm:max-w-md` etc.)
  - pas de régression sur les autres sous-pages de Settings.

Détails techniques (pour dev)
- Fichiers touchés:
  - `src/components/SettingsDialog.tsx` (principal)
  - `src/index.css` (garde-fou iOS ciblé)
  - optionnel: `src/components/ui/scroll-area.tsx` (uniquement si la scrollbar Radix provoque l’empiètement)
- Approche recommandée:
  - privilégier la correction structurelle (conteneur fullscreen mobile + contraintes width/min-width) avant toute rustine CSS globale.
- Risques:
  - un fix trop global sur `.ScrollArea` peut casser d’autres écrans; garder le scope local.
  - si `fullScreen` est activé sans classes `sm:*` correctes, risque de changer le comportement desktop.
- Critère d’acceptation:
  - aucun élément de la section partage ne sort du viewport iOS, y compris en présence de scrollbar.
