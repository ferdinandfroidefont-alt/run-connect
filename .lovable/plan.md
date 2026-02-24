

# Plan de semaine Coach — Plan d'implémentation

## Analyse

Le coach actuel doit ouvrir `CreateCoachingSessionDialog` pour chaque séance individuellement, ce qui est très lent pour préparer 6-7 séances hebdomadaires. L'objectif est un écran unique "Plan de semaine" où le coach construit toutes les séances Lun→Dim, avec variantes par athlète, et envoie tout en 1 clic.

## Architecture

### Nouveau composant principal : `WeeklyPlanDialog.tsx`

Un dialog fullScreen contenant :

```text
┌──────────────────────────────────────┐
│ ← Plan de semaine   Sem. 24 fév  ▸▾ │
├──────────────────────────────────────┤
│ LUN  MAR  MER  JEU  VEN  SAM  DIM   │
│ ┌──┐ ┌──┐      ┌──┐      ┌──┐       │
│ │VMA│ │EF│      │Seuil    │Long│     │
│ └──┘ └──┘      └──┘      └──┘       │
│  [+]  [+]  [+]  [+]  [+]  [+]  [+]  │
├──────────────────────────────────────┤
│ Séance sélectionnée : Lundi — VMA    │
│ Sport: [Course▼]  Objectif: [VMA__]  │
│ Code RCC: [20'>5'30, 6x400>3'30...] │
│ [EF][CD][x400][x1000][R=][+Rep][-Rep]│
│ ▼ Aperçu blocs colorés              │
│ 📍 Lieu: [_______]  📝 Notes: [___] │
│                                       │
│ ─── Variantes par athlète ───        │
│ [+ Ajouter variante]                 │
│ Paul: allure 3'15 (base: 3'00)  [±] │
│ Marie: 8x400 (base: 6x400)     [±] │
├──────────────────────────────────────┤
│ ─── Destinataires ───                │
│ [✓ Club] [○ Sélection]              │
│ Résumé: 6 séances → 12 athlètes     │
│                                       │
│ [📋 Templates]     [🚀 Envoyer plan] │
└──────────────────────────────────────┘
```

### Structure de données locale (state)

```typescript
interface WeekSession {
  dayIndex: number; // 0=lun, 6=dim
  activityType: string;
  objective: string;
  rccCode: string;
  parsedResult: RCCResult;
  coachNotes: string;
  locationName: string;
  athleteOverrides: Record<string, AthleteOverride>;
}

interface AthleteOverride {
  userId: string;
  paceAdjust?: string;   // ex: "3'15" au lieu de "3'00"
  repsAdjust?: number;    // ex: 8 au lieu de 6
  recoveryAdjust?: number; // secondes
  distanceAdjust?: number; // ex: 800 au lieu de 1000
}
```

### Fonctionnalités clés

**1. Calendrier hebdo horizontal** — 7 colonnes, chaque jour affiche les séances ajoutées sous forme de chips cliquables. Bouton `+` sous chaque jour.

**2. Éditeur inline** — Quand on clique sur une séance ou `+`, la zone inférieure affiche l'éditeur RCC (réutilise `RCCEditor` existant) + objectif + sport + notes. Pas de dialog supplémentaire.

**3. Actions rapides** :
- **Dupliquer vers...** : menu dropdown pour copier une séance vers un autre jour (copie RCC + objectif + notes)
- **Supprimer** la séance du jour
- **Depuis template** : charge un template existant

**4. Variantes par athlète** — Section pliable sous chaque séance :
- Sélecteur d'athlète (dropdown parmi les membres du club)
- Boutons `+5s`/`-5s` pour allure, `+1`/`-1` pour reps, `+15s`/`-15s` pour récup
- Affichage compact : "Paul: 3'15/km, 8×400" (différences vs base)

**5. Envoi groupé** — Un seul bouton "Envoyer le plan" :
- Crée N `coaching_sessions` (une par séance dans la semaine)
- Pour chaque session, crée les `coaching_participations` avec `athlete_overrides` JSONB
- Envoie les notifications push en batch
- Résumé avant envoi : "X séances → Y athlètes"

