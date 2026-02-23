
## Corriger le z-index du panneau de filtres sur la carte

### Le probleme

Sur iPhone, quand le panneau de filtres est ouvert, les boutons de la carte (itineraire, localisation, style de carte, etc.) sur le cote gauche apparaissent par-dessus le panneau de filtres. Le panneau devrait etre au-dessus de tous les boutons.

### Cause

Dans `src/components/InteractiveMap.tsx` :
- Le conteneur parent du panneau de filtres (ligne 1561) a `z-10`
- Les boutons de controle de la carte (ligne 1569) ont aussi `z-10`
- Meme si le composant `SessionFilters` a `z-50` en interne, son conteneur parent limite son empilement a `z-10`

### Correction

#### Fichier : `src/components/InteractiveMap.tsx`

- Ligne 1561 : Changer le `z-10` du conteneur des filtres en `z-30` pour qu'il passe au-dessus des boutons de controle qui restent a `z-10`

Changement :
```
// Avant
<div className="absolute right-4 z-10 flex flex-col ..."

// Apres
<div className="absolute right-4 z-30 flex flex-col ..."
```

### Resultat attendu

- Le panneau de filtres ouvert couvre les boutons de la carte sur iPhone et Android
- Les boutons restent visibles quand les filtres sont fermes (pas de conflit)
