

# Plan : Mode Coach "Club FFA" — Groupes + Volume + Suivi

## Constat

Le système actuel est pensé "individu par individu". Un coach de club FFA gère **des groupes de niveau** (Sprint, Demi-fond, Loisirs, Minimes), pas 40 athlètes un par un. Il manque aussi le résumé volume/durée/charge sous le code RCC, et un suivi simple (fait/programmé/non fait).

## Changements prévus

### 1. Résumé de volume instantané sous le RCC

**Fichier : `src/components/coaching/RCCBlocksPreview.tsx`**

Ajouter en haut du preview une barre de résumé calculée à partir des blocs parsés :

```text
📏 5.8 km  ·  ⏱ 58 min  ·  🔥 Modérée
```

Logique de calcul (nouvelle fonction `computeRCCSummary` dans `rccParser.ts`) :
- **Volume total** : pour les blocs `interval` → `reps × distance` ; pour les blocs `steady/warmup/cooldown` → `durée × vitesse déduite de l'allure`
- **Durée estimée** : somme des durées + (reps × temps par répétition) + récupérations
- **Charge** : basée sur le ratio allure basse / allure haute (Facile / Modérée / Intense / Très intense)

**Fichier : `src/lib/rccParser.ts`** — ajout de `computeRCCSummary(blocks: ParsedBlock[]): { totalDistanceKm: number; totalDurationMin: number; intensity: string }`

### 2. Groupes de niveau dans le club

**Migration SQL** : Nouvelle table `club_groups`

```sql
CREATE TABLE club_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE club_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES club_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);
```

RLS : les membres du club peuvent voir les groupes ; les coachs/créateurs peuvent créer/modifier/supprimer.

### 3. Sélecteur de groupe dans le WeeklyPlanDialog

**Fichier : `src/components/coaching/WeeklyPlanDialog.tsx`**

Remplacer le toggle "Tout le club / Sélection" par un sélecteur de groupe :

```text
Destinataires : [Tout le club ▼] [Demi-fond ▼] [Sprint ▼] [Sélection manuelle]
```

- Quand un groupe est sélectionné, les membres de ce groupe deviennent les `targetMembers`
- Le coach peut toujours basculer en sélection manuelle
- Résumé : "4 séances → Groupe Demi-fond (12 athlètes)"

### 4. Gestion des groupes dans ClubInfoDialog

**Fichier : `src/components/ClubInfoDialog.tsx`**

Ajouter un onglet "Groupes" (visible uniquement pour le coach/admin) dans le `Tabs` existant :
- Liste des groupes avec couleur + nombre de membres
- Bouton "+ Créer un groupe"
- Drag & drop ou multi-select pour affecter des membres aux groupes
- Un athlète peut être dans plusieurs groupes

**Nouveau composant : `src/components/coaching/ClubGroupsManager.tsx`**
- CRUD des groupes (nom, couleur)
- Affectation des membres (checkbox list)

### 5. Suivi simple dans le CoachingTab

**Fichier : `src/components/coaching/CoachingTab.tsx`**

Ajouter un indicateur de suivi par séance (sous chaque `SessionCard`) :

```text
✅ 8  🕒 3  ❌ 1  — 92% complétion
```

Les statuts viennent de `coaching_participations.status` :
- `completed` → ✅
- `scheduled` → 🕒
- `sent` (pas d'action) → ❌ (après la date)

Pas besoin de nouvel écran, juste un petit badge sous chaque session card.

### 6. Suivi hebdo coach (vue synthétique)

**Nouveau composant : `src/components/coaching/WeeklyTrackingView.tsx`**

Accessible depuis un bouton "📊 Suivi" dans le header du CoachingTab. Affiche un tableau simple :

```text
           Lun   Mar   Mer   Jeu   Ven   Sam
Paul       ✅    ✅    🕒    —     —     ✅    83%
Marie      ✅    ✅    ✅    —     —     ✅    100%
Lucas      ❌    🕒    —     —     —     —     17%
```

Requête : `coaching_sessions` de la semaine + `coaching_participations` avec statuts.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/lib/rccParser.ts` | Ajout `computeRCCSummary()` |
| `src/components/coaching/RCCBlocksPreview.tsx` | Ajout barre résumé volume/durée/charge |
| `src/components/coaching/WeeklyPlanDialog.tsx` | Sélecteur de groupe au lieu de club/sélection |
| `src/components/coaching/CoachingTab.tsx` | Badge suivi par séance + bouton Suivi |
| `src/components/coaching/ClubGroupsManager.tsx` | **Nouveau** — CRUD groupes de niveau |
| `src/components/coaching/WeeklyTrackingView.tsx` | **Nouveau** — tableau suivi hebdo |
| `src/components/ClubInfoDialog.tsx` | Onglet "Groupes" pour coach/admin |
| Migration SQL | Tables `club_groups` + `club_group_members` + RLS |

## Ordre d'implémentation

1. Migration SQL (`club_groups` + `club_group_members`)
2. `computeRCCSummary` dans `rccParser.ts` + barre résumé dans `RCCBlocksPreview`
3. `ClubGroupsManager.tsx` + onglet dans `ClubInfoDialog`
4. Sélecteur de groupe dans `WeeklyPlanDialog`
5. Badges suivi dans `CoachingTab` + `WeeklyTrackingView`

