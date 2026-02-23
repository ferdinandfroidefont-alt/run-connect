

## Accrocher le sous-filtre "Creees / Rejointes" sous le bouton "Seances"

### Objectif

Le sous-filtre doit etre visuellement attache juste sous le bouton "Seances", avec une largeur totale egale a celle du bouton "Seances" (soit 50% de la barre). Il ne doit pas deborder sous "Itineraires".

### Modification - `src/pages/MySessions.tsx`

Remplacer les deux blocs separes (segmented control principal + sous-filtre en dessous) par un seul conteneur `flex` horizontal :

```text
|  px-4 container pleine largeur                          |
|  [  col gauche (50%)       ]  [ col droite (50%)        ]
|  [ Seances (bouton)        ]  [ Itineraires (bouton)    ]
|  [ Creees | Rejointes      ]  [        vide             ]
```

**Structure technique :**

- Le wrapper principal reste `px-4 pb-3`
- A l'interieur, un `div flex` avec deux colonnes `w-1/2`
- Colonne gauche :
  - Bouton "Seances" en haut (arrondi en haut seulement si sous-filtre visible)
  - Si `currentView === 'sessions'` : sous-filtre "Creees | Rejointes" colle en dessous, meme fond `bg-secondary`, arrondi en bas
- Colonne droite :
  - Bouton "Itineraires" (arrondi complet, meme hauteur que "Seances")

Le sous-filtre utilise des boutons plus petits (`text-[11px]`, `py-1.5`) pour tenir dans la moitie de largeur.

### Fichier modifie

| Fichier | Zone modifiee |
|---------|---------------|
| `src/pages/MySessions.tsx` | Lignes ~720-772 : refonte du header segmented control |

