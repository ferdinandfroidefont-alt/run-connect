

# Rendre le Plan Hebdo vraiment plus rapide que WhatsApp

## Le vrai problème

Un coach FFA le dimanche soir : 4 groupes × 5 séances = 20 séances à créer. Avec le flow actuel, il doit cliquer "+" 20 fois, remplir chaque séance une par une, puis sélectionner le groupe en bas. C'est plus lent que copier-coller sur WhatsApp. Aucun coach ne se dira "ça me fait gagner du temps".

## Ce qui changerait tout : 3 fonctions clés

### 1. Groupe d'abord, pas à la fin

Actuellement le groupe est choisi dans le footer au moment d'envoyer. Le coach devrait commencer par choisir son groupe, puis remplir la semaine pour ce groupe.

**Flow proposé :**

```text
┌─────────────────────────────────┐
│ ← Plan de semaine               │
│                                  │
│ Groupe : [Demi-fond ▼]          │  ← PREMIER choix
│ Sem. 24 fév 2026                │
│                                  │
│ Lun  Mar  Mer  Jeu  Ven  Sam   │
│ VMA  —    Seuil —   EF   Sortie│
│  +   +     +   +    +    +     │
│                                  │
│ [Éditeur de séance]             │
│                                  │
│ ┌──────────────────────────┐    │
│ │ 📋 Dupliquer ce plan     │    │  ← LE game-changer
│ │    vers un autre groupe  │    │
│ └──────────────────────────┘    │
│                                  │
│ [Envoyer → Demi-fond (12)]     │
└─────────────────────────────────┘
```

### 2. "Dupliquer le plan vers un autre groupe"

C'est LA fonction qui fait gagner du temps. Le coach crée le plan pour le groupe Demi-fond, puis clique "Dupliquer vers Sprint" — toutes les séances sont copiées, il n'a qu'à ajuster les allures. Au lieu de 20 séances from scratch, c'est 5 séances + 3 duplications rapides.

**Bouton dans le header, après avoir créé les séances :**
- "Dupliquer vers..." → liste des autres groupes
- Les séances sont copiées avec les mêmes objectifs/jours
- Le coach ajuste juste les allures et les notes

### 3. Sauvegarder/charger une semaine type

Un coach fait souvent les mêmes structures de semaine (Lundi VMA, Mardi repos, Mercredi Seuil...). Pouvoir sauvegarder une "semaine type" et la recharger d'un clic.

**Bouton "Charger semaine type" dans le header :**
- Liste des semaines types sauvegardées
- Pré-remplit les 5-6 séances d'un coup
- Le coach n'a plus qu'à ajuster les détails

## Changements techniques

### Fichier : `src/components/coaching/WeeklyPlanDialog.tsx`

1. **Déplacer le sélecteur de groupe du footer vers le header** — Le `sendTarget` (groupe/club) devient un `Select` affiché juste sous le titre, avant la grille de semaine
2. **Ajouter un bouton "Dupliquer vers..."** — Quand `sessions.length > 0`, affiche un bouton qui propose les autres groupes. Clone toutes les sessions dans un nouveau "plan" interne et switch vers ce groupe
3. **Ajouter le bouton "Charger semaine type"** — À côté du sélecteur de semaine
4. **Ajouter "Sauver comme semaine type"** — Dans le footer, sauvegarde les sessions en cours dans une nouvelle table ou en localStorage
5. **Permettre d'envoyer plusieurs groupes d'un coup** — Le state interne stocke les plans par groupe : `Record<groupId, WeekSession[]>`. Quand le coach switch de groupe, il retrouve les séances de ce groupe. Au moment d'envoyer, il envoie tous les groupes d'un coup

### Structure de données interne (pas de nouvelle table SQL)

```typescript
// Plans par groupe, stockés dans le state du dialog
type GroupPlans = Record<string, WeekSession[]>; // groupId → sessions

// Le coach navigue entre groupes, chaque groupe a ses sessions
const [groupPlans, setGroupPlans] = useState<GroupPlans>({});
const [activeGroupId, setActiveGroupId] = useState<string>("club");
```

### Nouvelle table SQL : `coaching_week_templates`

Pour les semaines types sauvegardées :

```sql
CREATE TABLE coaching_week_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  sessions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: coach voit/crée/supprime les siens
```

### Fichier : `src/components/coaching/WeeklyPlanSessionEditor.tsx`

Pas de changement majeur — il reste l'éditeur d'une séance individuelle.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/coaching/WeeklyPlanDialog.tsx` | Refonte : groupe en haut, plans par groupe, dupliquer vers groupe, charger/sauver semaine type |
| Migration SQL | Table `coaching_week_templates` |

## Résultat pour le coach

**Avant (flow actuel) :** 4 groupes × 5 séances = 20 créations manuelles = 30-40 min

**Après :** 1 plan de 5 séances (5 min) + 3 duplications (1 min chacune) + ajustements rapides (2 min) = **~10 min pour 4 groupes**

C'est ça qui fait dire au coach : "Ok, ça je l'utilise."

