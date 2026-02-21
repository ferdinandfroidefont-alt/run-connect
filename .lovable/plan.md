

# Supprimer l'ancienne barre Home Indicator (body::after)

## Ce qui est supprime

Le bloc CSS `body::after` dans `src/index.css` (lignes 459-471). C'est un pseudo-element CSS en `position: fixed` avec `z-index: 9999` qui se superpose par-dessus la vraie navigation. C'est lui qui cree le doublon visible sur les captures.

## Ce qui n'est PAS touche

La barre de navigation du bas (`BottomNavigation.tsx`) -- c'est un composant React dans un fichier completement different. Aucun risque de la supprimer.

## Fichier modifie : `src/index.css`

Suppression des lignes 459-471 :

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

## Nettoyage consequent

Les `useEffect` qui modifient `--ios-bottom-color` dans les fichiers suivants deviennent inutiles (la variable n'est plus utilisee nulle part) et seront aussi supprimes :

- `src/components/Layout.tsx` -- retirer les lignes qui settent `--ios-bottom-color`
- `src/pages/ConfirmPresence.tsx` -- retirer le useEffect
- `src/components/SettingsDialog.tsx` -- retirer le useEffect
- `src/components/CreateClubDialogPremium.tsx` -- retirer le useEffect
- `src/components/NewConversationView.tsx` -- retirer le useEffect

Aucun fichier cree. Aucune position changee. On retire uniquement du code devenu inutile.
