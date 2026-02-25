## Objectif

Transformer l'affichage de la page suivi athlete pour qu'il ressemble au screenshot de référence (style "Plan de semaine"), avec :

1. Un **histogramme de charge hebdomadaire** (barres verticales par jour)
2. Des **cartes de séance détaillées** montrant le type (Footing, VMA, Récup, Seuil), la durée, et le détail RCC formaté (ex: `8×300m @ 54" (r1'30)`, `45' @ 5'15"`)
3. Un bouton **"+ Ajouter une séance"** (visible uniquement pour le coach)

Ce design s'applique à **deux endroits** :

- **Vue athlète** (`AthleteWeeklyView`) : le plan hebdomadaire personnel
- **Vue coach → athlète sélectionné** (`WeeklyTrackingView`) : quand on expand un athlète, on voit ses séances dans ce même format

## Fichiers modifiés

### 1. `src/components/coaching/AthleteWeeklyView.tsx` — Refonte complète du rendu

**Changements :**

- Remplacer le calendrier à dots par un **histogramme de charge** : 7 barres verticales (LUN-DIM) dont la hauteur est proportionnelle à `distance_km` ou durée estimée depuis le `rcc_code`. Barres bleues pour les jours avec séance, grises pour les jours vides.
- Remplacer la liste de séances avec checkboxes par des **cartes blanches arrondies** style iOS :
  - À gauche : le jour abrégé en gras (LUN, MAR, MER...)
  - Au centre : le **titre** en gras (Footing, VMA, Récup, Seuil) + en dessous une ligne de détail avec pastille de couleur d'activité + résumé RCC formaté human-readable (ex: `45' @ 5'15"` ou `8×300m @ 54" (r1'30)`)
  - À droite : la durée estimée (ex: `45'`)
  - Si la séance est complétée : léger style barré ou badge vert
- Conserver la navigation de semaine (chevrons) et le label de semaine en haut
- Conserver la checkbox de complétion et le bouton note (crayon) mais les intégrer dans la carte
- Parser le `rcc_code` avec `parseRCC()` pour extraire le résumé formaté affiché sur chaque carte

### 2. `src/components/coaching/WeeklyTrackingView.tsx` — Améliorer la vue expandée d'un athlète

**Changements :**

- Quand on expand un athlète, remplacer la simple liste `✅/⬜ dayLabel — sessionTitle` par le **même format de cartes** que l'AthleteWeeklyView (histogramme + cartes détaillées)
- Charger les `rcc_code` des sessions dans `loadTracking()` (ajouter `rcc_code` au select)
- Stocker le `rcc_code` dans `SessionInfo` pour le rendre disponible dans l'expanded view

### 3. Nouveau composant : `src/components/coaching/WeeklyPlanCard.tsx` — Composant réutilisable

Créer un composant partagé pour le rendu d'une séance en format "plan de semaine" :

```text
┌──────────────────────────────────────────┐
│  LUN   Footing                      45'  │
│         🟢 45' @ 5'15"                   │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  MAR   VMA                               │
│         🔵 8×300m @ 54" (r1'30)          │
└──────────────────────────────────────────┘
```

**Props :**

- `session: { title, scheduled_at, rcc_code, distance_km, objective, activity_type }`
- `isDone?: boolean`
- `onCheck?: () => void` (optionnel, pour athlète)
- `onNoteClick?: () => void`
- `noteValue?: string`
- `onClick?: () => void`

**Logique interne :**

- Parse `rcc_code` avec `parseRCC()` pour générer la ligne de détail
- Si pas de `rcc_code`, fallback sur `distance_km` + `pace_target`
- Pastille de couleur basée sur le type détecté (VMA=bleu/rouge, EF=vert, Seuil=orange, Récup=vert clair)
- Durée estimée via `computeRCCSummary()`

### 4. Nouveau composant : `src/components/coaching/WeeklyBarChart.tsx` — Histogramme de charge

Composant pur CSS (pas de lib) :

```text
         ██
    ██   ██
    ██   ██        ██
    ██   ██   ██   ██
   LUN  MAR  MER  JEU  VEN  SAM  DIM
```

**Props :**

- `sessions: { scheduled_at, rcc_code?, distance_km? }[]`
- `weekDays: Date[]`

**Logique :**

- Pour chaque jour, calcule la charge (distance ou durée estimée depuis RCC)
- Hauteur max = le jour le plus chargé
- Barre bleue si séance, gris clair si vide
- Labels LUN-DIM en dessous

## Détails techniques

- La donnée `rcc_code` est déjà dans la table `coaching_sessions` et déjà sélectionnée dans `AthleteWeeklyView.loadWeek()`
- `parseRCC()` et `computeRCCSummary()` sont déjà disponibles dans `src/lib/rccParser.ts`
- Le format d'affichage human-readable pour une séance interval sera : `{reps}×{distance}m @ {pace} (r{recovery})` 
- Pour une séance durée : `{duration}' @ {pace}`
- La couleur de la pastille réutilise la logique de `getSessionDotColor()` existante dans `CoachingTab.tsx`

## Ce qui ne change pas

- La navigation de semaine (chevrons gauche/droite)
- Le chargement des données depuis Supabase
- La logique de complétion (toggleCompletion)
- La logique de notes (saveNote)
- Les dialogs existants (CoachingSessionDetail, etc.)