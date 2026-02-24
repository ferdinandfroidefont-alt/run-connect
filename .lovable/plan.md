

# Mode Coach RCC (RunConnect Code) — Plan d'implémentation

## Résumé

Remplacer le flow de création de séance coach actuel (3 étapes, formulaire classique) par un éditeur ultra-rapide basé sur un "langage séance" (RCC). Le coach tape un code comme `20'>5'15, 3x1000>3'00 r1'15>trot, 5'>6'00` et l'app parse en temps réel pour afficher des blocs visuels colorés. Ajout d'un calendrier dans l'onglet Coach, de templates sauvegardés, et de variantes par athlète.

---

## Architecture technique

### 1. Migration SQL

**Nouvelle table `coaching_templates`** pour sauvegarder les templates réutilisables :
- `id uuid PK DEFAULT gen_random_uuid()`
- `coach_id uuid NOT NULL` (ref profiles.user_id)
- `name text NOT NULL` (ex: "6x400 VMA")
- `rcc_code text NOT NULL` (le code brut)
- `activity_type text DEFAULT 'course'`
- `objective text` (ex: "VMA", "Seuil")
- `created_at timestamptz DEFAULT now()`

RLS : coach peut CRUD ses propres templates.

**Modifier `coaching_sessions`** :
- Ajouter `rcc_code text` — le code RCC brut sauvegardé
- Ajouter `objective text` — objectif rapide (VMA, Seuil, Footing, etc.)
- Ajouter `default_location_name text` — lieu par défaut optionnel
- Ajouter `default_location_lat numeric`
- Ajouter `default_location_lng numeric`

**Modifier `coaching_participations`** :
- Ajouter `athlete_overrides jsonb DEFAULT '{}'` — stocke les ajustements par athlète (allures, reps, récup) définis par le coach

### 2. Parser RCC — Nouveau fichier `src/lib/rccParser.ts`

Fonction pure `parseRCC(code: string): { blocks: ParsedBlock[], errors: RCCError[] }`.

Règles de parsing :
- Séparateur de blocs : `,` ou `+`
- Bloc durée : `20'>5'15` → durée 20 min, allure 5:15/km → type `steady`
- Bloc intervalles : `3x1000>3'00` → 3 reps × 1000m @ 3:00/km → type `interval`
- Récupération : `r1'15>trot` ou `r1'00>marche` → attachée au bloc précédent
- Si le premier bloc a une allure > 5:30 → auto-tag `warmup`
- Si le dernier bloc a une allure > 5:30 → auto-tag `cooldown`
- Sinon `steady` ou `interval`

Interface de sortie :
```typescript
interface ParsedBlock {
  type: 'warmup' | 'interval' | 'steady' | 'cooldown';
  raw: string; // le texte source
  duration?: number; // minutes
  pace?: string; // "5:15"
  distance?: number; // mètres (pour intervalles)
  repetitions?: number;
  recoveryDuration?: number; // secondes
  recoveryType?: 'trot' | 'marche' | 'statique';
}

interface RCCError {
  blockIndex: number;
  raw: string;
  message: string;
}
```

Conversion vers `SessionBlock[]` (type existant) via `rccToSessionBlocks()`.

### 3. Nouveau composant `RCCEditor.tsx`

Composant principal de l'éditeur RCC :

