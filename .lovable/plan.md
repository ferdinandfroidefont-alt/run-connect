
# Système de Niveaux Automatiques pour RunConnect

## Vue d'ensemble
Ce plan implémente un système de classification automatique des séances en 6 niveaux, avec un nouveau filtre visuel en forme de pyramide sur la carte principale. Le niveau est calculé automatiquement à partir des paramètres de la séance (allure, type, intensité) - l'utilisateur ne choisit jamais son niveau.

---

## Les 6 Niveaux

| Niveau | Label | Couleur | Badge |
|--------|-------|---------|-------|
| 1 | Débutant | Vert clair (#22c55e) | Rond vert |
| 2 | Loisir | Vert foncé (#16a34a) | Rond vert foncé |
| 3 | Intermédiaire | Jaune (#eab308) | Rond jaune |
| 4 | Avancé | Orange (#f97316) | Rond orange |
| 5 | Performance | Rouge (#ef4444) | Rond rouge |
| 6 | Élite | Violet (#8b5cf6) | Rond violet |

---

## Phase 1 : Logique de calcul automatique du niveau

### Fichier : `src/lib/sessionLevelCalculator.ts` (nouveau)

Algorithme de calcul basé sur :

**Pour les sports d'endurance (course, trail, vélo, natation) :**
- Type de séance (footing = niveau bas, fractionné/compétition = niveau haut)
- Allure cible (pace_general) convertie en vitesse
- Intensité sélectionnée (Z1-Z5)
- Distance prévue

**Matrice de calcul pour la course à pied :**
```text
Type séance          | Base | Modificateur allure      | Modificateur intensité
---------------------|------|--------------------------|----------------------
recuperation         | 1    | -                        | -
footing              | 2    | > 6:00/km → 1            | Z1 → -1
sortie_longue        | 3    | 5:00-6:00 → +0           | Z2 → 0  
seuil                | 4    | 4:30-5:00 → +1           | Z3 → +1
fractionne/fartlek   | 5    | 4:00-4:30 → +2           | Z4 → +1
competition          | 5    | < 4:00 → +3              | Z5 → +2
```

**Pour les sports collectifs/autres (foot, basket, yoga...) :**
- L'utilisateur peut optionnellement sélectionner un niveau (débutant à confirmé)
- Si non spécifié : niveau 3 (Intermédiaire) par défaut

---

## Phase 2 : Composant Badge de Niveau

### Fichier : `src/components/SessionLevelBadge.tsx` (nouveau)

Composant réutilisable affichant :
- Pastille colorée avec le niveau
- Tooltip avec le nom complet du niveau
- Variantes : compact (icône seule), full (icône + texte)

---

## Phase 3 : Filtre Pyramide sur la carte

### Fichier : `src/components/LevelPyramidFilter.tsx` (nouveau)

**Design visuel :**
```text
    ▲  ← Élite (6)
   ▲▲  ← Performance (5)
  ▲▲▲  ← Avancé (4)
 ▲▲▲▲  ← Intermédiaire (3)
▲▲▲▲▲  ← Loisir (2)
▲▲▲▲▲▲ ← Débutant (1)
```

**Interaction style iPhone (slider vertical) :**
- Glisser verticalement pour sélectionner un niveau ou une plage
- Tap sur un niveau = sélection unique
- Drag pour sélectionner une plage (ex: niveaux 3 à 5)
- Les segments non sélectionnés sont grisés
- Animation fluide type iOS Settings

**Positionnement :**
- À gauche des boutons "Classement" et "Confirmer présence"
- Taille compacte : ~50x100px
- Semi-transparent avec backdrop blur

---

## Phase 4 : Intégration dans InteractiveMap

### Modifications `src/components/InteractiveMap.tsx`

1. **Nouveau state pour le filtre niveau :**
```typescript
interface Filter {
  // ... existants
  level_range: [number, number] | null; // [min, max] ou null = tous
}
```

2. **Intégration du LevelPyramidFilter** dans le layout à droite, au-dessus des boutons existants

3. **Filtrage des sessions** dans `createMarkers()` :
```typescript
const matchesLevel = !filters.level_range || 
  (session.calculated_level >= filters.level_range[0] && 
   session.calculated_level <= filters.level_range[1]);
```

4. **Coloration des marqueurs** selon le niveau de la séance

---

## Phase 5 : Stockage et affichage

### Modification base de données

Ajout colonne `calculated_level` (integer 1-6) dans la table `sessions` :
```sql
ALTER TABLE sessions ADD COLUMN calculated_level integer DEFAULT 3;
```

### Calcul à la création

Dans `CreateSessionWizard.tsx`, calculer le niveau avant l'insertion :
```typescript
const level = calculateSessionLevel(formData);
// Insérer avec calculated_level: level
```

---

## Phase 6 : Affichage du niveau partout

### Fichiers à modifier :

1. **SessionPreviewPopup.tsx** : Ajouter le badge niveau
2. **SessionDetailsDialog.tsx** : Afficher niveau + explication
3. **FeedCard.tsx** : Badge niveau sur les cartes du feed
4. **DiscoverCard.tsx** : Badge niveau

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/lib/sessionLevelCalculator.ts` | Logique de calcul du niveau |
| `src/components/SessionLevelBadge.tsx` | Badge visuel du niveau |
| `src/components/LevelPyramidFilter.tsx` | Filtre pyramide interactif |

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/InteractiveMap.tsx` | Ajout filtre niveau + state + filtrage |
| `src/components/session-creation/CreateSessionWizard.tsx` | Calcul niveau à la création |
| `src/components/SessionPreviewPopup.tsx` | Affichage badge niveau |
| `src/components/SessionDetailsDialog.tsx` | Affichage niveau détaillé |
| `src/components/session-creation/types.ts` | Types pour les niveaux |
| `src/integrations/supabase/types.ts` | Après migration DB |

---

## Détails techniques

### Algorithme de calcul (sessionLevelCalculator.ts)

```typescript
export type SessionLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const LEVEL_CONFIG = {
  1: { label: 'Débutant', color: '#22c55e', bgClass: 'bg-green-500' },
  2: { label: 'Loisir', color: '#16a34a', bgClass: 'bg-green-600' },
  3: { label: 'Intermédiaire', color: '#eab308', bgClass: 'bg-yellow-500' },
  4: { label: 'Avancé', color: '#f97316', bgClass: 'bg-orange-500' },
  5: { label: 'Performance', color: '#ef4444', bgClass: 'bg-red-500' },
  6: { label: 'Élite', color: '#8b5cf6', bgClass: 'bg-violet-500' },
};

// Sports où le calcul automatique s'applique
const ENDURANCE_SPORTS = ['course', 'trail', 'velo', 'vtt', 'gravel', 'natation', 'marche'];

// Conversion pace string "5:30" en secondes par km
function parsePaceToSeconds(pace: string): number | null;

// Calcul principal
export function calculateSessionLevel(formData: SessionFormData): SessionLevel;
```

### LevelPyramidFilter - Interaction

- **Single tap** : Toggle un niveau unique
- **Vertical drag** : Sélectionne une plage de niveaux
- **Double tap** : Reset (afficher tous les niveaux)
- **Feedback visuel** : Segments sélectionnés en couleur, autres en gris avec opacité réduite

---

## Résultat attendu

1. **Création de séance** → Niveau calculé automatiquement et affiché
2. **Carte principale** → Nouveau filtre pyramide permettant de filtrer par niveau
3. **Marqueurs carte** → Colorés selon le niveau de la séance
4. **Expérience utilisateur** → "La carte s'adapte à mon niveau" - iPhone style, zéro friction
