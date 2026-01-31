

# Système de Visibilité Avancé pour les Séances

## Résumé

Ajouter un système de visibilité premium style Réglages iPhone permettant de définir qui peut voir chaque séance, avec 3 niveaux de visibilité et la possibilité de masquer pour des amis spécifiques via une barre de recherche.

---

## Fonctionnalités à implémenter

### 1. Options de Visibilité (3 niveaux)

| Option | Description | Badge | Premium |
|--------|-------------|-------|---------|
| **Amis uniquement** | Visible par vos amis acceptés | ✅ Recommandé | Non |
| **Club** | Visible par les membres d'un club sélectionné | - | Non |
| **Tout le monde** | Visible publiquement dans Découvrir | 👑 Premium | **Oui** |

### 2. Masquer pour des amis spécifiques

- Barre de recherche pour filtrer parmi vos amis
- Sélection multiple des personnes à exclure
- Les personnes masquées ne verront pas la séance

### 3. Modification depuis "Mes séances"

- Section visibilité dans EditSessionDialog
- Même interface que la création
- Changements immédiats

---

## Changements Base de Données

### Nouvelle colonne `sessions`

```sql
ALTER TABLE sessions 
ADD COLUMN visibility_type TEXT DEFAULT 'friends' 
CHECK (visibility_type IN ('friends', 'club', 'public'));

ALTER TABLE sessions 
ADD COLUMN hidden_from_users UUID[] DEFAULT '{}';
```

| Colonne | Type | Description |
|---------|------|-------------|
| `visibility_type` | TEXT | 'friends' / 'club' / 'public' |
| `hidden_from_users` | UUID[] | Liste des user_id qui ne verront pas la séance |

---

## Modifications des Fichiers

### 1. Types (`src/components/session-creation/types.ts`)

Ajouter les nouveaux champs au `SessionFormData` :

```typescript
export type VisibilityType = 'friends' | 'club' | 'public';

export interface SessionFormData {
  // ... existing fields
  visibility_type: VisibilityType;
  hidden_from_users: string[];
}
```

### 2. Nouveau composant (`src/components/session-creation/VisibilitySelector.tsx`)

Composant style Réglages iPhone avec :

- **Section "Qui peut voir"** : 3 options radio avec icônes colorées
  - 👥 Amis uniquement (vert, badge "Recommandé")
  - 🏢 Club (bleu)
  - 🌍 Tout le monde (orange, badge "Premium" + lock si non premium)

- **Section "Masquer pour"** : 
  - Barre de recherche avec icône 🔍
  - Liste scrollable des amis avec avatar et checkbox
  - Compteur "X personnes masquées"

### 3. ConfirmStep (`src/components/session-creation/steps/ConfirmStep.tsx`)

- Intégrer `VisibilitySelector` en remplacement du simple toggle
- Afficher le résumé de la visibilité dans l'aperçu

### 4. DetailsStep (`src/components/session-creation/steps/DetailsStep.tsx`)

- Supprimer l'ancien toggle "Amis uniquement"
- Remplacer par le nouveau `VisibilitySelector`
- Lier au club selector existant

### 5. CreateSessionWizard (`src/components/session-creation/CreateSessionWizard.tsx`)

- Mettre à jour handleSubmit pour envoyer `visibility_type` et `hidden_from_users`
- Logique de validation premium pour "public"

### 6. EditSessionDialog (`src/components/EditSessionDialog.tsx`)

- Ajouter la section visibilité avec le même composant
- Charger les valeurs existantes
- Permettre la modification

### 7. InteractiveMap (`src/components/InteractiveMap.tsx`)

- Modifier la logique de filtrage pour respecter `visibility_type`
- Exclure les sessions où l'utilisateur est dans `hidden_from_users`

### 8. useSessionWizard (`src/components/session-creation/useSessionWizard.ts`)

- Ajouter `visibility_type` et `hidden_from_users` au state

---

## Design UI (Style iOS Réglages)

### VisibilitySelector - Vue principale

```
┌─────────────────────────────────────────┐
│  QUI PEUT VOIR                          │
├─────────────────────────────────────────┤
│ ┌────────────────────────────────────┐  │
│ │ 👥 Amis uniquement    [Recommandé] │  │
│ │    Visible par vos amis     ○──●   │  │
│ ├────────────────────────────────────┤  │
│ │ 🏢 Club                            │  │
│ │    Visible par le club       ●──○  │  │
│ ├────────────────────────────────────┤  │
│ │ 🌍 Tout le monde        👑 Premium │  │
│ │    Visible dans Découvrir    ●──○  │  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  MASQUER POUR (OPTIONNEL)               │
├─────────────────────────────────────────┤
│ ┌────────────────────────────────────┐  │
│ │ 🔍 Rechercher un ami...            │  │
│ └────────────────────────────────────┘  │
│ ┌────────────────────────────────────┐  │
│ │ 👤 Marie Dupont              ☐     │  │
│ ├────────────────────────────────────┤  │
│ │ 👤 Pierre Martin             ☑     │  │
│ ├────────────────────────────────────┤  │
│ │ 👤 Sophie Bernard            ☐     │  │
│ └────────────────────────────────────┘  │
│         1 personne masquée              │
└─────────────────────────────────────────┘
```

### Composants UI utilisés

- `IOSListGroup` et `IOSListItem` pour le style natif
- `Switch` ou `RadioGroup` pour les options de visibilité
- `Input` avec icône de recherche
- `Checkbox` pour la sélection des amis à masquer
- `Avatar` pour les photos de profil

---

## Logique de Filtrage (Backend)

### Règles de visibilité dans InteractiveMap

```typescript
// Filtrer les sessions visibles
visibleSessions = sessions.filter(session => {
  // Toujours voir ses propres sessions
  if (session.organizer_id === user.id) return true;
  
  // Vérifier si masqué pour cet utilisateur
  if (session.hidden_from_users?.includes(user.id)) return false;
  
  switch (session.visibility_type) {
    case 'friends':
      return friendIds.includes(session.organizer_id);
    case 'club':
      return userClubIds.includes(session.club_id);
    case 'public':
      return true;
    default:
      return false;
  }
});
```

---

## Migration des données existantes

Pour les sessions existantes avec `friends_only` :

```sql
UPDATE sessions 
SET visibility_type = CASE 
  WHEN friends_only = true THEN 'friends'
  ELSE 'public'
END
WHERE visibility_type IS NULL;
```

---

## Récapitulatif des fichiers à modifier/créer

| Fichier | Action |
|---------|--------|
| `src/components/session-creation/types.ts` | Modifier |
| `src/components/session-creation/VisibilitySelector.tsx` | **Créer** |
| `src/components/session-creation/steps/ConfirmStep.tsx` | Modifier |
| `src/components/session-creation/steps/DetailsStep.tsx` | Modifier |
| `src/components/session-creation/useSessionWizard.ts` | Modifier |
| `src/components/session-creation/CreateSessionWizard.tsx` | Modifier |
| `src/components/EditSessionDialog.tsx` | Modifier |
| `src/components/InteractiveMap.tsx` | Modifier |
| Migration SQL | Créer |

