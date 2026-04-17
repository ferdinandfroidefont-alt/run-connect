
Le user signale que certains wheel pickers (notamment dans création de séance) ne scrollent pas — le geste touch passe à la page derrière. J'ai déjà corrigé `useBodyScrollLock` précédemment en retirant `touchAction = "none"`, mais le problème persiste sur certains pickers.

Investigation nécessaire :
- Vérifier `PickerColumn` dans `ios-wheel-picker.tsx` : la colonne doit avoir `touch-action: pan-y` et `overscroll-behavior: contain` pour capter le scroll vertical sans le propager.
- Vérifier que le panel modal n'a pas `touch-action: none` qui bloquerait les enfants.
- Vérifier les z-index et que le portal est bien au-dessus.
- Le `DetailsStep` utilise `WheelValuePickerModal` pour pace/distance/elevation/participants — il faut s'assurer que le modal ouvert capte bien les touch events.

Cause probable : la colonne scrollable n'a pas les bonnes propriétés CSS (`touch-action: pan-y`, `overscroll-behavior: contain`, `-webkit-overflow-scrolling: touch`) ou le wrapper parent intercepte les gestures.

## Plan

**1. Corriger `src/components/ui/ios-wheel-picker.tsx`**
- Sur `PickerColumn` (l'élément `overflow-y-auto`) :
  - Ajouter `touchAction: 'pan-y'` inline pour autoriser le scroll vertical du picker.
  - Ajouter `overscrollBehavior: 'contain'` pour empêcher le pass-through vers la page derrière.
  - Ajouter `WebkitOverflowScrolling: 'touch'` pour le momentum iOS.
- Sur le panel modal racine (le conteneur du picker) :
  - S'assurer qu'il n'a PAS `touch-action: none` global, mais ajouter `overscroll-behavior: contain` sur le wrapper scrollable.
- Sur l'overlay (backdrop) :
  - Garder `touch-action: none` UNIQUEMENT sur le backdrop pour bloquer le scroll de la page, mais pas sur le panel.

**2. Renforcer `useBodyScrollLock`**
- Vérifier que la stratégie `position: fixed` sur body est bien active quand le modal est ouvert (déjà fait précédemment), pour empêcher tout scroll de la page derrière même si un événement fuit.

**3. Vérification**
- Tester sur création de séance (`DetailsStep` → pace, distance, elevation pickers).
- Tester sur édition records (`ProfileSportRecordsEdit`).
- Tester sur RPE pickers coaching.

Aucun autre fichier ne doit être modifié. Patch ciblé sur `ios-wheel-picker.tsx`.
