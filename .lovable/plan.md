

## Problèmes identifiés

### 1. Page instable — scroll horizontal parasite sur iOS
Le composant `CoachingTab` (ligne 184) utilise `className="bg-secondary -mx-4 -mb-4 px-4 ..."` avec un **margin négatif `-mx-4`** qui fait déborder le contenu au-delà du viewport. Sur iOS, cela permet de "swiper" la page de gauche à droite, ce qui crée l'instabilité.

Ce `-mx-4` est utilisé pour que le fond gris `bg-secondary` s'étende bord à bord, mais il crée un overflow horizontal non contrôlé.

### 2. Boutons Membres / Entraînements / Groupes dépassent l'écran
Les 3 `TabsTrigger` dans `ClubInfoDialog.tsx` (lignes 420-433) ont chacun une icône + du texte. La `TabsList` a `w-full` mais les triggers ont un `px-3` par défaut dans le composant `tabs.tsx`. Sur petit écran iPhone, les 3 onglets avec icônes + texte débordent.

## Solution

### Fichier 1 : `src/components/coaching/CoachingTab.tsx`
- **Ligne 184** : Remplacer `-mx-4` par un wrapper avec `overflow-x-hidden` pour empêcher le scroll horizontal tout en gardant le fond gris bord à bord
- Changer `className="bg-secondary -mx-4 -mb-4 px-4 pt-2 pb-8 min-h-[400px]"` en `className="bg-secondary -mx-4 -mb-4 px-4 pt-2 pb-8 min-h-[400px] overflow-x-hidden"`

### Fichier 2 : `src/components/ClubInfoDialog.tsx`
- **Lignes 420-433** : Réduire la taille du texte et des icônes des onglets pour qu'ils tiennent sur un écran iPhone
- Passer les icônes de `h-4 w-4` à `h-3.5 w-3.5`
- Ajouter `text-[12px]` aux TabsTrigger pour un texte plus compact
- Ajouter `px-1.5` pour réduire le padding horizontal

### Fichier 3 : `src/components/ClubInfoDialog.tsx` — conteneur principal
- **Ligne 366** : Ajouter `overflow-x-hidden` au conteneur scrollable `flex-1 overflow-y-auto p-4` pour empêcher tout débordement horizontal dans le contenu du dialog

Ces corrections empêchent le swipe horizontal parasite sur iOS et font tenir les 3 onglets sans débordement sur petit écran.

