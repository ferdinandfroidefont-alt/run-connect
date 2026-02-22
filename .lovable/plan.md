
# Refonte page principale -- Reproduire le design de la capture

## Constat

La capture de reference montre un design precis qui differe de l'etat actuel sur plusieurs points majeurs :

1. **Tab bar a 5 onglets avec bouton "+" central** : la tab bar actuelle n'a que 4 onglets, le "+" a ete supprime lors d'une precedente iteration. Il faut le restaurer.
2. **Header de la carte** : l'avatar doit etre a GAUCHE avec "Runconnect" a cote, les icones cloche et reglages a droite -- actuellement l'avatar est centre.
3. **Icones du header** : utiliser des icones Lucide propres (Bell, Settings) au lieu de l'emoji "engrenage" actuel.
4. **Style de la tab bar** : fond blanc legerement translucide avec un gros bouton "+" bleu au centre, style iOS frosted glass.
5. **Design general clair** : la capture montre un mode clair -- le design doit fonctionner correctement en mode clair comme en dark.

## Modifications detaillees

### 1. Restaurer le bouton "+" dans la Tab Bar

**Fichier : `src/components/BottomNavigation.tsx`**

- Repasser de `grid-cols-4` a `grid-cols-5`
- Ajouter le bouton "+" central entre "Mes seances" et "Messages"
- Le bouton "+" appelle `openCreateSession` depuis `AppContext`
- Style du "+" : cercle blanc/card avec icone Plus bleue, legerement plus grand que les autres onglets (comme sur la capture : un cercle avec un "+" bleu)
- Le "+" n'a pas de label texte en dessous
- Fond du bouton : `bg-card` avec `border border-border/50`, `rounded-full`, taille `w-14 h-14`, positionne en `relative -top-3` pour depasser legerement

### 2. Refaire le header de la carte

**Fichier : `src/components/InteractiveMap.tsx`** (lignes 1380-1411)

Le header actuel a l'avatar centre et un emoji engrenage. Le nouveau layout :

```
[Avatar 40px] [Runconnect titre] ........... [Bell] [Settings]
```

- Avatar a gauche, `w-10 h-10`, cliquable (ouvre ProfileDialog) -- avec le StreakBadge
- "Runconnect" en `text-lg font-bold` a cote de l'avatar
- A droite : icone `Bell` (NotificationCenter) + icone `Settings` (Lucide `Settings` icon au lieu de l'emoji)
- Supprimer le positionnement absolu centre de l'avatar
- Le header utilise `bg-card/95 backdrop-blur-xl` pour l'effet frosted glass
- Safe area : garder `pt-[env(safe-area-inset-top)]` ou le padding iOS existant

### 3. Icone Settings propre

**Fichier : `src/components/InteractiveMap.tsx`** (ligne 1406-1408)

- Remplacer l'emoji `engrenage` par l'icone Lucide `Settings` (deja importee? sinon l'ajouter)
- Style : `h-6 w-6 text-muted-foreground` dans un bouton ghost circulaire

### 4. Style du bouton "+" dans la tab bar (details)

Le design de la capture montre :
- Un cercle blanc/clair avec ombre tres legere
- Un "+" bleu (`text-primary`) de taille `h-7 w-7`
- Le cercle depasse legerement au-dessus de la tab bar
- Pas de label en dessous

### 5. Tab bar labels

Sur la capture les labels sont :
- "Accueil" (Home)
- "Mes seances" (Calendar)
- (pas de label pour +)
- "Messages" (MessageCircle)
- "Feed" (Newspaper)

Ce sont les memes qu'actuellement sauf qu'il faut remettre le 5e onglet.

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/BottomNavigation.tsx` | 5 onglets, bouton "+" central restaure |
| `src/components/InteractiveMap.tsx` | Header : avatar a gauche, icone Settings Lucide |

## Ce qui ne change PAS

- Toute la logique metier
- La recherche, les filtres, le calendrier
- Les dialogs (create session, settings, profile, notifications)
- Les autres pages (Feed, Messages, Leaderboard, etc.)
- Le mode immersif de la carte
- Les controles de carte (zoom, style, locate)