**6. Destinataires** — Partagés pour toute la semaine (pas par séance), toggle club/sélection.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/coaching/WeeklyPlanDialog.tsx` | **Nouveau** — écran principal Plan de semaine |
| `src/components/coaching/WeeklyPlanSessionEditor.tsx` | **Nouveau** — éditeur inline d'une séance dans le plan (sport + objectif + RCC + notes + variantes) |
| `src/components/coaching/AthleteOverrideEditor.tsx` | **Nouveau** — UI rapide pour ajuster allure/reps/récup par athlète avec boutons +/- |
| `src/components/coaching/CoachingTab.tsx` | **Modifié** — ajouter bouton "Plan de semaine" dans le header coach |

## Détail technique par composant

### `WeeklyPlanDialog.tsx`
- Dialog fullScreen avec header sticky (sélecteur de semaine ◂/▸)
- State : `weekSessions: WeekSession[]` + `selectedIndex: number | null`
- Grille 7 colonnes en haut, éditeur en bas
- Bouton "Dupliquer vers..." avec dropdown des jours
- Footer sticky : destinataires + bouton Envoyer
- Fonction `handleSendPlan()` : boucle sur les sessions, insert dans `coaching_sessions` puis `coaching_participations` avec `athlete_overrides`, puis notifications push

### `WeeklyPlanSessionEditor.tsx`
- Reçoit `session: WeekSession` + `onChange`
- Affiche : Select sport, Input objectif, `RCCEditor`, Input lieu, Textarea notes
- Bouton "Depuis template" qui ouvre `CoachingTemplatesDialog`
- Section "Variantes" qui rend `AthleteOverrideEditor`

### `AthleteOverrideEditor.tsx`
- Props : `members: ClubMember[]`, `overrides: Record<string, AthleteOverride>`, `onChange`, `baseBlocks: ParsedBlock[]`
- Select pour ajouter un athlète
- Pour chaque override existant : ligne avec nom + boutons rapides
  - Allure : affiche valeur, boutons `−5s` / `+5s` (modifie par pas de 5 secondes)
  - Reps : affiche valeur, boutons `−1` / `+1`
  - Récup : affiche valeur, boutons `−15s` / `+15s`
  - Bouton supprimer l'override
- Tout est stocké localement, envoyé en JSONB à l'envoi

### Modification `CoachingTab.tsx`
- Ajouter un bouton "📅 Plan semaine" dans le header (à côté de Templates et Créer)
- State `showWeeklyPlan` + rendu du `WeeklyPlanDialog`

## Pas de migration SQL nécessaire

La colonne `athlete_overrides jsonb` existe déjà sur `coaching_participations`. Les données seront structurées comme :

```json
{
  "pace": "3:15",
  "reps": 8,
  "recovery": 105,
  "distance": 800
}
```

## Flux complet

1. Coach ouvre Club → Coach → "Plan semaine"
2. Sélectionne la semaine (navigation ◂/▸)
3. Clique `+` sur Lundi → éditeur apparaît en bas
4. Tape objectif "VMA", colle/tape RCC `20'>5'30, 6x400>3'30 r1'30>trot, 10'>6'00`
5. Aperçu coloré apparaît en live
6. Optionnel : ouvre "Variantes", sélectionne Paul, ajuste allure à 3'15
7. Clique "Dupliquer vers Mercredi", modifie l'objectif en "Seuil"
8. Répète pour les autres jours
9. Sélectionne destinataires (club ou sélection)
10. Clique "Envoyer le plan" → résumé "6 séances → 12 athlètes" → confirmation
11. Toutes les sessions sont créées + participations + notifications

## Ordre d'implémentation

1. `AthleteOverrideEditor.tsx` (composant autonome)
2. `WeeklyPlanSessionEditor.tsx` (utilise RCCEditor + AthleteOverrideEditor)
3. `WeeklyPlanDialog.tsx` (écran principal avec grille + envoi groupé)
4. Modification `CoachingTab.tsx` (bouton d'accès)

