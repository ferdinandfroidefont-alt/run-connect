

# Refonte Mode Coach — Dashboard + Pages Pro (iOS Settings Style)

## Vision

Transformer le `CoachingTab` actuel (un simple onglet dans ClubInfoDialog) en un vrai dashboard coach avec des pages dédiées, toutes en style iOS Settings (fond `bg-secondary`, `IOSListGroup`, barre retour).

## Architecture actuelle vs proposée

```text
ACTUEL :
ClubInfoDialog → Tabs → CoachingTab (tout mélangé dans 1 onglet)
                          ├── calendrier semaine
                          ├── sessions du jour
                          ├── toutes les sessions
                          └── boutons (Plan, Suivi, Modèles, Créer)

PROPOSÉ :
ClubInfoDialog → Tabs → CoachingTab = DASHBOARD COACH (cards KPIs + boutons rapides)
                          ├── clic "Plan semaine" → WeeklyPlanDialog (déjà fait, iOS style)
                          ├── clic "Modèles" → CoachingTemplatesDialog (existe)
                          ├── clic "Suivi athlètes" → WeeklyTrackingView (à refaire en dialog iOS)
                          └── clic "Gérer groupes" → ClubGroupsManager (à refaire en dialog iOS)
```

## Changements fichier par fichier

### 1. `src/components/coaching/CoachingTab.tsx` — Refonte complète en Dashboard

Le CoachingTab actuel est un calendrier + liste de sessions. On le transforme en **dashboard** :

**Section KPIs** (IOSListGroup, 4 items) :
- Séances programmées (count des coaching_sessions de la semaine courante)
- En attente (participations avec status "sent")
- Groupes actifs (count de club_groups)
- Athlètes en retard (participations "sent" dont la session est passée)

**Section "Outils rapides"** (IOSListGroup) :
- `IOSListItem` "Créer plan semaine" → ouvre WeeklyPlanDialog
- `IOSListItem` "Modèles de séances" → ouvre CoachingTemplatesDialog
- `IOSListItem` "Suivi athlètes" → ouvre WeeklyTrackingView (en dialog)
- `IOSListItem` "Gérer les groupes" → ouvre ClubGroupsManager (en dialog)

**Section "Cette semaine"** (IOSListGroup) :
- Liste compacte des prochaines sessions (max 5)
- Chaque item cliquable → CoachingSessionDetail

Pour les **athlètes** (non-coach), on garde l'affichage actuel des séances reçues, mais en style iOS cards.

### 2. `src/components/coaching/WeeklyTrackingView.tsx` — Wrapper en Dialog fullscreen iOS

Actuellement c'est un composant inline (remplace le CoachingTab). On le wrappe dans un `Dialog fullScreen` avec la barre retour iOS standard, fond `bg-secondary`, et la table dans un `IOSListGroup`.

### 3. `src/components/coaching/ClubGroupsManager.tsx` — Wrapper en Dialog fullscreen iOS

Même principe : on crée un `ClubGroupsManagerDialog` qui wrappe le composant existant dans un dialog fullscreen iOS avec barre retour.

### 4. `src/components/coaching/CoachingTemplatesDialog.tsx` — Ajout style iOS

Déjà un dialog, mais il faut vérifier qu'il a bien le fond `bg-secondary` et les `IOSListGroup`. Mise à jour légère du style.

## Design du Dashboard Coach

```text
┌──────────────────────────────────┐
│  (intégré dans l'onglet          │
│   Entraînements de ClubInfoDialog)│
│                                   │
│  CETTE SEMAINE                    │
│  ┌────────────────────────────┐   │
│  │ 📅 18 séances programmées  │   │
│  │ ⏳ 6 en attente            │   │
│  │ 👥 4 groupes actifs        │   │
│  │ ⚠️ 2 athlètes en retard   │   │
│  └────────────────────────────┘   │
│                                   │
│  OUTILS                           │
│  ┌────────────────────────────┐   │
│  │ 📋 Créer plan semaine    › │   │
│  │ 📂 Modèles               › │   │
│  │ 📊 Suivi athlètes        › │   │
│  │ 👥 Gérer les groupes     › │   │
│  └────────────────────────────┘   │
│                                   │
│  PROCHAINES SÉANCES               │
│  ┌────────────────────────────┐   │
│  │ Lun - Seuil (12 athlètes) │   │
│  │ Mar - VMA (8 athlètes)    │   │
│  │ Mer - EF (24 athlètes)    │   │
│  └────────────────────────────┘   │
└──────────────────────────────────┘
```

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/coaching/CoachingTab.tsx` | Refonte : dashboard KPIs + outils rapides + sessions résumées |
| `src/components/coaching/WeeklyTrackingView.tsx` | Wrapper Dialog fullscreen iOS + style IOSListGroup |
| `src/components/coaching/ClubGroupsManager.tsx` | Créer un wrapper Dialog fullscreen iOS |
| `src/components/coaching/CoachingTemplatesDialog.tsx` | Ajustement style (fond bg-secondary, IOSListGroup) |

Aucune migration SQL. Aucun changement de logique métier. Uniquement du redesign et de la réorganisation UI.