- **Champ texte** : `<Textarea>` monospace avec placeholder `"20'>5'15, 3x1000>3'00 r1'15>trot, 5'>6'00"`
- **Live preview** : sous le champ, appel de `parseRCC()` à chaque frappe (debounce 200ms), affiche `CoachingBlocksPreview` coloré
- **Erreurs** : si parsing échoue sur un bloc, afficher le texte brut + message rouge "Format invalide : [bloc concerné]"
- **Boutons rapides** (chips sous l'éditeur) :
  - `EF` → insère `20'>5'30`
  - `CD` → insère `10'>6'00`
  - `x400` → insère `6x400>3'30`
  - `x1000` → insère `3x1000>4'00`
  - `R=` → insère `r1'30>trot`
  - `@` → insère `>` (séparateur allure)
  - `+Rep` / `-Rep` → incrémente/décrémente les reps du dernier bloc intervalle
  - `+Bloc` / `-Bloc` → ajoute/supprime le dernier bloc

### 4. Refonte `CoachingTab.tsx`

Transformer l'onglet Coach pour inclure :

- **Vue calendrier** (semaine/mois) réutilisant la logique de `SessionCalendarView` mais adaptée aux coaching_sessions
- **Bouton "+" sur chaque jour** pour créer une séance à cette date
- **Liste des séances** du jour sélectionné avec statut de complétion
- **Bouton "Templates"** pour accéder aux templates sauvegardés

### 5. Refonte `CreateCoachingSessionDialog.tsx`

Simplification radicale — une seule page au lieu de 3 étapes :

```
┌─────────────────────────────────┐
│ ← Nouvelle séance  📅 Lun 24 fév│
├─────────────────────────────────┤
│ Sport: [Course ▼]               │
│ Objectif: [VMA________]        │
│                                  │
│ Code séance (RCC):               │
│ ┌──────────────────────────────┐│
│ │20'>5'15, 3x1000>3'00        ││
│ │r1'15>trot, 5'>6'00          ││
│ └──────────────────────────────┘│
│ [EF][CD][x400][x1000][R=][@]   │
│ [+Rep][-Rep][+Bloc][-Bloc]      │
│                                  │
│ ▼ Aperçu en temps réel          │
│ ┌──────────────────────────────┐│
│ │🟢 EF  20min @ 5:15           ││
│ │🔴 3×1000m @ 3:00 r1'15 trot  ││
│ │🟢 CD  5min @ 6:00            ││
│ └──────────────────────────────┘│
│                                  │
│ 📍 Lieu (optionnel): [_______]  │
│ 📝 Consignes coach: [________] │
│                                  │
│ ─── Destinataires ───            │
│ 🔍 [Rechercher un athlète]       │
│ [✓ Tout le club] [○ Sélection]  │
│ [Athlète 1 ✓] [Athlète 2 ✓]    │
│                                  │
│ ─── Ajustements par athlète ─── │
│ (optionnel, cliquer sur athlète) │
│                                  │
│ [💾 Sauver template] [Envoyer →]│
└─────────────────────────────────┘
```

- **Date** pré-remplie (passée depuis le calendrier)
- **Sport** + **Objectif** en haut
- **RCCEditor** au centre avec preview live
- **Lieu optionnel** (pré-défini par coach, modifiable par athlète)
- **Destinataires** inline (toggle club/sélection + recherche)
- **Ajustements par athlète** : quand un athlète est sélectionné, le coach peut modifier allure `@`, reps `x`, récup `R=` pour cet athlète spécifique → stocké dans `athlete_overrides` sur `coaching_participations`
- **Bouton "Sauver template"** → sauvegarde dans `coaching_templates`
- **Bouton "Envoyer"** → crée la session + participations + notifications

### 6. Templates

Nouveau composant `CoachingTemplatesDialog.tsx` :
- Liste des templates sauvegardés par le coach
- Clic → pré-remplit le RCC dans l'éditeur
- Bouton supprimer template
- Accessible depuis le CoachingTab

### 7. Mise à jour `CoachingBlocksPreview.tsx`

Adapter pour supporter les blocs RCC avec couleurs spécifiques :
- EF/Footing = vert (`bg-green-500/10`)
- Travail/Intervalles = rouge/bleu (`bg-red-500/10` pour VMA, `bg-blue-500/10` pour seuil)
- Récup = gris (`bg-gray-500/10`)
- CD = vert clair (`bg-emerald-500/10`)

### 8. Mise à jour athlète

`ScheduleCoachingDialog.tsx` : si la session a un `default_location_name`, pré-remplir le lieu (l'athlète peut modifier). Afficher les `athlete_overrides` si le coach a défini des ajustements personnalisés (allures différentes).

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `supabase/migrations/` | Nouvelle migration : table `coaching_templates` + colonnes sur `coaching_sessions` et `coaching_participations` |
| `src/lib/rccParser.ts` | **Nouveau** — parser RCC |
| `src/components/coaching/RCCEditor.tsx` | **Nouveau** — éditeur avec live preview et boutons rapides |
| `src/components/coaching/CoachingTemplatesDialog.tsx` | **Nouveau** — gestion templates |
| `src/components/coaching/CoachingTab.tsx` | Refonte avec calendrier + templates |
| `src/components/coaching/CreateCoachingSessionDialog.tsx` | Refonte : page unique avec RCC + destinataires + ajustements |
| `src/components/coaching/CoachingBlocksPreview.tsx` | Couleurs enrichies pour RCC |
| `src/components/coaching/ScheduleCoachingDialog.tsx` | Pré-remplissage lieu + overrides athlète |
| `src/integrations/supabase/types.ts` | Auto-régénéré |

## Ordre d'implémentation

1. Migration SQL (table `coaching_templates` + colonnes)
2. Parser RCC (`rccParser.ts`)
3. Éditeur RCC (`RCCEditor.tsx`)
4. Refonte `CreateCoachingSessionDialog` (page unique avec RCC)
5. Templates (`CoachingTemplatesDialog.tsx`)
6. Refonte `CoachingTab` (calendrier + templates)
7. Mise à jour `CoachingBlocksPreview` (couleurs)
8. Mise à jour `ScheduleCoachingDialog` (lieu par défaut + overrides)

