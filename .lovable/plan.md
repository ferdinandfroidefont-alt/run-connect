

## Problème : la carte ne s'affiche plus dans RouteDetailDialog

Avec le passage en `fullScreen`, le `DialogContent` utilise `flex flex-col`. Le conteneur de la carte (`h-64`) est un enfant direct du flex container, ce qui peut empêcher Google Maps de calculer correctement ses dimensions au rendu.

### Solution

**Fichier : `src/components/routes-feed/RouteDetailDialog.tsx`**

Envelopper tout le contenu (header sticky + carte + contenu scrollable) dans un `div` scrollable `flex-1 overflow-y-auto`, et retirer `overflow-y-auto` du DialogContent lui-même. Cela garantit que :
- Le flex container fullscreen occupe tout l'écran
- Le contenu intérieur scrolle correctement
- La carte a une hauteur fixe (`h-64`) dans un contexte de flux normal (pas flex)

```text
DialogContent (fullScreen, flex flex-col, no overflow)
└── div.flex-1.overflow-y-auto   ← nouveau wrapper scrollable
    ├── sticky header (Retour)
    ├── div.h-64 (carte Google Maps)
    └── div.p-4 (infos, avis, etc.)
```

Cela corrige le rendu de la carte tout en gardant le header sticky et le scroll natif.

