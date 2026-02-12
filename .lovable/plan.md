

# Rendre RunConnect solide comme une app mondiale

## Le probleme

L'app a un bon design de base (style iOS, couleurs pastel, typographie SF Pro), mais plusieurs details cassent l'impression de solidite :

1. **Pas de transitions entre les pages** -- les pages apparaissent brutalement, sans animation
2. **Pas de skeleton loaders partout** -- certaines pages (Messages, Leaderboard, Profile) montrent un ecran vide ou un simple spinner pendant le chargement
3. **Inconsistances visuelles** -- le fond du header Messages est `#F9F9F9` code en dur, pas la variable CSS ; les couleurs sont hardcodees (`#007AFF`, `#E5E5EA`) au lieu d'utiliser le design system
4. **Pas de micro-interactions** -- les boutons n'ont pas de feedback tactile (haptic), pas de `active:scale-95` generalise
5. **Le loading screen initial** change de phrase toutes les 500ms (trop rapide, stressant) et la barre avance artificiellement
6. **Pas de safe area padding** sur les headers (encoche iPhone)
7. **La bottom nav** n'a pas de backdrop blur (les apps pro comme Instagram utilisent `backdrop-blur`)
8. **Les empty states** sont trop simples (juste une icone + texte, pas d'illustration ni de CTA clair)

## Plan d'action -- 7 ameliorations ciblees

### 1. Transitions de pages fluides
Ajouter un wrapper `PageTransition` avec un fade-in subtil (200ms) autour de chaque page dans `Layout.tsx`. Toutes les pages apparaitront avec une animation douce au lieu d'un affichage brut.

### 2. Bottom Navigation premium
- Ajouter `backdrop-blur-xl` + `bg-background/80` pour un effet verre depoli
- Ajouter `active:scale-90 transition-transform` sur chaque bouton de navigation
- Ajouter un indicateur de page active (un petit point sous l'icone au lieu de juste changer la couleur)

### 3. Skeleton loaders sur Messages
Remplacer le spinner de chargement des conversations par des squelettes realistes (avatar rond + 2 lignes de texte), exactement comme iMessage au chargement.

### 4. Micro-interactions globales
- Ajouter `active:scale-[0.97]` sur toutes les cartes cliquables
- Ajouter `transition-all duration-150` sur les elements interactifs
- Vibration haptique (via `navigator.vibrate(1)`) au tap sur les boutons principaux

### 5. Loading screen plus pro
- Ralentir les phrases (1.5s au lieu de 500ms)
- Ajouter un effet de fondu entre les phrases
- Rendre la progression plus naturelle (ease-out au lieu de lineaire)

### 6. Headers avec safe area
Ajouter `pt-safe` (padding-top pour l'encoche) sur tous les headers fixes (Messages, Feed, Leaderboard) pour que le contenu ne passe jamais sous l'encoche.

### 7. Nettoyage des couleurs hardcodees
Remplacer les couleurs codees en dur (`#007AFF`, `#E5E5EA`, `#8E8E93`, `#F9F9F9`) par les variables CSS du design system (`text-primary`, `border-border`, `text-muted-foreground`, `bg-secondary`) pour garantir la coherence et preparer le dark mode.

---

## Details techniques

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/Layout.tsx` | Wrapper PageTransition avec animate-fade-in |
| `src/components/BottomNavigation.tsx` | Backdrop blur, active states, dot indicator |
| `src/pages/Messages.tsx` | Skeleton loaders, remplacement couleurs hardcodees, safe area header |
| `src/pages/Feed.tsx` | Safe area header |
| `src/pages/Leaderboard.tsx` | Safe area header |
| `src/components/LoadingScreen.tsx` | Ralentir phrases, smooth progression |
| `src/components/feed/FeedHeader.tsx` | Safe area padding |
| `src/index.css` | Classe utilitaire PageTransition |

### Pas de nouvelles dependances
Tout est fait avec Tailwind CSS et les animations deja en place.

