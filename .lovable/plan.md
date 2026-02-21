

# Supprimer completement le Home Indicator (body::after) et toutes ses references

5 verifications effectuees -- voici les 4 fichiers concernes (le 5e check confirme qu'il n'y a rien d'autre) :

## 1. `src/index.css` -- Supprimer le bloc `body::after` (lignes 455-467)

Suppression complete du pseudo-element qui cree la barre en bas :

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

## 2. `src/components/Layout.tsx` -- Retirer les 2 lignes `--ios-bottom-color`

- Ligne 31 : `document.documentElement.style.setProperty('--ios-bottom-color', ...)`
- Ligne 34 : `document.documentElement.style.removeProperty('--ios-bottom-color')`

## 3. `src/components/LoadingScreen.tsx` -- Retirer les 2 lignes `--ios-bottom-color`

- Ligne 26 : `document.documentElement.style.setProperty('--ios-bottom-color', ...)`
- Ligne 29 : `document.documentElement.style.removeProperty('--ios-bottom-color')`

## 4. `src/pages/Search.tsx` -- Retirer les 2 lignes `--ios-bottom-color`

- Ligne 52 : `document.documentElement.style.setProperty('--ios-bottom-color', ...)`
- Ligne 55 : `document.documentElement.style.removeProperty('--ios-bottom-color')`

## 5. Verification finale

Aucune autre reference a `--ios-bottom-color`, `body::after`, `safe-area-inset-bottom` ou `pb-safe` n'existe dans le projet. Ces 4 fichiers couvrent 100% du code a supprimer.

Aucun fichier cree. Le `body::before` (Status Bar en haut) n'est pas touche.
