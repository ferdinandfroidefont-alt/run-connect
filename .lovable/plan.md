
# Plan : Écran de Chargement Premium iOS

## Ce qui change

Remplacement de l'écran de chargement basique actuel (simple texte "Chargement...") par un écran premium style iOS Settings avec progression animée.

## Fichiers à créer/modifier

### 1. Créer `src/components/LoadingScreen.tsx`

Nouvel écran avec :
- Fond gris iOS (#F2F2F7)
- Texte "Bienvenue sur" en haut
- Titre "RUNCONNECT" bleu gras
- Icône SVG personnalisée (runner + calendrier + pin sur fond bleu arrondi, ~120px)
- Carte blanche avec barre de progression fine
- Pourcentage dynamique (0% → 100%)
- Phrases de statut aléatoires ("Préparation de la carte...", "Synchronisation...", etc.)

### 2. Modifier `src/App.tsx`

- Ajouter état `isAppLoaded` (false au départ)
- Afficher `LoadingScreen` si `!isAppLoaded`
- Quand progression = 100%, passer à l'app normale

## Design visuel

```text
┌─────────────────────────────┐
│                             │
│       Bienvenue sur         │
│                             │
│        RUNCONNECT           │
│        (bleu, gras)         │
│                             │
│      ┌─────────────┐        │
│      │   🏃📅📍    │        │
│      │  (icône)    │        │
│      └─────────────┘        │
│                             │
│   ┌───────────────────┐     │
│   │ Chargement...     │     │
│   │ ━━━━━━━━━━━━──── │     │
│   │ Synchronisation   │     │
│   │      67%          │     │
│   └───────────────────┘     │
│                             │
└─────────────────────────────┘
```

## Comportement

- Progression fluide sur ~2.5 secondes
- Phrases qui changent pendant le chargement
- Transition automatique vers la carte à 100%
- Safe areas respectées pour Android/iOS
