

# Refonte iOS Native - Apple Human Interface Guidelines

## Vue d'ensemble

Transformation complete de l'application pour qu'elle ressemble a une vraie app iOS native (type Messages, Plans, Sante d'Apple). Aucune fonctionnalite ne sera supprimee -- seul le design visuel change.

## Philosophie

L'app actuelle a une base iOS correcte (IOSListItem, segmented controls, tab bar) mais souffre de plusieurs problemes "web" :
- Couleurs trop sombres et desaturees (palette bleu marine)
- Titres de 34px centres partout (excessif)
- Manque de hierarchie visuelle claire
- Tab bar avec bouton "+" central style Android/FAB
- Cards avec bordures visibles (`border border-border`)
- Radius inconsistant (parfois 0, parfois 10px, parfois 16px)
- Ombres quasi-absentes en dark mode

---

## 1. Palette de couleurs -- iOS System Colors

Refonte complete des CSS variables pour utiliser les vraies couleurs systeme Apple.

### Light mode
| Token | Nouvelle valeur | Equivalent Apple |
|-------|----------------|-----------------|
| `--background` | `0 0% 95%` | systemGroupedBackground (#F2F2F7) |
| `--card` | `0 0% 100%` | secondarySystemGroupedBackground (#FFFFFF) |
| `--primary` | `211 100% 50%` | systemBlue (#007AFF) |
| `--secondary` | `240 5% 93%` | tertiarySystemFill (#E5E5EA) |
| `--muted-foreground` | `240 2% 56%` | secondaryLabel (#8E8E93) |
| `--border` | `240 6% 90%` | separator (#C6C6C8) |
| `--foreground` | `0 0% 0%` | label (#000000) |
| `--destructive` | `0 100% 59%` | systemRed (#FF3B30) |

### Dark mode
| Token | Nouvelle valeur | Equivalent Apple |
|-------|----------------|-----------------|
| `--background` | `0 0% 0%` | systemBackground (#000000) |
| `--card` | `240 6% 11%` | secondarySystemBackground (#1C1C1E) |
| `--primary` | `211 100% 50%` | systemBlue (#0A84FF) |
| `--secondary` | `240 4% 18%` | tertiarySystemFill (#2C2C2E) |
| `--muted-foreground` | `240 2% 60%` | secondaryLabel (#98989D) |
| `--border` | `240 4% 24%` | separator (#38383A) |
| `--foreground` | `0 0% 100%` | label (#FFFFFF) |

### Fichier : `src/index.css`
- Remplacer les valeurs `:root` et `.dark` par les couleurs Apple ci-dessus
- Mettre `--radius: 0.75rem` (12px, standard iOS)
- `html, body` background en `#000000` (dark) pour WKWebView

---

## 2. Tab Bar -- Standard iOS

Le bouton "+" central en carre colore est un pattern Android (FAB). Sur iOS, la tab bar a 4-5 onglets egaux sans bouton special.

### Fichier : `src/components/BottomNavigation.tsx`
- Passer de `grid-cols-5` a `grid-cols-4` (4 onglets egaux)
- Supprimer le bouton "+" central
- Ajouter le fond frosted glass : `bg-card/80 backdrop-blur-xl`
- Icones : `strokeWidth={1.5}` pour inactif, `fill` + `strokeWidth={2}` pour actif (style SF Symbols filled)
- Labels : garder `text-[10px]`, supprimer le dot indicateur (pas Apple)
- Hauteur : `h-[49px]` + `pb-[env(safe-area-inset-bottom)]` (standard iOS)
- L'action "creer une session" sera deplacee vers un bouton "+" dans le header de la page d'accueil (pattern Apple Maps/Calendar)

---

## 3. Headers / Navigation Bars

Chaque page doit avoir un header iOS standard :
- Titre aligne a gauche en `text-[34px] font-bold` uniquement sur l'ecran de premier niveau (Large Title)
- Titre centre en `text-[17px] font-semibold` sur les ecrans secondaires
- Pas de header enorme personnalise

### Fichiers impactes :
- `src/pages/MySessions.tsx` : titre "Mes Seances" aligne a gauche en large title, bouton "+" a droite pour creer
- `src/components/feed/FeedHeader.tsx` : titre "Feed" aligne a gauche en large title
- `src/pages/Leaderboard.tsx` : bouton retour + titre centre "Classement"
- `src/pages/Profile.tsx` : bouton retour + titre centre "Profil"
- `src/pages/Messages.tsx` : titre "Messages" aligne a gauche, bouton "Nouveau" a droite

---

## 4. Cards et Listes

### Suppression du style "web cards"
- Supprimer `border border-border` sur les FeedCards et DiscoverCards
- Utiliser `rounded-[12px]` partout (pas 10px, pas 14px, pas 16px -- 12px est le standard iOS)
- Ombre ultra-legere : `shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)]` (hairline) au lieu de `box-shadow` visible
- Espacement entre cards : `gap-2` (8px), pas `gap-3`

### Fichiers : `src/components/ui/card.tsx`
- `rounded-[12px]` au lieu de `rounded-[10px]`
- Supprimer le inline `boxShadow`, utiliser une classe CSS

### Fichiers : `src/components/feed/FeedCard.tsx`, `src/components/feed/DiscoverCard.tsx`
- Supprimer `border border-border`
- Ajouter `rounded-[12px]`

---

## 5. Boutons

### Fichier : `src/components/ui/button.tsx`
- Variante `default` : `rounded-[12px]` au lieu de `rounded-[10px]`, supprimer `shadow-sm shadow-primary/20`
- Variante `ghost` : supprimer `rounded-[10px]`, mettre `rounded-[8px]`
- Hauteur defaut : `h-[50px]` est correct (Apple CTA = 50px)
- Supprimer le fond sur ghost (juste texte bleu cliquable)

---

## 6. Typographie

La police systeme est deja SF Pro via `-apple-system` -- c'est correct. Ajustements :

- Supprimer les imports Google Fonts (`DM Sans`, `Crimson Pro`) car ils ne sont pas utilises (body utilise deja `-apple-system`)
- S'assurer que `--font-sans` pointe vers `-apple-system` en priorite

### Hierarchie stricte (deja dans les utility classes mais pas toujours respectee) :
- Large Title : 34px bold (une seule par page, alignee a gauche)
- Title 2 : 22px bold
- Headline : 17px semibold
- Body : 17px regular
- Subheadline : 15px regular
- Caption : 13px, couleur secondaryLabel

---

## 7. Segmented Controls

Deja bien implementes dans `MySessions.tsx` et `FeedHeader.tsx`. Petit ajustement :
- S'assurer que le padding interne est `p-[2px]` (deja fait dans FeedHeader)
- Radius : `rounded-[9px]` externe, `rounded-[7px]` interne (correct)

---

## 8. Animations et transitions

### Fichier : `src/index.css`
- `slideUp` : passer a `0.3s cubic-bezier(0.2, 0.8, 0.2, 1)` (iOS spring)
- Ajouter une animation `ios-push` pour les transitions de navigation (translateX)

### Pas de changement sur Framer Motion (deja en place dans `PageTransition`)

---

## 9. Bottom Navigation -- Deplacement du "+"

Puisque le bouton "+" central est supprime de la tab bar :

### Fichier : `src/pages/Index.tsx` (page d'accueil / carte)
- Ajouter un bouton "+" dans le coin haut-droit ou via un FAB discret integre a la carte (comme Apple Maps "+" pour un nouveau repere)

### Fichier : `src/contexts/AppContext.tsx`
- Garder `openCreateSession` mais ne plus l'appeler depuis la tab bar
- L'appeler depuis un bouton "+" dans le header de la page d'accueil

---

## 10. Nettoyage CSS

### Fichier : `src/index.css`
- Supprimer les imports Google Fonts inutilises (DM Sans, Crimson Pro)
- Supprimer `.ios-grouped-bg` (utilise `bg-secondary` directement)
- Supprimer `.ios-gradient-btn` (pas Apple, gradient interdit)
- Supprimer les pastels inutilises si non references
- Garder `.glass-card` (backdrop-blur est un vrai pattern iOS)
- La regle iOS compact mode (`@supports (-webkit-touch-callout: none)`) reste intacte

---

## 11. Mode sombre / Mode clair

- Les deux modes sont supportes et les couleurs s'adaptent automatiquement via les variables CSS
- Le WKWebView background sera `#000000` en dark (pur noir Apple) au lieu de `#1d283a`
- En light mode : `#F2F2F7` (gris Apple)

---

## Recapitulatif des fichiers modifies

| Fichier | Nature du changement |
|---------|---------------------|
| `src/index.css` | Palette couleurs Apple, nettoyage, radius 12px |
| `src/components/BottomNavigation.tsx` | 4 onglets egaux, frosted glass, suppression bouton "+" |
| `src/components/ui/card.tsx` | rounded-[12px], ombre hairline |
| `src/components/ui/button.tsx` | rounded-[12px], suppression ombres |
| `src/components/feed/FeedHeader.tsx` | Large title aligne a gauche |
| `src/components/feed/FeedCard.tsx` | Suppression bordures |
| `src/pages/MySessions.tsx` | Header iOS, bouton "+" dans header |
| `src/pages/Messages.tsx` | Header iOS large title |
| `src/pages/Feed.tsx` | Ajustements mineurs spacing |
| `src/pages/Index.tsx` | Bouton "+" dans le header carte |
| `src/pages/Leaderboard.tsx` | Header iOS centré |
| `src/pages/Profile.tsx` | Header iOS centré |
| `src/components/Layout.tsx` | Ajustement padding bottom pour nouvelle tab bar |
| `src/components/LoadingScreen.tsx` | Fond noir pur, style Apple boot |

## Ce qui ne change PAS (fonctionnalites preservees)

- Toute la logique metier (Supabase, auth, messages, sessions, feed, leaderboard)
- Les composants IOSListItem / IOSListGroup
- Le systeme de conversation et messagerie
- Le systeme de notifications et badges
- Les animations Framer Motion
- Le mode compact iOS (`@supports`)
- La gestion du Safe Area
- Le pull-to-refresh
- Toutes les pages et routes existantes

