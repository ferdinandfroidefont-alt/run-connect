

# Identite visuelle RunConnect : Vert Emeraude + Mode Clair par defaut

## Objectif
Donner a RunConnect une identite visuelle forte basee sur le vert emeraude (#10B981) et privilegier le mode clair comme mode par defaut.

## 1. Mode clair par defaut

**Fichier** : `src/contexts/ThemeContext.tsx`
- Changer le theme par defaut de `'dark'` a `'light'` (lignes 25, 34, 35)

## 2. Nouvelle palette de couleurs - Vert Emeraude

**Fichier** : `src/index.css` - Variables CSS

### Mode clair (:root)
- `--primary` : passe du bleu/gris actuel au vert emeraude `160 84% 39%` (#10B981)
- `--primary-foreground` : blanc `0 0% 100%`
- `--ring` : vert emeraude pour les focus rings
- `--success` : reste vert (coherent avec la marque)
- `--background` : fond clair iOS `0 0% 96%` (#F5F5F5)
- `--card` : blanc pur `0 0% 100%`

### Mode sombre (.dark)
- `--primary` : vert emeraude plus clair pour contraste `160 67% 52%` (#34D399)
- `--primary-foreground` : noir `160 84% 8%`
- `--ring` : vert emeraude clair

### Couleurs de charts
- Adapter les couleurs des charts pour utiliser des tons de vert

## 3. Loading Screen

**Fichier** : `src/components/LoadingScreen.tsx`
- Changer la couleur de fond iOS (`#465467` vers `#F5F5F5` en light ou un vert fonce)
- Changer le box-shadow de l'icone de bleu vers vert emeraude : `hsl(160 84% 39% / 0.25)`

## 4. Couleur d'accent iMessage / conversations

**Fichier** : `src/hooks/useConversationTheme.tsx`
- Changer `bg-[#007AFF]` (bleu iMessage) vers `bg-[#10B981]` (vert emeraude) pour les bulles de messages envoyes

## 5. Fond fixe body

**Fichier** : `src/index.css`
- Ligne `background-color: #1d283a !important;` sur html/body : changer vers `#F5F5F5` (fond clair) pour correspondre au mode clair par defaut

## Details techniques

Les couleurs hardcodees `#007AFF` dans les icones de settings/help resteront en l'etat car ce sont des couleurs d'icones iOS standard (chaque icone a sa propre couleur comme dans les Reglages iPhone). Seule la couleur `--primary` du design system change, ce qui affecte automatiquement :
- La barre de navigation (icones actives, bouton "+")
- Les boutons principaux
- Les indicateurs de focus
- La barre de progression
- Les textes d'accentuation

