
# Restaurer le body::after (Home Indicator) en couleur unie

## Probleme

J'ai supprime le `body::after` qui colorait la zone du Home Indicator iOS (le petit trait en bas de l'ecran). C'etait la mauvaise suppression : le probleme d'origine etait le motif sportif et le `background-blend-mode` qui faussaient la couleur, pas le pseudo-element lui-meme.

Sans `body::after`, la zone sous la barre de navigation n'est plus coloree correctement sur iOS.

## Solution

### 1. `src/index.css` -- Restaurer `body::after` en couleur unie

Ajouter le bloc suivant (apres `body::before`, dans le bloc `@supports (-webkit-touch-callout: none)`), **sans** le motif ni le blend-mode :

```text
/* iOS Home Indicator zone - fond fixe derriere le home indicator */
body::after {
  content: '';
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom, 0px);
  background-color: var(--ios-bottom-color, hsl(var(--background)));
  z-index: 9999;
  pointer-events: none;
}
```

### 2. `src/components/Layout.tsx` -- Restaurer le calcul de `--ios-bottom-color`

Dans le `useEffect` existant (lignes 20-34), ajouter la logique pour `--ios-bottom-color` selon la page :

- Accueil (`/`) : `hsl(var(--background))` (fond de la nav)
- Messages (`/messages`) : `hsl(var(--background))`
- Defaut : `hsl(var(--background))`

Et nettoyer `--ios-bottom-color` dans le return.

### 3. `src/components/LoadingScreen.tsx` -- Restaurer `--ios-bottom-color`

Remettre la ligne `setProperty('--ios-bottom-color', 'hsl(var(--secondary))')` et son `removeProperty` dans le cleanup.

### 4. Autres fichiers precedemment nettoyes

Restaurer `--ios-bottom-color` dans :
- `src/pages/ConfirmPresence.tsx`
- `src/components/SettingsDialog.tsx`
- `src/components/CreateClubDialogPremium.tsx`
- `src/components/NewConversationView.tsx`

Ces fichiers avaient des `useEffect` qui settaient `--ios-bottom-color` et ont ete supprimes a tort.

## Ce qui change par rapport a avant

La seule difference avec l'ancien `body::after` : **pas de motif sportif ni de blend-mode**. C'est une couleur unie pure, exactement comme le `body::before` (Status Bar) corrige precedemment. Cela garantit une continuite parfaite entre la barre de navigation et la zone du Home Indicator.
