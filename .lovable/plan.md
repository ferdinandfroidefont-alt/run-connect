## Objectif

Afficher la tab bar (barre de navigation du bas) sur les pages :
- `/profile` (Profil — 5e onglet)
- `/profile/records` et sous-pages (édition des records sportifs)
- `/stories/create` (création de story)

Actuellement la tab bar est masquée sur ces écrans, alors qu'on souhaite la conserver pour rester cohérent avec la nouvelle 5e entrée "Profil".

## Changements

### 1. `src/components/Layout.tsx`

Supprimer la logique `isProfileShellRoute` qui force le masquage de la tab bar et qui retire le padding bas du `<main>`.

- Retirer la définition `isProfileShellRoute = location.pathname === '/profile' || location.pathname.startsWith('/profile/records')`.
- Pour `layoutBottomInset` : ne plus exclure les routes profil → utiliser uniquement `removeMainBottomInset` pour décider du padding.
- Passer `<BottomNavigation />` sans la prop `isProfileRoute` (ou en lui passant `false`).

Résultat : tab bar visible et zone de contenu correctement padée sur Profil et Records.

### 2. `src/pages/StoryCreate.tsx` (à vérifier)

Vérifier si cette page appelle `setBottomNavSuppressed("...", true)` ou `setHideBottomNav(true)` pour masquer la tab bar pendant la création de story. Si oui, retirer cet appel pour laisser la tab bar visible.

(Si la page utilise un overlay plein écran type caméra immersive et que la tab bar gêne visuellement les contrôles bas, on pourra discuter d'un compromis — mais la demande est claire : afficher la tab bar.)

### 3. Vérifications complémentaires

- `src/pages/Profile.tsx` et `src/pages/ProfileSportRecordsEdit.tsx` : s'assurer qu'aucun `setBottomNavSuppressed` n'est appelé localement. Les retirer le cas échéant.
- Vérifier que le contenu scrollable de ces pages utilise bien `var(--bottom-nav-offset)` comme padding bas (via `IosPageLayout` ou équivalent) pour que le dernier élément ne soit pas masqué par la tab bar.

## Détails techniques

Fichiers touchés :
- `src/components/Layout.tsx` — suppression de la branche `isProfileShellRoute`.
- `src/components/BottomNavigation.tsx` — la prop `isProfileRoute` peut rester (rétrocompat) mais ne sera plus passée à `true`.
- `src/pages/StoryCreate.tsx` — retirer suppression de la tab bar si présente.
- Éventuellement `src/pages/Profile.tsx` / `src/pages/ProfileSportRecordsEdit.tsx` si suppression locale détectée.

Aucune migration DB, aucun changement d'API.