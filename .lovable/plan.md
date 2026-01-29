
# Constructeur de Séance Intelligent

## Vue d'ensemble
Transformer la page "Détails" du wizard de création de séance en un constructeur intelligent permettant de créer des séances simples (footing) ou des séances structurées complexes (fractionné avec blocs multiples). L'UI suivra le design iOS Settings / Apple Fitness.

---

## Architecture de la solution

### 1. Nouveau type de données : Blocs de séance

**Ajout dans `src/components/session-creation/types.ts`** :

```typescript
// Types de blocs disponibles
type BlockType = 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'tempo' | 'steady';

interface SessionBlock {
  id: string;
  type: BlockType;
  // Pour échauffement/retour au calme
  duration?: string;      // "15" (minutes) ou "1500" (mètres)
  durationType?: 'time' | 'distance';
  intensity?: string;     // z1, z2, z3, z4, z5
  pace?: string;          // "5:30" min/km
  
  // Pour séries (interval)
  repetitions?: number;   // 10
  effortDuration?: string;
  effortType?: 'time' | 'distance';
  effortIntensity?: string;
  effortPace?: string;
  recoveryDuration?: string;
  recoveryType?: 'trot' | 'marche' | 'statique';
}

// Nouveau champ dans SessionFormData
interface SessionFormData {
  // ... champs existants
  session_mode: 'simple' | 'structured';
  blocks: SessionBlock[];
}
```

---

### 2. Nouveau design de DetailsStep

**Refonte complète avec les sections suivantes** :

#### Header simplifié
- Titre de la séance (obligatoire)
- Switch iOS "Séance simple / Séance structurée"

#### Section conditionnelle : Séance Simple
- Intensité (Z1-Z5)
- Distance + D+
- Allure générale
- Terrain

#### Section conditionnelle : Séance Structurée
- **Constructeur de blocs** (liste empilée style Apple)
- Bouton "Ajouter un bloc"
- Pas d'allure générale (calculée par bloc)

#### Sections communes
- Lien vers itinéraire (nouveau)
- Participants max
- Visibilité (amis / public)
- Club
- Image & Notes

---

### 3. Composant SessionBlockBuilder

**Nouveau fichier : `src/components/session-creation/SessionBlockBuilder.tsx`**

Liste verticale de blocs avec design iOS :
- Cartes arrondies blanches
- Icônes par type de bloc
- Drag & drop pour réordonner (optionnel)
- Bouton supprimer sur chaque bloc

**Types de blocs disponibles** :
| Type | Icône | Champs |
|------|-------|--------|
| Échauffement | 🔥 | Durée, Intensité, Allure |
| Série/Fractionné | ⚡ | Répétitions, Effort (dist/temps), Récup, Intensité |
| Bloc constant | 🏃 | Durée/Distance, Intensité, Allure |
| Retour au calme | ❄️ | Durée, Intensité, Allure |

---

### 4. Composant RouteSelector

**Nouveau fichier : `src/components/session-creation/RouteSelector.tsx`**

Sélecteur d'itinéraire existant :
- Liste des itinéraires créés par l'utilisateur
- Affichage miniature + stats
- Auto-remplissage : Distance, D+, Terrain

Lorsqu'un itinéraire est sélectionné :
- `distance_km` → valeur de route.total_distance
- `elevation_gain` → valeur de route.total_elevation_gain
- Champs passent en mode "Auto" (badge)

---

### 5. Adaptation automatique selon le sport

**Logique conditionnelle** :

| Sport | Allure | Distance | D+ | Terrain | Puissance |
|-------|--------|----------|----|---------|-----------| 
| Course | min/km | ✓ | ✓ | ✓ | - |
| Trail | min/km | ✓ | ✓ | ✓ | - |
| Vélo | km/h | ✓ | ✓ | - | Watts |
| Natation | min/100m | ✓ (m) | - | - | - |
| Autre | - | - | - | - | - |

