

# Redesign WeeklyPlanDialog — Style iOS Settings (Inset Grouped)

## Objectif

Aligner le `WeeklyPlanDialog` sur le design iOS "Paramètres" utilisé dans `SettingsDialog` : fond gris (`bg-secondary`), barre retour iOS en haut (flèche + "Retour" à gauche, titre centré), sections en cartes blanches arrondies (`IOSListGroup`), typographies iOS (`text-[17px]`, `text-[13px]`).

## Changements dans `src/components/coaching/WeeklyPlanDialog.tsx`

### 1. Header → barre retour iOS standard

Remplacer le `DialogHeader` actuel par le même pattern que `SettingsDialog` :

```text
┌─────────────────────────────────────┐
│ ← Retour    Plan de semaine         │  bg-card, border-b
└─────────────────────────────────────┘
```

- Bouton gauche : `ArrowLeft` + texte "Retour" en `text-primary`
- Titre centré : `text-[17px] font-semibold`
- Spacer droit pour centrage

### 2. Body → fond `bg-secondary` + sections `IOSListGroup`

Le contenu scrollable passe en `bg-secondary` avec des sections groupées :

**Section "Groupe"** — `IOSListGroup` header="GROUPE"
- Sélecteur de groupe dans une carte blanche arrondie

**Section "Semaine"** — `IOSListGroup` header="SEMAINE"
- Navigation semaine (chevrons + date) dans une carte blanche
- Sous la date, les pilules groupes actifs (si >1 groupe a des plans)

**Section "Séances"** — `IOSListGroup` header="SÉANCES"
- La grille 7 jours dans une carte blanche arrondie
- Les boutons "+" restent mais avec style iOS (fond blanc, coins arrondis)

**Section "Éditeur"** (quand une séance est sélectionnée)
- `IOSListGroup` sans header, contenant le `WeeklyPlanSessionEditor`

**Section "Actions rapides"** — `IOSListGroup` header="ACTIONS"
- `IOSListItem` "Charger semaine type" avec icône `FolderOpen`
- `IOSListItem` "Dupliquer vers un groupe" avec icône `Copy`
- `IOSListItem` "Sauver comme semaine type" avec icône `Save`

### 3. Footer → bouton pleine largeur dans une section iOS

Le bouton "Envoyer" reste en bas fixe mais dans un `IOSListGroup` :
- Le badge résumé au-dessus
- Bouton pleine largeur en dessous

### 4. Supprimer les DropdownMenu

Les actions templates et duplication deviennent des `IOSListItem` dans la section "Actions" au lieu de dropdown menus cachés derrière des icônes. Plus visible, plus iOS.

## Fichier impacté

| Fichier | Action |
|---|---|
| `src/components/coaching/WeeklyPlanDialog.tsx` | Refonte complète du JSX de rendu (la logique métier ne change pas) |

## Résultat visuel

```text
┌──────────────────────────────┐
│ ← Retour    Plan de semaine  │  bg-card
├──────────────────────────────┤
│                              │  bg-secondary
│  GROUPE                      │
│  ┌──────────────────────┐    │
│  │ 🏟️ Tout le club (24) ▼│    │  bg-card rounded
│  └──────────────────────┘    │
│                              │
│  SEMAINE                     │
│  ┌──────────────────────┐    │
│  │ ‹  Sem. 24 fév 2026  › │    │  bg-card rounded
│  │  [Club] [Sprint]       │    │  pilules groupes
│  └──────────────────────┘    │
│                              │
│  SÉANCES                     │
│  ┌──────────────────────┐    │
│  │ Lun Mar Mer Jeu ...   │    │
│  │ VMA  —  Seuil  —     │    │  bg-card rounded
│  │  +   +    +    +      │    │
│  └──────────────────────┘    │
│                              │
│  [Éditeur si sélection]      │
│                              │
│  ACTIONS                     │
│  ┌──────────────────────┐    │
│  │ 📂 Charger semaine   ›│    │
│  │ 📋 Dupliquer vers... ›│    │  IOSListItem
│  │ 💾 Sauver semaine    ›│    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │  Envoyer 5 séances    │    │  bouton primary
│  └──────────────────────┘    │
└──────────────────────────────┘
```

Toute la logique (groupPlans, templates, duplication, envoi) reste identique. Seul le rendu JSX change.