Implémentation via helper `getFieldsForActivity(activityType)`.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/session-creation/SessionBlockBuilder.tsx` | Composant constructeur de blocs |
| `src/components/session-creation/SessionBlock.tsx` | Composant individuel pour un bloc |
| `src/components/session-creation/RouteSelector.tsx` | Sélecteur d'itinéraire avec auto-fill |
| `src/components/session-creation/SessionModeSwitch.tsx` | Switch Simple/Structurée style iOS |

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/session-creation/types.ts` | Ajouter types Block, session_mode, etc. |
| `src/components/session-creation/steps/DetailsStep.tsx` | Refonte complète avec design iOS |
| `src/components/session-creation/useSessionWizard.ts` | Gestion des blocs |
| `src/components/session-creation/CreateSessionWizard.tsx` | Sérialisation des blocs pour la DB |

---

## Détails techniques

### Structure de données des blocs

```typescript
// Exemple : 10x400m
const exampleBlocks: SessionBlock[] = [
  {
    id: 'block-1',
    type: 'warmup',
    duration: '15',
    durationType: 'time',
    intensity: 'z2',
    pace: '5:30'
  },
  {
    id: 'block-2',
    type: 'interval',
    repetitions: 10,
    effortDuration: '400',
    effortType: 'distance',
    effortIntensity: 'z5',
    effortPace: '3:30',
    recoveryDuration: '90',
    recoveryType: 'trot'
  },
  {
    id: 'block-3',
    type: 'cooldown',
    duration: '10',
    durationType: 'time',
    intensity: 'z1',
    pace: '6:00'
  }
];
```

### Stockage en base de données

Option 1 - Sérialisation JSON dans le champ `description` (simple)
Option 2 - Nouveau champ `session_blocks` de type JSONB (recommandé)

Migration DB nécessaire :
```sql
ALTER TABLE sessions ADD COLUMN session_blocks jsonb DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN session_mode text DEFAULT 'simple';
```

### Calcul automatique du niveau

Le niveau (1-6) est recalculé à partir des blocs :
- Prend l'intensité la plus élevée des blocs
- Considère les allures d'effort des séries
- Plus le volume à haute intensité est élevé, plus le niveau monte

---

## Design UI (style iOS Settings)

### Palette de couleurs des blocs

| Type | Couleur de fond | Icône |
|------|-----------------|-------|
| Échauffement | `bg-green-500/10` | Timer vert |
| Série | `bg-orange-500/10` | Flame orange |
| Récup | `bg-blue-500/10` | Pause bleue |
| Retour au calme | `bg-purple-500/10` | Timer violet |

### Spacing et arrondis

- Cartes : `rounded-xl` (12px)
- Sections : `rounded-2xl` (16px)
- Padding sections : `p-4`
- Gap entre éléments : `gap-3`

### Switch Mode (style iOS)

```tsx
<div className="bg-secondary rounded-xl p-1 flex">
  <button 
    className={cn(
      "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
      sessionMode === 'simple' 
        ? "bg-white shadow-sm" 
        : "text-muted-foreground"
    )}
  >
    Simple
  </button>
  <button 
    className={cn(
      "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
      sessionMode === 'structured' 
        ? "bg-white shadow-sm" 
        : "text-muted-foreground"
    )}
  >
    Structurée
  </button>
</div>
```

---

## Flux utilisateur

```
1. Utilisateur arrive sur Détails
   ↓
2. Switch "Simple / Structurée" visible en haut
   ↓
3a. Mode Simple → Champs classiques (intensité, distance, allure)
   ↓
3b. Mode Structurée → Constructeur de blocs
   ↓
4. Section Itinéraire (optionnel)
   → Sélection → Auto-fill distance/D+
   ↓
5. Sections communes (participants, visibilité, club)
   ↓
6. Aperçu → Soumission
```

---

## Résultat attendu

1. **Switch en haut** : Bascule fluide entre séance simple et structurée
2. **Constructeur de blocs** : Interface empilée style Apple pour créer des séances complexes
3. **Adaptation automatique** : Champs dynamiques selon le sport sélectionné
4. **Lien itinéraire** : Sélection d'un tracé existant avec auto-remplissage
5. **Design premium** : Cohérent avec iOS Settings, espacements généreux, animations fluides
